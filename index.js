const net = require('net');
const fs = require('fs');
const RestWatcher = require('./RestWatcher')

const port = 7070;
const host = '0.0.0.0';
let MAX_PARTICIPANTS=process.env.JIGASI_MAX_PARTICIPANTS; 
if (!MAX_PARTICIPANTS) {
    MAX_PARTICIPANTS=1000;
}

if (MAX_PARTICIPANTS <=0) {
    jlog.error("JIGASI_MAX_PARTICIPANTS needs to be a positive value, exiting");
    jlog.error("Current Environment",{"env":process.env});
    process.exit(100);
}

const MAX_PERCENTAGE=100

async function getStatusFromWatcher(watcher) {
    try {
        const health = await watcher.getHealth();
        const stats = await watcher.getStats();
        if (!health || !stats || stats.graceful_shutdown) {
            return 'drain';
        } else {
            return jigasiWeightPercentage(stats.participants)+'%'
        }    
    } catch(err) {
        console.error(err);
        return 'drain';
    }
}

function jigasiWeightPercentage(participants) {
    let p = Math.round(participants);
    if (p >= MAX_PARTICIPANTS) {
        p = MAX_PARTICIPANTS;
    }
    console.log(`w = floor((${MAX_PARTICIPANTS} - ${p}/${MAX_PARTICIPANTS})*${MAX_PERCENTAGE})`)
    let w = Math.floor(((MAX_PARTICIPANTS - p)/MAX_PARTICIPANTS)*MAX_PERCENTAGE);
    //if we go over to 0 or below, set weight to 1 (lowest non-drained state)
    if (w <= 0 ) {
        w = 1;
    }

    return w;
}

const server = net.createServer();
server.listen(port, host, () => {
    console.log('TCP Server is running on port ' + port + '.');
});

const options = {};
const watcher = new RestWatcher(options);
watcher.start();

server.on('connection', async function(sock) {
    // status='ready';
//    const status = getStatusFromFile(statsFile);
    const status = await getStatusFromWatcher(watcher);
    console.log('REPORTING '+status+' to ' + sock.remoteAddress + ':' + sock.remotePort);
    sock.end(status + '\n');
});
