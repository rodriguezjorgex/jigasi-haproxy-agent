
const RestWatcher = require('./RestWatcher');
const RestClient = require('./RestClient');
const Logger = require('./Logger');

/**
 * Jigasi Agent, main class
 */
class JigasiAgent {
    /**
     * agent contstructor
     * @param {object} options
     */
    constructor(options) {
        this._options = {
            jigasiHost: 'localhost',
            jigasiPort: 8788,
            maxParticipants: 250,
            maxPercentage: 100,
            ...options
        };
        if (this._options.hasOwnProperty('logger')) {
            this._logger = this._options.logger;
        } else {
            this._logger = new Logger();
        }

        this._initWatcher();
    }

    /**
     * use watcher object to retrieve stats and health
     * @param {RestWatcher} watcher
     */
    getStatusFromWatcher() {
        try {
            const health = this._watcher.getHealth();
            const stats = this._watcher.getStats();

            if (!health || !stats || stats.graceful_shutdown) {
                return 'drain';
            }

            return `${this.jigasiWeightPercentage(stats.participants)}%`;

        } catch (err) {
            this._logger.error('error in jigasi status', { err });

            return 'drain';
        }
    }

    /**
     * calculate weight from number of participants
     * @param {integer} participants
     */
    jigasiWeightPercentage(participants) {
        let p = Math.round(participants);

        if (p >= this.maxParticipants) {
            p = this.maxParticipants;
        }
        this._logger.info(`w = floor((${this.maxParticipants} - ${p}/${this.maxParticipants})*${this.maxPercentage})`);
        let w = Math.floor(((this.maxParticipants - p) / this.maxParticipants) * this.maxPercentage);

        // if we go over to 0 or below, set weight to 1 (lowest non-drained state)

        if (w <= 0) {
            w = 1;
        }

        return w;
    }

    /**
     * initialize watcher object
     * @param {object} options
     */
    _initWatcher(options) {
        const restOptions = {
            host: this._options.jigasiHost,
            port: this._options.jigasiPort,
            logger: this._logger
        };

        const watcherOptions = {
            restClient: new RestClient(restOptions),
            logger: this._logger,
            ...options
        };

        this._watcher = new RestWatcher(watcherOptions);
    }

    /**
     * start agent
     */
    start() {
        this._watcher.start();
    }

    /**
     * stop agent
     */
    stop() {
        this._watcher.stop();
    }
}

module.exports = JigasiAgent;
