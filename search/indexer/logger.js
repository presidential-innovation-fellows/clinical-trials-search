const bunyan = require("bunyan");

const LOGGER_NAME = "indexer";

module.exports = class Logger {

  constructor(config) {
    let bun = bunyan.createLogger({name: LOGGER_NAME});
    this.error = bun.error.bind(bun);
    this.warning = bun.warn.bind(bun);
    this.info = bun.info.bind(bun);
    this.debug = bun.debug.bind(bun);
    this.trace = (method, requestUrl, body, responseBody, responseStatus) => {
      bun.trace({
        method: method,
        requestUrl: requestUrl,
        body: body,
        responseBody: responseBody,
        responseStatus: responseStatus
      });
    };
    this.close = function () { /* bunyan's loggers do not need to be closed */ };
  }

};
