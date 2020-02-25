const http = require('http');

class RestClient {
    constructor(options) {
        this._options = {
            host:'localhost',
            port:8788,
            ...options}
    }

    async getHealth() {
        return await this._get(`http://${this._options.host}:${this._options.port}/about/health`);
    }

    async getStats() {
        return await this._get(`http://${this._options.host}:${this._options.port}/about/stats`);
    }

    async _get(url) {
        return new Promise((resolve,reject) => {
            const options = {timeout: 1000}
            http.get(url, options, (res) => {
                const { statusCode } = res;
                const contentType = res.headers['content-type'];
              
                let error;
                if (statusCode !== 200) {
                  error = new Error('Request Failed.\n' +
                                    `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                  error = new Error('Invalid content-type.\n' +
                                    `Expected application/json but received ${contentType}`);
                }
                if (error) {
                  console.error(error.message);
                  // Consume response data to free up memory
                  res.resume();
                  reject(error);
                  return;
                }
              
                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                  try {
                    const parsedData = JSON.parse(rawData);
//                    console.log(parsedData);
                    resolve(parsedData);
                  } catch (e) {
                    console.error(e.message);
                    reject(e);
                  }
                });
              }).on('error', (e) => {
                console.error(`Got error: ${e.message}`);
                reject(e)
              });
        });
    }

}

module.exports = RestClient;