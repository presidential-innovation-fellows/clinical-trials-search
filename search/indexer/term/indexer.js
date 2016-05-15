const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");
const Logger              = require("../logger");

let logger = new Logger();

const CONFIG = require("../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class TermIndexer extends AbstractIndexer {

  constructor(params) {
    super(params);
    this.terms = {
      diseases: {},
      locations: {},
      organizations: {},
      organizationFamilies: {}
    };
  }

  loadTermsFromTrialsJsonDump(callback) {
    logger.info("Loading terms from \"trials.json\".");
    let rs = fs.createReadStream(
      path.join(__dirname, '../../../importer/trials.json'));
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      logger.info(`Loading terms from trial with nci_id (${trial.nci_id}).`);
      this._loadDiseaseTermsFromTrial(trial);
      this._loadLocationTermsFromTrial(trial);
      this._loadOrganizationTermsFromTrial(trial);
      this._loadOrganizationFamilyTermsFromTrial(trial);
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      logger.info("Loaded terms from \"trials.json\".");
      return callback();
    });
  }

  _loadDiseaseTermsFromTrial(trial) {
    if(!trial.diseases) { return; }
    let diseaseTerms = {};
    trial.diseases.forEach((disease) => {
      if(!disease.synonyms) { return; }
      disease.synonyms.forEach((synonym) => {
        synonym = synonym.toLowerCase();
        if(typeof diseaseTerms[synonym] === "undefined") {
          diseaseTerms[synonym] = 1;
        }
      });
    });
    Object.keys(diseaseTerms).forEach((diseaseTerm) => {
      if(typeof this.terms.diseases[diseaseTerm] === "undefined") {
        this.terms.diseases[diseaseTerm] = diseaseTerms[diseaseTerm];
      } else{
        this.terms.diseases[diseaseTerm] += diseaseTerms[diseaseTerm];
      }
    });
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
      ]).join(", ").toLowerCase();
      if(location) {
        if(typeof locationTerms[location] === "undefined") {
          locationTerms[location] = 1;
        }
      }
    });
    Object.keys(locationTerms).forEach((locationTerm) => {
      if(typeof this.terms.locations[locationTerm] === "undefined") {
        this.terms.locations[locationTerm] = locationTerms[locationTerm];
      } else{
        this.terms.locations[locationTerm] += locationTerms[locationTerm];
      }
    });
  }

  _loadOrganizationTermsFromTrial(trial) {
    if(!trial.sites) { return; }
    let organizationTerms = {};
    trial.sites.forEach((site) => {
      let org = site.org;
      let organization = org.name.toLowerCase();
      if(organization) {
        if(typeof organizationTerms[organization] === "undefined") {
          organizationTerms[organization] = 1;
        }
      }
    });
    Object.keys(organizationTerms).forEach((organizationTerm) => {
      if(typeof this.terms.organizations[organizationTerm] === "undefined") {
        this.terms.organizations[organizationTerm] = organizationTerms[organizationTerm];
      } else{
        this.terms.organizations[organizationTerm] += organizationTerms[organizationTerm];
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
        if(typeof organizationFamilyTerms[organizationFamily] === "undefined") {
          organizationFamilyTerms[organizationFamily] = 1;
        }
      }
    });
    Object.keys(organizationFamilyTerms).forEach((organizationFamilyTerm) => {
      if(typeof this.terms.organizationFamilies[organizationFamilyTerm] === "undefined") {
        this.terms.organizationFamilies[organizationFamilyTerm] = organizationFamilyTerms[organizationFamilyTerm];
      } else{
        this.terms.organizationFamilies[organizationFamilyTerm] += organizationFamilyTerms[organizationFamilyTerm];
      }
    });
  }

  indexTerms(params, callback) {
    let termType = params.termType;
    let termsRoot = params.termsRoot;
    let indexCounter = 0;
    const _indexTerm = (term, next) => {
      let id = `${term.text}_${term.classification}`;
      logger.info(`Indexing term (${id}).`);
      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": id,
        "body": term
      }, (err, response, status) => {
        if(err) { logger.error(err); }
        indexCounter++;
        return next(err, response);
      });
    };

    let indexQ = async.queue(_indexTerm, CONFIG.ES_CONCURRENCY);

    const _pushToQ = (term) => {
      indexQ.push(term, (err) => {
        if(err) { logger.error(err); }
      });
    };

    let maxTermCount = _.max(_.values(this.terms[termsRoot]));
    Object.keys(this.terms[termsRoot]).forEach((term) => {
      let count = this.terms[termsRoot][term];
      let count_normalized = count / maxTermCount;
      _pushToQ({
        "text": term,
        "classification": termType,
        "count": count,
        "count_normalized": count_normalized
      });
    });

    let queueCompleted = false;
    indexQ.drain = () => {
      logger.info(`Waiting ${CONFIG.QUEUE_GRACE_PERIOD/1000} seconds for queue to complete...`);
      setTimeout(() => {
        if(!queueCompleted) {
          logger.info(`Indexed all ${indexCounter} ${termType} terms.`);
          queueCompleted = true;
          return callback();
        }
      }, CONFIG.QUEUE_GRACE_PERIOD);
    }
  }

  static init(callback) {
    let indexer = new TermIndexer(ES_PARAMS);
    logger.info(`Started indexing (${indexer.esType}) indices.`);
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
      (next) => { indexer.indexTerms({ termType: "location", termsRoot: "locations" }, next)},
      (next) => { indexer.indexTerms({ termType: "organization", termsRoot: "organizations" }, next)},
      (next) => { indexer.indexTerms({ termType: "organization_family", termsRoot: "organizationFamilies" }, next)}
    ], (err) => {
      if(err) { logger.error(err); }
      logger.info(`Finished indexing (${indexer.esType}) indices.`);
      callback(err);
    });
  }

}

module.exports = TermIndexer;
