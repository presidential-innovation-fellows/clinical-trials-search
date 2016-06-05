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
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname,
  '../../../../import/export_from_pg/trials.json');

class TermIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "term-indexer";
  }

  constructor(params) {
    super(params);
    this.terms = {
      diseases: {},
      locations: {},
      organizations: {},
      anatomic_sites: {}
      // organizationFamilies: {}
    };
  }

  loadTermsFromTrialsJsonDump(callback) {
    this.logger.info("Loading terms from \"trials.json\".");
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      this.logger.info(
        `Loading terms from trial with nci_id (${trial.nci_id}).`);
      this._loadDiseaseTermsFromTrial(trial);
      // this._loadLocationTermsFromTrial(trial);
      // this._loadOrganizationTermsFromTrial(trial);
      // this._loadOrganizationFamilyTermsFromTrial(trial);
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      this.logger.info("Loaded terms from \"trials.json\".");
      return callback();
    });
  }

  _loadTermsFromTrialForTermType(termType, extractTermsToArr) {
    let terms = {};
    let termsArr = extractTermsToArr();
    termsArr.forEach((term) => {
      let termKey = this._transformStringToKey(term);
      if(typeof terms[termKey] === "undefined") {
        terms[termKey] = {
          count: 1,
          term: term
        };
      }
    });
    Object.keys(terms).forEach((termKey) => {
      if(typeof this.terms[termType][termKey] === "undefined") {
        this.terms[termType][termKey] = {
          count: terms[termKey].count,
          term: terms[termKey].term
        };
      } else {
        this.terms[termType][termKey].count +=
          terms[termKey].count;
      }
    });
  }

  _loadDiseaseTermsFromTrial(trial) {
    const termType = "diseases";
    const extractTermsToArr = () => {
      let terms = [];
      trial.diseases.forEach((disease) => {
        if(!disease.synonyms) { return; }
        disease.synonyms.forEach((synonym) => {
          terms.push(synonym);
        });
      });
      return terms;
    };
    if(!trial[termType]) { return; }
    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadLocationTermsFromTrial(trial) {
    if(!trial.sites) { return; }
    let locationTerms = {};
    trial.sites.forEach((site) => {
      let org = site.org;
      let location = _.compact([
        org.city,
        org.state_or_province,
        org.country
      ]).join(", ");
      if(location) {
        let key = this._transformStringToKey(location);
        if(typeof locationTerms[key] === "undefined") {
          locationTerms[key] = {
            count: 1,
            term: location
          };
        }
      }
    });
    Object.keys(locationTerms).forEach((locationTerm) => {
      if(typeof this.terms.locations[locationTerm] === "undefined") {
        this.terms.locations[locationTerm] = {
          count: locationTerms[locationTerm].count,
          term: locationTerms[locationTerm].term
        };
      } else{
        this.terms.locations[locationTerm].count +=
          locationTerms[locationTerm].count;
      }
    });
  }

  _loadOrganizationTermsFromTrial(trial) {
    if(!trial.sites) { return; }
    let organizationTerms = {};
    trial.sites.forEach((site) => {
      let org = site.org;
      let organization = org.name;
      if(organization) {
        let key = this._transformStringToKey(organization);
        if(typeof organizationTerms[key] === "undefined") {
          organizationTerms[key] = {
            count: 1,
            term: organization
          };
        }
      }
    });
    Object.keys(organizationTerms).forEach((organizationTerm) => {
      if(typeof this.terms.organizations[organizationTerm] === "undefined") {
        this.terms.organizations[organizationTerm] = {
          count: organizationTerms[organizationTerm].count,
          term: organizationTerms[organizationTerm].term
        };
      } else{
        this.terms.organizations[organizationTerm].count +=
          organizationTerms[organizationTerm].count;
      }
    });
  }

  _loadOrganizationFamilyTermsFromTrial(trial) {
    if(!trial.sites) { return; }
    let organizationFamilyTerms = {};
    trial.sites.forEach((site) => {
      let org = site.org;
      let organizationFamily = org.name.toLowerCase();
      if(organizationFamily) {
        let key = this._transformStringToKey(organizationFamily);
        if(typeof organizationFamilyTerms[key] === "undefined") {
          organizationFamilyTerms[key] = {
            count: 1,
            term: this._toTitleCase(organizationFamily)
          };
        }
      }
    });
    Object.keys(organizationFamilyTerms).forEach((organizationFamilyTerm) => {
      if(typeof this.terms.organizationFamilies[organizationFamilyTerm] === "undefined") {
        this.terms.organizationFamilies[organizationFamilyTerm] = {
          count: organizationFamilyTerms[organizationFamilyTerm].count,
          term: organizationFamilyTerms[organizationFamilyTerm].term
        };
      } else{
        this.terms.organizationFamilies[organizationFamilyTerm].count +=
          organizationFamilyTerms[organizationFamilyTerm].count;
      }
    });
  }

  indexTerms(params, callback) {
    let termType = params.termType;
    let termsRoot = params.termsRoot;
    let indexCounter = 0;
    const _indexTerm = (term, done) => {
      let id = `${term.term_key}_${term.classification}`;
      this.logger.info(`Indexing term (${id}).`);
      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": id,
        "body": term
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
    let indexQ = async.queue(_indexTerm, CONFIG.INDEXING_CONCURRENCY);

    const _pushToQ = (term) => {
      indexQ.push(term, (err) => {
        if(err) { this.logger.error(err); }
      });
    };

    let maxTermCount = _.max(
      _.map(_.values(this.terms[termsRoot]), (term) => {
        return term.count;
      }));
    Object.keys(this.terms[termsRoot]).forEach((termKey) => {
      let termObj = this.terms[termsRoot][termKey];
      let term = termObj["term"];
      let count = termObj["count"];
      let count_normalized = count / maxTermCount;
      _pushToQ({
        "term": term,
        "term_key": termKey,
        "classification": termType,
        "count": count,
        "count_normalized": count_normalized
      });
    });

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
          this.logger.info(`Indexed all ${indexCounter} ${termType} terms.`);
          queueCompleted = true;
          return callback();
        } else {
          this.logger.info(`Queue wasn't fully drained - proceeding...`);
        }
      }, CONFIG.QUEUE_GRACE_PERIOD);
    }
  }

  static init(callback) {
    let indexer = new TermIndexer(ES_PARAMS);
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
      (response, next) => { indexer.loadTermsFromTrialsJsonDump(next); },
      (next) => { indexer.indexTerms({ termType: "disease", termsRoot: "diseases" }, next)},
      // (next) => { indexer.indexTerms({ termType: "location", termsRoot: "locations" }, next)},
      // (next) => { indexer.indexTerms({ termType: "organization", termsRoot: "organizations" }, next)}
      // (next) => { indexer.indexTerms({ termType: "organization_family", termsRoot: "organizationFamilies" }, next)}
    ], (err) => {
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      callback(err);
    });
  }

}

module.exports = TermIndexer;
