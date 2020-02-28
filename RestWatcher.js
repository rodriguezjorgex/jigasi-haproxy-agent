const RestClient = require('./RestClient');
const EventEmitter = require('events');
const Logger = require('./Logger');

/**
 * class for watching rest interface of jigasi
 */
class RestWatcher extends EventEmitter {
    /**
     * constructor
     * @param {object} options
     */
    constructor(options) {
        super();
        this._options = {
            healthInterval: 30000,
            statsInterval: 10000,
            ...options
        };
        if (!this._options.hasOwnProperty('restClient')) {
            this._options.restClient = new RestClient();
        }
        if (this._options.hasOwnProperty('logger')) {
            this._logger = this._options.logger;
        } else {
            this._logger = new Logger();
        }

        this._health = false;
        this._stats = false;
        this._statsTimer = false;
        this._healthTimer = false;
    }

    /**
     * health getter
     */
    getHealth() {
        return this._health;

        // if (this._health !== false) {
        //     return this._health;
        // } else {
        //     return await this._waitHealth();
        // }
    }

    /**
     * wait for health value event to be emitted
     */
    async _waitHealth() {
        return new Promise(resolve => {
            this.once('health', health => {
                resolve(health);
            });
        });
    }

    /**
     * stats getter
     */
    getStats() {
        return this._stats;

        // if (this._stats !== false) {
        //     return this._stats;
        // } else {
        //     return await this._waitStats();
        // }
    }

    /**
     * wait for stats value event to be emitted
     */
    async _waitStats() {
        return new Promise(resolve => {
            this.once('stats', stats => {
                resolve(stats);
            });
        });
    }

    /**
     * fetch stats from rest endpoint
     */
    async _getStats() {
        try {
            const stats = await this._options.restClient.getStats();

            if (stats) {
                this._stats = stats;
            } else {
                this._stats = false;
            }
        } catch (err) {
            this._stats = false;
            this._logger.error('failed getting stats', { err });
        }
        this.emit('stats', this._stats);

        return this._stats;
    }

    /**
     * fetch health for rest endpoint
     */
    async _getHealth() {
        try {
            const h = await this._options.restClient.getHealth();

            if (h) {
                this._health = true;
            } else {
                this._health = false;
            }
        } catch (err) {
            this._health = false;
            this._logger.error('failed getting health', { err });
        }

        this.emit('health', this._health);

        return this._health;
    }

    /**
     * check health then start timer to re-check health
     */
    async watchHealth() {
        return this._getHealth().then(() => {
            this._healthTimer = setTimeout(this.watchHealth.bind(this), this._options.healthInterval);

            return this._healthTimer;
        });
    }

    /**
     * check stats then start timer to re-check stats
     */
    async watchStats() {
        return this._getStats().then(() => {
            this._statsTimer = setTimeout(this.watchStats.bind(this), this._options.statsInterval);

            return this._statsTimer;
        });
    }

    /**
     * start function, run this one to start watching
     */
    async start() {
        this.watchHealth();
        this.watchStats();
    }

    /**
     * stop function, run this one to stop watching
     */
    stop() {
        if (this._statsTimer) {
            clearTimeout(this._statsTimer);
        }
        if (this._healthTimer) {
            clearTimeout(this._healthTimer);
        }
    }

}

module.exports = RestWatcher;
