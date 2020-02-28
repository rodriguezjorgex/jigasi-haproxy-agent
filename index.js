const net = require('net');
const RestWatcher = require('./RestWatcher');
const Logger = require('./Logger');

const log = new Logger();

const port = 7070;
const host = '0.0.0.0';

let MAX_PARTICIPANTS = process.env.JIGASI_MAX_PARTICIPANTS;

if (!MAX_PARTICIPANTS) {
    MAX_PARTICIPANTS = 250;
}

if (MAX_PARTICIPANTS <= 0) {
    log.error('JIGASI_MAX_PARTICIPANTS needs to be a positive value, exiting');
    log.error('Current Environment', { 'env': process.env });
    process.exit(100);
}

const MAX_PERCENTAGE = 100;

/**
 * use watcher object to retrieve stats and health
 * @param {RestWatcher} watcher
 */
async function getStatusFromWatcher(watcher) {
    try {
        const health = await watcher.getHealth();
        const stats = await watcher.getStats();

        if (!health || !stats || stats.graceful_shutdown) {
            return 'drain';
        }

        return `${jigasiWeightPercentage(stats.participants)}%`;

    } catch (err) {
        log.error('error in jigasi status', { err });

        return 'drain';
    }
}

/**
 * calculate weight from number of participants
 * @param {integer} participants
 */
function jigasiWeightPercentage(participants) {
    let p = Math.round(participants);

    if (p >= MAX_PARTICIPANTS) {
        p = MAX_PARTICIPANTS;
    }
    log.info(`w = floor((${MAX_PARTICIPANTS} - ${p}/${MAX_PARTICIPANTS})*${MAX_PERCENTAGE})`);
    let w = Math.floor(((MAX_PARTICIPANTS - p) / MAX_PARTICIPANTS) * MAX_PERCENTAGE);

    // if we go over to 0 or below, set weight to 1 (lowest non-drained state)

    if (w <= 0) {
        w = 1;
    }

    return w;
}

const server = net.createServer();

server.listen(port, host, () => {
    log.info(`TCP Server is running on port ${port}.`);
});

const options = { logger: log };
const watcher = new RestWatcher(options);

watcher.start();

server.on('connection', async sock => {
    // status='ready';
//    const status = getStatusFromFile(statsFile);
    const status = await getStatusFromWatcher(watcher);

    log.info(`${status} reported to ${sock.remoteAddress}:${sock.remotePort}`, {status});
    sock.end(`${status}\n`);
});
