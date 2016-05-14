const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");
const Logger              = require("../logger");

let logger = new Logger();

const CONFIG = require("../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-clinical-trials",
  "esType": "trial",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class TrialIndexer extends AbstractIndexer {

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(
      path.join(__dirname, '../../../importer/trials.json'));
    let js = JSONStream.parse("*");

    const _indexTrial = (trial, next) => {
      logger.info(`Indexing clinical trial with nci_id (${trial.nci_id}).`);
      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": trial.nci_id,
        "body": trial
      }, (err, response, status) => {
        if(err) { logger.error(err); }
        return next(err, response);
      });
    };

    let indexQ = async.queue(_indexTrial, CONFIG.ES_CONCURRENCY);

    const _pushToQ = (trial) => {
      indexQ.push(trial, (err) => {
        if(err) { logger.error(err); }
      });
    }

    rs.pipe(js).on("data", _pushToQ).on("finished", () => {
      logger.info("Indexed all trials in \"trials.json\".");
    });
  }

  static init(callback) {
    let indexer = new TrialIndexer(ES_PARAMS);
    logger.info("Started indexing.");
    async.waterfall([
      (next) => { indexer.indexExists(next); },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex(next)
        } else {
          next(null, null);
        }
      },
      (response, next) => { indexer.initIndex(next); },
      (response, next) => { indexer.initMapping(next); },
      (response, next) => { indexer.indexFromTrialsJsonDump(next); }
    ], (err) => {
      logger.info("Finished indexing.");
    });
  }

}

module.exports = TrialIndexer;
