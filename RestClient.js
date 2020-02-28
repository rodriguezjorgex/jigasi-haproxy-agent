const http = require('http');
const Logger = require('./Logger');

/**
 * RestClient accesses rest endpoints on jigasi
 */
class RestClient {
    /**
     * constructor
    * @param {object} options
    */
    constructor(options) {
        this._options = {
            host: 'localhost',
            port: 8788,
            debug: false,
            ...options
        };
        if (this._options.hasOwnProperty('logger')) {
            this._logger = this._options.logger;
        } else {
            this._logger = new Logger();
        }
    }

    /**
     * get health value
     */
    async getHealth() {
        return await this._get(`http://${this._options.host}:${this._options.port}/about/health`);
    }

    /**
     * get stats value
     */
    async getStats() {
        return await this._get(`http://${this._options.host}:${this._options.port}/about/stats`);
    }

    /**
     * GET helper
     * @param {string} url
     */
    async _get(url) {
        return new Promise((resolve, reject) => {
            const options = { timeout: 1000 };

            http.get(url, options, res => {
                const { statusCode } = res;
                const contentType = res.headers['content-type'];

                let error;

                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n'
                                    + `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error('Invalid content-type.\n'
                                    + `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    if (this._options.debug) {
                        this._logger.error(error.message, { err: error });
                    }

                    // Consume response data to free up memory
                    res.resume();
                    reject(error);

                    return;
                }

                res.setEncoding('utf8');
                let rawData = '';

                res.on('data', chunk => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData);

                        resolve(parsedData);
                    } catch (e) {
                        if (this._options.debug) {
                            this._logger.error(e.message, { err: e });
                        }
                        reject(e);
                    }
                });
            }).on('error', e => {
                if (this._options.debug) {
                    this._logger.error(`HTTP error: ${e.message}`, { err: e });
                }
                reject(e);
            });
        });
    }

}

module.exports = RestClient;
