const _                   = require("lodash");
const JSONStream          = require("JSONStream");
const Utils               = require("./utils");
const Logger              = require("./logger");

let logger = new Logger({name: "term-loader"});

class TermLoader {

  constructor() {
    this.terms = {
      diseases: {},
      locations: {},
      organizations: {},
      anatomicSites: {}
      // organizationFamilies: {}
    };
    this.indexCounter = 0;
  }

  loadTermsFromTrialsJsonReadStream(rs, callback) {
    logger.info("Loading terms from \"trials.json\" stream.");
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      logger.info(
        `Loading terms from trial with nci_id (${trial.nci_id}).`);
      this.loadDiseaseTermsFromTrial(trial);
      this.loadLocationTermsFromTrial(trial);
      this.loadOrganizationTermsFromTrial(trial);
      this.loadAnatomicSiteTermsFromTrial(trial);
      // this._loadOrganizationFamilyTermsFromTrial(trial);
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      logger.info("Loaded terms from \"trials.json\" stream.");
      return callback();
    });
  }

  _loadTermsFromTrialForTermType(termType, extractTermsToArr) {
    let terms = {};
    let termsArr = extractTermsToArr();
    termsArr.forEach((term) => {
      let termKey = Utils.transformStringToKey(term);
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

}

module.exports = TermLoader;
