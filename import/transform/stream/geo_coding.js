const _                   = require("lodash");
const Transform           = require("stream").Transform;
const Logger              = require("../../../common/logger");

const ZIP_CODES           = require("../../../data/zip_codes.json");

let logger = new Logger({ name: "geo-coding-stream" });

/**
 * Stream Transformer for geocoding trial study sites.
 * (Currently uses a basic zip_code => lat/lon map file for geocoding)
 *
 * @class GeoCodingStream
 * @extends {Transform}
 */
class GeoCodingStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  _transform(trial, enc, next) {
    logger.info(`Geocoding trial with nci_id (${trial.nci_id}).`);

    if (trial.sites) {
      trial.sites.forEach((site) => {
        if (site && site.org_postal_code) {
          let geopoint = ZIP_CODES[site.org_postal_code];
          if (geopoint) {
            site.org_coordinates = geopoint;
          }
        }
      });
    }

    this.push(trial);
    next();
  }

}

module.exports = GeoCodingStream;
