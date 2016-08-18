const _                   = require("lodash");
const babyparse           = require("babyparse");
const Transform           = require("stream").Transform;
const Logger              = require("../../../common/logger");

let logger = new Logger({ name: "csv-stream" });

/**
 * Streams a csv using babyparse. It was necessary to use this rather than
 * the babyparse built-in streaming because otherwise, with large files, a
 * large amount of rows went missing.
 *
 * @class CsvStream
 * @extends {Transform}
 */
class CsvStream extends Transform {

  constructor({header, delimiter, exclude}) {
    super({ objectMode: true });
    this.header = header;
    this.delimiter = delimiter;
    this.exclude = exclude;
    this.isFirstLine = true;
  }

  _transform(buffer, enc, next) {
    let bufferString = buffer.toString();
    let csv = babyparse.parse(bufferString, {
      header: false,
      delimiter: this.delimiter,
    });
    csv.data.forEach((row) => {
      let rowHash = {};
      this.header.forEach((headerField, i) => {
        if (!_.includes(this.exclude, headerField)) {
          rowHash[headerField] = row[i];
        }
      });
      if (this.isFirstLine) {
        this.isFirstLine = false;
      } else {
        this.push(rowHash);
      }
    });

    next();
  }

}

module.exports = CsvStream;
