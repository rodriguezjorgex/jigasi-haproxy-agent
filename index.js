const net = require('net');
const fs = require('fs');
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

const statsFile = '/tmp/jigasi-stats.json'

function getStatus(file) {
    const statsRaw = fs.readFileSync(file);
    const stats = JSON.parse(statsRaw.toString());
    if (stats.graceful_shutdown) {
        return 'drain';
    } else {
        return jigasiWeightPercentage(stats.participants)+'%'
    }
}

function jigasiWeightPercentage(participants) {
    let p = Math.round(participants);
    if (p >= MAX_PARTICIPANTS) {
        p = MAX_PARTICIPANTS;
    }
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

server.on('connection', function(sock) {
    // status='ready';
    const status = getStatus(statsFile);
    console.log('REPORTING '+status+' to ' + sock.remoteAddress + ':' + sock.remotePort);
    sock.end(status + '\n');
});
