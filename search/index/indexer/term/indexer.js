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
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname,
  '../../../../import/export_from_pg/trials.json');

const transformStringToKey = Utils.transformStringToKey;

class TermIndexerStream extends Writable {

  constructor(termIndexer) {
    super({objectMode: true});
    this.termIndexer = termIndexer;
    this.logger = termIndexer.logger;
    this.indexCounter = termIndexer.indexCounter;
  }

  _indexTerm(termDoc, done) {
    let id = `${termDoc.term_key}_${termDoc.classification}`;
    this.logger.info(`Indexing term (${id}).`);
    this.termIndexer.indexDocument({
      "index": this.termIndexer.esIndex,
      "type": this.termIndexer.esType,
      "id": id,
      "body": termDoc
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      this.termIndexer.indexCounter++;

      return done(err, response);
    });
  };

  _write(termDoc, enc, next) {
    this._indexTerm(termDoc, (err, response) => {
      return next(null, response);
    });
  }

}

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
    this.indexCounter = 0;
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
    let is = new TermIndexerStream(this);

    let termType = params.termType;
    let termsRoot = params.termsRoot;
    this.indexCounter = 0;

    let maxTermCount = _.max(
      _.map(_.values(this.terms[termsRoot]), (term) => {
        return term.count;
      })
    );
    Object.keys(this.terms[termsRoot]).forEach((termKey) => {
      let termObj = this.terms[termsRoot][termKey];
      let term = termObj["term"];
      let count = termObj["count"];
      let count_normalized = count / maxTermCount;
      let doc = {
        "term": term,
        "term_key": termKey,
        "classification": termType,
        "count": count,
        "count_normalized": count_normalized
      };
      is.write(doc);
    });
    is.end();

    is.on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} ${termType} documents.`);
      return callback();
    });
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
