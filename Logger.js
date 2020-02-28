const log = require('json-log').log;

/**
 * Class for logging stuff
 */
class Logger {
    /**
     * provides logging capabilities
     *
     * @param {any} ctx - if provided, adds to logger contexts
     */
    constructor(ctx) {
        this._ctx = {};
        if (ctx) {
            this._ctx = ctx;
            this._logger = log.child(ctx);
        } else {
            this._logger = log;
        }
    }

    /**
     * error function
     * @param {String} message - string to log
     * @param {any} ctx - context
     */
    error(message, ctx) {
        return this._logger.error(message, ctx);
    }

    /**
     * info function
     * @param {String} message - string to log
     * @param {any} ctx - context
     */
    info(message, ctx) {
        return this._logger.info(message, ctx);
    }

    /**
     * warn function
     * @param {String} message - string to log
     * @param {any} ctx - context
     */
    warn(message, ctx) {
        return this._logger.warn(message, ctx);
    }

    /**
     * creates a new logger object, adding additional context to the current
     * @param {any} ctx - context
     */
    child(ctx) {
        const lctx = {
            ...this._ctx,
            ...ctx
        };

        return new Logger(lctx);
    }
}

module.exports = Logger;
