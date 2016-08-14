const babyparse           = require("babyparse");
const Transform           = require("stream").Transform;
const Logger              = require("../../../common/logger");

let logger = new Logger({ name: "special-chars-stream" });

/**
 * Removes special characters from file so that other streams can function
 * properly. Otherwise, streaming by line and parsing json do not work as
 * expected.
 *
 * @class SpecialCharsStream
 * @extends {Transform}
 */
class SpecialCharsStream extends Transform {

  _transform(buffer, enc, next) {
    let bufferString = buffer.toString();
    let kosherString = bufferString.replace(/\u2028/g, "")
      .replace(/\u2029/g, "");

    this.push(kosherString);
    next();
  }

}

module.exports = SpecialCharsStream;
