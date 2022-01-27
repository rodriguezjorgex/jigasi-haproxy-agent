const envalid = require('envalid');
const net = require('net');
const JigasiAgent = require('./JigasiAgent');
const Logger = require('./Logger');

const log = new Logger();

// Validate required environment variables
const env = envalid.cleanEnv(process.env, {
    API_PORT: envalid.num({ default: 7070 }),
    JIGASI_HOST: envalid.host({ default: 'localhost' }),
    JIGASI_PORT: envalid.num({ default: 8788 }),
    MAX_PARTICIPANTS: envalid.num({ default: 250 }),
    MAX_PERCENTAGE: envalid.num({ default: 100 })
});

// initialize a new agent for watching jigasi health and stats
const options = {
    jigasiHost: env.JIGASI_HOST,
    jigasiPort: env.JIGASI_PORT,
    maxParticipants: env.MAX_PARTICIPANTS,
    maxPercentage: env.MAX_PERCENTAGE,
    logger: log
};
const agent = new JigasiAgent(options);

// start watching jigasi stats and health
agent.start();

// create server and start listening for TCP connections
const server = net.createServer();
const host = '0.0.0.0';

server.on('error', error => {
    log.error('Error reported in server', { error });
});

// handle incoming TCP requests
server.on('connection', sock => {
    sock.on('error', error => {
        if (error.code === 'ECONNRESET') {
            // do something here, maybe log?
            log.warn('Socket connection reset');
        } else {
            log.error('Error reported on socket', { error });
        }
    });

    const status = agent.getStatusFromWatcher(sock.remoteAddress);

    log.info(`${status} reported to ${sock.remoteAddress}:${sock.remotePort}`, { status });
    sock.end(`${status}\n`);
    sock.destroy();
});

server.listen(env.API_PORT, host, () => {
    log.info(`TCP Server is running on port ${env.API_PORT}.`);
});
