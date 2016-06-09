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
      anatomicSites: {},
      organizationFamilies: {},
      treatments: {}
    };
    this.indexCounter = 0;
  }

  loadTermsFromTrialsJsonReadStream(rs, callback) {
    logger.info("Loading terms from \"trials.json\" stream.");
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      // logger.info(
      //   `Loading terms from trial with nci_id (${trial.nci_id}).`);
      this._loadDiseaseTermsFromTrial(trial);
      this._loadLocationTermsFromTrial(trial);
      this._loadOrganizationTermsFromTrial(trial);
      this._loadAnatomicSiteTermsFromTrial(trial);
      this._loadOrganizationFamilyTermsFromTrial(trial);
      this._loadTreatmentTermsFromTrial(trial);
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      logger.info("Loaded terms from \"trials.json\" stream.");
      return this._calcMostFrequentTerm(callback);
    });
  }

  _calcMostFrequentTerm(callback) {
    _.forOwn(this["terms"], (termTypeObj, termTypeKey) => {
      _.forOwn(termTypeObj, (termObj, termKey) => {
        let maxTerm = { term: null, count: 0 };
        _.forOwn(termObj["terms"], (count, term) => {
          if (count > maxTerm["count"]) {
            maxTerm = { term, count };
          }
        });
        this["terms"][termTypeKey][termKey] = {
          term: maxTerm["term"],
          terms: termObj["terms"],
          count: termObj["count"]
        };

        // logger.info(maxTerm["term"], this["terms"][termTypeKey][maxTerm["term"]]);
      });
    });
    return callback();
  }

  _loadTermsFromTrialForTermType(termType, extractTermsToArr) {
    /*
      Produces this.terms = {
        term_one: {
          count: 10,
          terms: {
            "Term One": 26,
            "term one": 14
          }
        }
      }
    */
    let terms = {};
    let termsArr = extractTermsToArr();

    termsArr.forEach((term) => {
      let termKey = Utils.transformStringToKey(term);
      if (typeof terms[termKey] === "undefined") {
        terms[termKey] = {
          count: 1,
          terms: {}
        };
      }
      if (typeof terms[termKey]["terms"][term] === "undefined") {
        terms[termKey]["terms"][term] = 1;
      } else {
        terms[termKey]["terms"][term]++;
      }
    });

    Object.keys(terms).forEach((termKey) => {
      if (typeof this.terms[termType][termKey] === "undefined") {
        this.terms[termType][termKey] = {
          count: 0,
          terms: {}
        };
      }
      this.terms[termType][termKey]["count"] +=
        terms[termKey]["count"];

      Object.keys(terms[termKey]["terms"]).forEach((term) => {
        if (typeof this.terms[termType][termKey]["terms"][term] === "undefined") {
          this.terms[termType][termKey]["terms"][term] = 0;
        }
        this.terms[termType][termKey]["terms"][term] +=
          terms[termKey]["terms"][term];
      });
    });
  }

  _loadDiseaseTermsFromTrial(trial) {
    if (!trial.diseases) { return; }

    const termType = "diseases";
    const extractTermsToArr = () => {
      let terms = [];
      trial.diseases.forEach((disease) => {
        if (!disease.synonyms) { return; }

        disease.synonyms.forEach((synonym) => {
          terms.push(synonym);
        });
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadLocationTermsFromTrial(trial) {
    if (!trial.sites) { return; }

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

        if (location) {
          terms.push(location);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadOrganizationTermsFromTrial(trial) {
    if (!trial.sites) { return; }

    const termType = "organizations";
    const extractTermsToArr = () => {
      let terms = [];
      trial.sites.forEach((site) => {
        let org = site.org;
        let organization = org.name;

        if (organization) {
          terms.push(organization);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadOrganizationFamilyTermsFromTrial(trial) {
    if (!trial.sites) { return; }

    const termType = "organizationFamilies";
    const extractTermsToArr = () => {
      let terms = [];
      trial.sites.forEach((site) => {
        let org = site.org;
        let organizationFamily = org.family;

        if (organizationFamily) {
          terms.push(organizationFamily);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadAnatomicSiteTermsFromTrial(trial) {
    if (!trial.anatomic_sites) { return; }

    const termType = "anatomicSites";
    const extractTermsToArr = () => {
      let terms = [];
      trial.anatomic_sites.forEach((anatomicSite) => {
        if (anatomicSite) {
          terms.push(anatomicSite);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

  _loadTreatmentTermsFromTrial(trial) {
    if (!trial.arms) { return; }

    const termType = "treatments";
    const extractTermsToArr = () => {
      let terms = [];
      trial.arms.forEach((arm) => {
        let treatment = `${arm.intervention_name} {${arm.intervention_type}}`;

        if (arm.intervention_name) {
          terms.push(treatment);
        }
      });
      return terms;
    };

    this._loadTermsFromTrialForTermType(termType, extractTermsToArr);
  }

}

module.exports = TermLoader;
