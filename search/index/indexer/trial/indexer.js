const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;
const JSONStream          = require("JSONStream");
const moment              = require("moment");

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
  }

  _addFieldsToTrial(trial) {
    this._addDiseaseKeysFieldToTrial(trial);
    this._addLocationKeysFieldToTrial(trial);
    this._addOrganizationKeysFieldToTrial(trial);
    this._addDateLastUpdatedAnythingFieldToTrial(trial);

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

  // looks through all date fields, finds the latest one and uses that
  // for the "date_last_updated_anything" field
  _addDateLastUpdatedAnythingFieldToTrial(trial) {
    let updateDates = [];

    const _addDateToArr = (stringDate) => {
      let momentDate = moment(stringDate);
      if(stringDate && momentDate.isValid()) updateDates.push(momentDate);
    }

    [
      trial.amendment_date, trial.current_trial_status_date,
      trial.date_last_created, trial.date_last_updated
    ].forEach(_addDateToArr);

    if(trial.diseases) {
      trial.diseases.forEach((disease) => {
        [
          disease.date_last_created, disease.date_last_updated
        ].forEach(_addDateToArr);
      });
    }

    if(trial.sites) {
      trial.sites.forEach((site) => {
        _addDateToArr(site.recruitment_status_date);
        if(site.org) {
          _addDateToArr(site.org.status_date);
        }
      });
    }

    let updatedDate = moment.max(updateDates);

    trial.date_last_updated_anything = updatedDate.utc().format("YYYY-MM-DD");
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

  constructor(params) {
    super(params);
    this.indexCounter = 0;
  }

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");
    let is = new TrialIndexerStream(this);

    rs.pipe(js).pipe(is).on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} documents.`);
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
