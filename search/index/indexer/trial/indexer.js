const fs                  = require("fs");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const JSONStream          = require("JSONStream");
const moment              = require("moment");

const AbstractIndexer     = require("../abstract_indexer");
const Utils               = require("../../../../common/utils");

const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esAlias": "cancer-clinical-trials",
  "esType": "trial",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

const transformStringToKey = Utils.transformStringToKey;

class TrialIndexerStream extends Writable {

  constructor(trialIndexer) {
    super({objectMode: true});
    this.trialIndexer = trialIndexer;
    this.logger = trialIndexer.logger;
  }

  _indexTrial(trial, done) {
    this.logger.info(
      `Indexing clinical trial with nci_id (${trial.nci_id}).`);

    this.trialIndexer.indexDocument({
      "index": this.trialIndexer.esIndex,
      "type": this.trialIndexer.esType,
      "id": trial.nci_id,
      "body": trial
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      this.trialIndexer.indexCounter++;

      return done(err, response);
    });
  }

  _write(trial, enc, next) {
    this._indexTrial(trial, (err, response) => {
      return next(null, response);
    });
  }
}

class TrialIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "trial-indexer";
  }

  constructor(adapter, trials_file, params) {
    super(adapter, trials_file, params);
    this.indexCounter = 0;    
  }

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(this.trials_file);
    let js = JSONStream.parse("*");
    let is = new TrialIndexerStream(this);

    rs.pipe(js).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    });
  }

  static init(adapter, trials_file, callback) {
    let indexer = new TrialIndexer(adapter, trials_file, ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
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
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      return callback(err,{
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }

}

module.exports = TrialIndexer;
