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
        this._loadTermsFromTrialForTermType(trial, termType);
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
          count: termObj["count"]
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
    let termsArr = [];
    let pathArr = termType.split(".");

    const _extractTerms = (obj, pathArr) => {
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
            _extractTerms(o, newPathArr);
          });
        } else {
          _extractTerms(thisObj, newPathArr);
        }
      }
    };
    _extractTerms(trial, pathArr);
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

}

module.exports = TermLoader;
