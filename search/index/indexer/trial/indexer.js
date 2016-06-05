const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");

const CONFIG = require("../../../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-clinical-trials",
  "esType": "trial",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname, '../../../../import/export_from_pg/trials.json');
const NCI_THESAURUS_FILEPATH = path.join(__dirname, '../../../../import/export_from_pg/thesaurus.json');

class TrialIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "trial-indexer";
  }

  _addFieldsToTrial(trial) {

    this._addDiseasesRawFieldToTrial(trial);
    this._addLocationsRawFieldToTrial(trial);
    this._addOrganizationsRawFieldToTrial(trial);

    // this._addDiseaseFamilyFieldToTrial(trial);

    return trial;
  }

  _addDiseasesRawFieldToTrial(trial) {
    trial.diseases_raw = [];
    trial.diseases.forEach((disease) => {
      trial.diseases_raw = trial.diseases_raw.concat(
        disease.synonyms.map((synonym) => {
          return this._getKeyTerm(synonym);
        })
      );
    });
  }

  _addLocationsRawFieldToTrial(trial) {
    if(trial.sites) {
      trial.locations_raw = trial.sites.map((site) => {
        let org = site.org;
        let location = _.compact([
          org.city,
          org.state_or_province,
          org.country
        ]).join(", ");
        return this._getKeyTerm(location);
      });
    }
  }

  _addOrganizationsRawFieldToTrial(trial) {
    if(trial.sites) {
      trial.organizations_raw = trial.sites.map((site) => {
        let org = site.org;
        let organization = org.name;
        return this._getKeyTerm(organization);
      });
    }
  }

  _addDiseaseFamilyFieldToTrial(trial) {
    // traverses the trial's diseases and finds the top-level disease class
    // according to the nci_thesaurus
    const NT = this.nciThesaurus;

    let reverseTree = {};
    trial.diseases.forEach((disease) => {
      let code = disease.nci_thesaurus_concept_id;
      if(code) {
        reverseTree[code] = {};
      }
    });

    const _recurseNciThesaurus = (reverseTreePart) => {
      Object.keys(reverseTreePart).forEach((key) => {
        let nciObj = this.nciThesaurus[key];
        let parentsField = nciObj.parents;
        if(parentsField === "root_node") {
          return;
        }
        let parents = parentsField.split("|");
        parents.forEach((parent) => {
          reverseTreePart[key][parent] = {};
        })
        _recurseNciThesaurus(reverseTreePart[key]);
      });
    }

    _recurseNciThesaurus(reverseTree);

    // this.logger.debug("tree", JSON.stringify(reverseTree));
  }

  loadNciThesaurus(callback) {
    this.logger.info("Loading the nci thesaurus into memory...");
    const nciThesaurusArray = require(NCI_THESAURUS_FILEPATH);

    let nciThesaurus = {};
    nciThesaurusArray.forEach((row) => {
      nciThesaurus[row.code] = {
        "concept_name": row.concept_name,
        "parents": row.parents,
        "synonyms": row.synonyms
      };
      // this.logger.info(`Loaded nci thesaurus code ${row.code} into memory.`);
    });
    this.nciThesaurus = nciThesaurus;
    return callback();
  }

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");

    let indexCounter = 0;
    const _indexTrial = (trial, done) => {
      this.logger.info(`Indexing clinical trial with nci_id (${trial.nci_id}).`);

      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": trial.nci_id,
        "body": this._addFieldsToTrial(trial)
      }, (err, response, status) => {
        if(err) { this.logger.error(err); }
        indexCounter++;
        return done(err, response);
      });
    };

    let indexQ = async.queue(_indexTrial, CONFIG.ES_CONCURRENCY);

    const _pushToQ = (trial) => {
      indexQ.push(trial, (err) => {
        if(err) { this.logger.error(err); }
      });
    }

    rs.pipe(js).on("data", _pushToQ);

    let queueCompleted = false;
    indexQ.drain = () => {
      this.logger.info(`Waiting ${CONFIG.QUEUE_GRACE_PERIOD/1000} seconds for queue to complete...`);
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
      // (next) => { indexer.loadNciThesaurus(next); },
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
