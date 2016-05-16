const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");
const Logger              = require("../../../../logger");

let logger = new Logger();

const CONFIG = require("../../../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname, '../../../../import/trials.json');

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
    let rs = fs.createReadStream(TRIALS_FILEPATH);
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

  _getKeyTerm(text) {
    return text
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/ /g,"_")
      .toLowerCase();
  }

  _toTitleCase(str) {
    return str.replace(/\w\S*/g,
      function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  _loadDiseaseTermsFromTrial(trial) {
    if(!trial.diseases) { return; }
    let diseaseTerms = {};
    trial.diseases.forEach((disease) => {
      if(!disease.synonyms) { return; }
      disease.synonyms.forEach((synonym) => {
        let key = this._getKeyTerm(synonym);
        if(typeof diseaseTerms[key] === "undefined") {
          diseaseTerms[key] = {
            count: 1,
            name: synonym
          };
        }
      });
    });
    Object.keys(diseaseTerms).forEach((diseaseTerm) => {
      if(typeof this.terms.diseases[diseaseTerm] === "undefined") {
        this.terms.diseases[diseaseTerm] = {
          count: diseaseTerms[diseaseTerm].count,
          name: diseaseTerms[diseaseTerm].name
        };
      } else{
        this.terms.diseases[diseaseTerm].count +=
          diseaseTerms[diseaseTerm].count;
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
      ]).join(", ");
      if(location) {
        let key = this._getKeyTerm(location);
        if(typeof locationTerms[key] === "undefined") {
          locationTerms[key] = {
            count: 1,
            name: location
          };
        }
      }
    });
    Object.keys(locationTerms).forEach((locationTerm) => {
      if(typeof this.terms.locations[locationTerm] === "undefined") {
        this.terms.locations[locationTerm] = {
          count: locationTerms[locationTerm].count,
          name: locationTerms[locationTerm].name
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
        let key = this._getKeyTerm(organization);
        if(typeof organizationTerms[key] === "undefined") {
          organizationTerms[key] = {
            count: 1,
            name: organization
          };
        }
      }
    });
    Object.keys(organizationTerms).forEach((organizationTerm) => {
      if(typeof this.terms.organizations[organizationTerm] === "undefined") {
        this.terms.organizations[organizationTerm] = {
          count: organizationTerms[organizationTerm].count,
          name: organizationTerms[organizationTerm].name
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
        let key = this._getKeyTerm(organizationFamily);
        if(typeof organizationFamilyTerms[key] === "undefined") {
          organizationFamilyTerms[key] = {
            count: 1,
            name: this._toTitleCase(organizationFamily)
          };
        }
      }
    });
    Object.keys(organizationFamilyTerms).forEach((organizationFamilyTerm) => {
      if(typeof this.terms.organizationFamilies[organizationFamilyTerm] === "undefined") {
        this.terms.organizationFamilies[organizationFamilyTerm] = {
          count: organizationFamilyTerms[organizationFamilyTerm].count,
          name: organizationFamilyTerms[organizationFamilyTerm].name
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
    const _indexTerm = (term, next) => {
      let id = `${this._getKeyTerm(term.text)}_${term.classification}`;
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

    let maxTermCount = _.max(
      _.map(_.values(this.terms[termsRoot]), (term) => {
        return term.count;
      }));
    Object.keys(this.terms[termsRoot]).forEach((term) => {
      let termObj = this.terms[termsRoot][term];
      let name = termObj["name"];
      let count = termObj["count"];
      let count_normalized = count / maxTermCount;
      _pushToQ({
        "text": name,
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
