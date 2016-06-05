const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
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

class TrialIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "trial-indexer";
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

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");

    let indexCounter = 0;
    const _indexTrial = (trial, done) => {
      this.logger.info(
        `Indexing clinical trial with nci_id (${trial.nci_id}).`);

      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": trial.nci_id,
        "body": this._addFieldsToTrial(trial)
      }, (err, response, status) => {
        if(err) { this.logger.error(err); }
        indexCounter++;
        // set timeout to avoid overloading elasticsearch
        setTimeout(() => {
          return done(err, response);
        }, CONFIG.INDEXING_DOC_DELAY_PERIOD);
      });
    };

    // set concurrency to a relatively low number (< 10) to avoid overloading
    // elasticsearch
    let indexQ = async.queue(_indexTrial, CONFIG.INDEXING_CONCURRENCY);

    const _pushToQ = (trial) => {
      indexQ.push(trial, (err) => {
        if(err) { this.logger.error(err); }
      });
    }

    rs.pipe(js).on("data", _pushToQ);

    let queueCompleted = false;
    indexQ.drain = () => {
      // ugly, but prevents us from proceeding unless we are truly done with the queue
      // backups can occur when we are trying to index too much concurrently, so better
      // be safe than sorry
      this.logger.info(
        `Waiting ${CONFIG.QUEUE_GRACE_PERIOD/1000} seconds for queue to complete...`);
      setTimeout(() => {
        let qSize = indexQ.length() + indexQ.running();
        if(!queueCompleted && qSize === 0) {
          this.logger.info(`Indexed all ${indexCounter} trials in "trials.json".`);
          queueCompleted = true;
          return callback();
        } else {
          this.logger.info(`Queue wasn't fully drained - proceeding...`);
        }
      }, CONFIG.QUEUE_GRACE_PERIOD);
    }
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
