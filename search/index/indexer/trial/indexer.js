const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");
const Utils               = require("../../../../utils/utils");

const CONFIG = require("../../../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-clinical-trials",
  "esType": "trial",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname,
  '../../../../import/export_from_pg/trials.json');

const transformStringToKey = Utils.transformStringToKey;

class TrialIndexerStream extends Writable {

  constructor(trialIndexer) {
    super({objectMode: true});
    this.trialIndexer = trialIndexer;
    this.logger = trialIndexer.logger;
    this.indexCounter = trialIndexer.indexCounter;
  }

  _addFieldsToTrial(trial) {
    this._addDiseaseKeysFieldToTrial(trial);
    this._addLocationKeysFieldToTrial(trial);
    this._addOrganizationKeysFieldToTrial(trial);

    return trial;
  }

  _addDiseaseKeysFieldToTrial(trial) {
    trial.disease_keys = [];
    trial.diseases.forEach((disease) => {
      trial.disease_keys = trial.disease_keys.concat(
        disease.synonyms.map((synonym) => {
          return transformStringToKey(synonym);
        })
      );
    });
  }

  _addLocationKeysFieldToTrial(trial) {
    if(trial.sites) {
      trial.location_keys = trial.sites.map((site) => {
        let org = site.org;
        let location = _.compact([
          org.city,
          org.state_or_province,
          org.country
        ]).join(", ");
        return transformStringToKey(location);
      });
    }
  }

  _addOrganizationKeysFieldToTrial(trial) {
    if(trial.sites) {
      trial.organization_keys = trial.sites.map((site) => {
        let org = site.org;
        let organization = org.name;
        return transformStringToKey(organization);
      });
    }
  }

  _indexTrial(trial, done) {
    this.logger.info(
      `Indexing clinical trial with nci_id (${trial.nci_id}).`);

    this.trialIndexer.indexDocument({
      "index": this.trialIndexer.esIndex,
      "type": this.trialIndexer.esType,
      "id": trial.nci_id,
      "body": this._addFieldsToTrial(trial)
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      this.indexCounter++;

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

  constructor(params) {
    super(params);
    this.indexCounter = 0;
  }

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");
    let is = new TrialIndexerStream(this);

    rs.pipe(js).pipe(is).on("end", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
      callback();
    }).on("error", (err) => {
      this.logger.error(err);
      callback();
    });
  }

  static init(callback) {
    let indexer = new TrialIndexer(ES_PARAMS);
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
      return callback(err);
    });
  }

}

module.exports = TrialIndexer;
