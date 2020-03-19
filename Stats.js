const SDC = require('statsd-client');

/**
 * Collect stats and report them to statsd
 */
class Stats {
    /**
     * constructor
     * @param {any} options
     */
    constructor(options) {
        this.options = {
            host: 'localhost',
            prefix: 'jigasi-agent.',
            ...options };
    }

    /**
     * start reporting stats
     */
    start() {
        this._sdc = new SDC({
            host: this.options.host,
            prefix: this.options.prefix
        });
    }

    /**
     * stop metrics reporting
     */
    stop() {
        this._sdc.close();
    }

    /** report a metric */
    gauge(name, value) {
        this._sdc.gauge(name, value);
    }

    /**
     * increment a metric by value
     * @param {string} name
     * @param {number} value
     */
    increment(name, value = 1) {
        this._sdc.increment(name, value);
    }
}

module.exports = Stats;
