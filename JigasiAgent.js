
const RestWatcher = require('./RestWatcher');
const RestClient = require('./RestClient');
const Logger = require('./Logger');
const Stats = require('./Stats');

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
        this._initStats();

        this._lastStatus = {};
    }

    /**
     * use watcher object to retrieve stats and health
     * @param {RestWatcher} watcher
     */
    getStatusFromWatcher(requester) {
        try {
            const health = this._watcher.getHealth();
            const stats = this._watcher.getStats();

            this._stats.increment('requests');
            if (!health || !stats || stats.graceful_shutdown) {
                this._stats.gauge('drain', 1);
                this._stats.increment('total_drain');

                this._stats.gauge('participants', 0);
                this._stats.gauge('percentage', 0);
                this._stats.gauge('conferences', 0);
                this._stats.gauge('stress_level', 0);

                this._lastStatus[requester] = 'drain';

                return 'drain';
            }

            let percentage;

            if (stats.hasOwnProperty('stress_level')) {
                percentage = this.jigasiWeightPercentageFromStress(stats.stress_level);
                this._stats.gauge('stress_level', stats.stress_level);
            } else {
                percentage = this.jigasiWeightPercentage(stats.participants);
            }

            this._stats.gauge('drain', 0);
            this._stats.gauge('participants', stats.participants);
            this._stats.gauge('percentage', percentage);

            // if we returned 'drain' last time, return 'ready' now to come back online
            if (!this._lastStatus.hasOwnProperty(requester) || (this._lastStatus[requester] === 'drain')) {
                this._lastStatus[requester] = 'ready';

                return 'ready';
            }

            return `${percentage}%`;

        } catch (err) {
            this._logger.error('error in jigasi status', { err });

            this._lastStatus[requester] = 'drain';

            return 'drain';
        }
    }

    /**
     * calculate weight from stress level
     * @param {float} stressLevel
     */
    jigasiWeightPercentageFromStress(stressLevel) {
        let w = Math.floor((1 - stressLevel) * this._options.maxPercentage);

        // this._logger.info(`
        //     w = floor((${this._options.maxParticipants} - ${p}/${this._options.maxParticipants})
        //      * ${this._options.maxPercentage})
        // `);

        // if we go over to 0 or below, set weight to 1 (lowest non-drained state)

        if (w <= 0) {
            w = 1;
        }

        return w;
    }

    /**
     * calculate weight from number of participants
     * @param {integer} participants
     */
    jigasiWeightPercentage(participants) {
        let p = Math.round(participants);

        if (p >= this._options.maxParticipants) {
            p = this._options.maxParticipants;
        }
        let w = Math.floor((
            (this._options.maxParticipants - p) / this._options.maxParticipants)
            * this._options.maxPercentage
        );

        // this._logger.info(`
        //     w = floor((${this._options.maxParticipants} - ${p}/${this._options.maxParticipants})
        //      * ${this._options.maxPercentage})
        // `);

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
     * initialize stats object
     * @param {object} options
     */
    _initStats(options) {
        this._stats = new Stats(options);
    }

    /**
     * start agent
     */
    start() {
        this._watcher.start();
        this._stats.start();
    }

    /**
     * stop agent
     */
    stop() {
        this._watcher.stop();
        this._stats.stop();
    }
}

module.exports = JigasiAgent;
