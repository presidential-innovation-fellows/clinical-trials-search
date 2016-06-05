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
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname,
  '../../../../import/export_from_pg/trials.json');

const transformStringToKey = Utils.transformStringToKey;

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
      anatomicSites: {}
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
      this.loadDiseaseTermsFromTrial(trial);
      this.loadLocationTermsFromTrial(trial);
      this.loadOrganizationTermsFromTrial(trial);
      this.loadAnatomicSiteTermsFromTrial(trial);
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
      let termKey = transformStringToKey(term);
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

  loadDiseaseTermsFromTrial(trial) {
    if(!trial.diseases) { return; }

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

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  loadLocationTermsFromTrial(trial) {
    if(!trial.sites) { return; }

    const termType = "locations";
    const extractTermsToArr = () => {
      let terms = [];
      trial.sites.forEach((site) => {
        let org = site.org;
        let location = _.compact([
          org.city,
          org.state_or_province,
          org.country
        ]).join(", ");

        if(location) {
          terms.push(location);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  loadOrganizationTermsFromTrial(trial) {
    if(!trial.sites) { return; }

    const termType = "organizations";
    const extractTermsToArr = () => {
      let terms = [];
      trial.sites.forEach((site) => {
        let org = site.org;
        let organization = org.name;

        if(organization) {
          terms.push(organization);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  loadOrganizationFamilyTermsFromTrial(trial) {
    if(!trial.sites) { return; }

    const termType = "organizationFamilies";
    const extractTermsToArr = () => {
      let terms = [];
      trial.sites.forEach((site) => {
        let org = site.org;
        let organizationFamily = org.name.toLowerCase();

        if(organizationFamily) {
          terms.push(organizationFamily);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  loadAnatomicSiteTermsFromTrial(trial) {
    if(!trial.anatomic_sites) { return; }

    const termType = "anatomicSites";
    const extractTermsToArr = () => {
      let terms = [];
      trial.anatomic_sites.forEach((anatomicSite) => {
        if(anatomicSite) {
          terms.push(anatomicSite);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  indexTermsForType(params, callback) {
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

  indexTerms(callback) {
    async.waterfall([
      (next) => { this.indexTermsForType({ termType: "disease", termsRoot: "diseases" }, next)},
      (next) => { this.indexTermsForType({ termType: "location", termsRoot: "locations" }, next)},
      (next) => { this.indexTermsForType({ termType: "organization", termsRoot: "organizations" }, next)},
      // (next) => { this.indexTermsForType({ termType: "organization_family", termsRoot: "organizationFamilies" }, next)},
      (next) => { this.indexTermsForType({ termType: "anatomic_site", termsRoot: "anatomicSites" }, next)}
    ], callback)
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
      (next) => { indexer.indexTerms(next) }
    ], (err) => {
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      callback(err);
    });
  }

}

module.exports = TermIndexer;
