const RestClient = require('./RestClient');
const EventEmitter = require('events');


class RestWatcher extends EventEmitter {
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
        this._health = false;
        this._stats = false;
        this._statsTimer = false;
        this._healthTimer = false;
    }

    async getHealth() {
        return this._health;
        // if (this._health !== false) {
        //     return this._health;
        // } else {
        //     return await this._waitHealth();
        // }
    }

    async _waitHealth() {
        return new Promise((resolve,reject) => {
            this.once('health',(health) => {
                resolve(health);
            });
        })
    }

    async getStats() {
        return this._stats;
        // if (this._stats !== false) {
        //     return this._stats;
        // } else {
        //     return await this._waitStats();
        // }
    }

    async _waitStats() {
        return new Promise((resolve,reject) => {
            this.once('stats',(stats) => {
                resolve(stats);
            });
        })
    }

    async _getStats() {
        try {
            const stats = await this._options.restClient.getStats();
            if (stats) {
                this._stats = stats;
            } else {
                this._stats = false;
            }
        } catch(err) {
            this._stats = false;
            console.error('failed getting stats',err);
        }
        this.emit('stats',this._stats);
        return this._stats;
    }

    async _getHealth() {
        try {
            const h = await this._options.restClient.getHealth();
            if (h) {
                this._health = true;
            } else {
                this._health = false;
            }
        } catch(err) {
            this._health = false;
            console.error('failed getting health',err);
        }

        this.emit('health',this._health);
        return this._health;
    }

    async watchHealth() {
        return this._getHealth().then(() => {
            this._healthTimer = setTimeout(this.watchHealth.bind(this), this._options.healthInterval);
            return this._healthTimer;
        });
    }

    async watchStats() {
        return this._getStats().then(() => {
            this._statsTimer = setTimeout(this.watchStats.bind(this), this._options.statsInterval);
            return this._statsTimer;
        });
    }

    async start() {
        this.watchHealth();
        this.watchStats();
    }

    stop() {
        if (this._statsTimer) clearTimeout(this._statsTimer);
        if (this._healthTimer) clearTimeout(this._healthTimer);
    }

}

module.exports = RestWatcher;