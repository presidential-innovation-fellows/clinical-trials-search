const _                   = require("lodash");
const JSONStream          = require("JSONStream");
const Utils               = require("./utils");
const Logger              = require("./logger");

let logger = new Logger({name: "term-loader"});

class TermLoader {

  static get DISEASE_BOOST_FACTOR() {
    return 10;
  }

  static get VALID_TERM_TYPES() {
    return [
      "_diseases",
      "_locations",
      "sites.org_name",
      "sites.org_family",
      "_treatments",
      "anatomic_sites",
      "arms.interventions.intervention_type",
      "current_trial_status",
      "phase.phase",
      "study_protocol_type"
    ]
  }

  constructor() {
    this.terms = {};
    this.indexCounter = 0;
  }

  loadTermsFromTrialsJsonReadStream(rs, callback) {
    logger.info("Loading terms from input file stream.");
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      // logger.info(
      //   `Loading terms from trial with nci_id (${trial.nci_id}).`);
      TermLoader.VALID_TERM_TYPES.forEach((termType) => {
        if (termType === "_diseases") {
          this._loadTermsFromTrialForDiseases(trial);
        } else {
          this._loadTermsFromTrialForTermType(trial, termType);
        }
      });
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      logger.info("Loaded terms from input file stream.");
      this._calcMostFrequentTerm();
      this._dealWithEdgeCases();
      return callback();
    });
  }

  _calcMostFrequentTerm() {
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
          count: termObj["count"],
          codes: termObj["codes"]
        };
      });
    });
  }

  _dealWithEdgeCases() {
    _.forOwn(this["terms"], (termTypeObj, termTypeKey) => {
      _.forOwn(termTypeObj, (termObj, termKey) => {
        let term = termObj["term"];
        // correct for edge cases such as "Non Small Cell..."
        term = term.replace(/Non /g, "Non-");
        // add spacing to "/" chars...
        term = term.replace(/\//g, " / ");
        // remove extra white space
        term = term.replace(/\s\s+/g, ' ');
        // save
        this["terms"][termTypeKey][termKey]["term"] = term;
      });
    });
  }

  _extractTermsUsingPath(trial, path) {
    let termsArr = [];
    let pathArr = path.split(".");

    const _extractTermsRecursive = (obj, pathArr) => {
      if (!obj || !pathArr) { return; }
      let thisObj = obj[pathArr[0]];
      if (!thisObj) { return; }
      if (pathArr.length === 1) {
        if (thisObj instanceof Array) {
          termsArr = termsArr.concat(thisObj);
        } else {
          termsArr.push(thisObj);
        }
      } else {
        let newPathArr = pathArr.slice(1, pathArr.length);
        if (thisObj instanceof Array) {
          thisObj.forEach((o) => {
            _extractTermsRecursive(o, newPathArr);
          });
        } else {
          _extractTermsRecursive(thisObj, newPathArr);
        }
      }
    };

    _extractTermsRecursive(trial, pathArr);

    return termsArr;
  }

  _loadTermsFromTrialForTermType(trial, termType) {
    /*
      Produces this.terms[termType] = {
        term_one: {
          count: 10,
          terms: {
            "Term One": 26,
            "term one": 14
          }
        },
        ...
      }
    */

    let terms = {};
    let termsArr = this._extractTermsUsingPath(trial, termType);
    termsArr = _.chain(termsArr).uniq().compact().value();

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

    if (typeof this.terms[termType] === "undefined") {
      this.terms[termType] = {};
    }
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

  _loadTermsFromTrialForDiseases(trial) {
    /*
      Produces this.terms[termType] = {
        term_one: {
          count: 10,
          terms: {
            "Term One": 26,
            "term one": 14
          },
          codes: ["C12345"]
        },
        ...
      }
    */

    let termType = "_diseases";
    let diseases = {};
    let diseasesArr = this._extractTermsUsingPath(trial, termType);
    // TODO: deal with uniqueness of terms in a trial (might not be a concern,
    //       especially if we aren't dealing with synonyms)
    // diseasesArr = _.chain(diseasesArr).uniq().compact().value();

    diseasesArr.forEach((disease) => {
      let diseaseKey = Utils.transformStringToKey(disease.term);
      if (typeof diseases[diseaseKey] === "undefined") {
        diseases[diseaseKey] = {
          count: 1,
          terms: {},
          codes: []
        };
      }
      diseases[diseaseKey]["codes"] = _.uniq(
        diseases[diseaseKey]["codes"].concat(disease.codes)
      );
      if (typeof diseases[diseaseKey]["terms"][disease.term] === "undefined") {
        diseases[diseaseKey]["terms"][disease.term] = 1;
      } else {
        diseases[diseaseKey]["terms"][disease.term]++;
      }
    });

    if (typeof this.terms[termType] === "undefined") {
      this.terms[termType] = {};
    }
    Object.keys(diseases).forEach((diseaseKey) => {
      if (typeof this.terms[termType][diseaseKey] === "undefined") {
        this.terms[termType][diseaseKey] = {
          count: 0,
          terms: {},
          codes: []
        };
      }
      this.terms[termType][diseaseKey]["codes"] = _.uniq(
        this.terms[termType][diseaseKey]["codes"].concat(diseases[diseaseKey]["codes"])
      );
      this.terms[termType][diseaseKey]["count"] +=
        diseases[diseaseKey]["count"];

      Object.keys(diseases[diseaseKey]["terms"]).forEach((disease) => {
        if (typeof this.terms[termType][diseaseKey]["terms"][disease] === "undefined") {
          this.terms[termType][diseaseKey]["terms"][disease] = 0;
        }
        this.terms[termType][diseaseKey]["terms"][disease] +=
          diseases[diseaseKey]["terms"][disease];
      });
    });
  }

}

module.exports = TermLoader;
