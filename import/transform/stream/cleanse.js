const _                   = require("lodash");
const Transform           = require("stream").Transform;
const Utils               = require("../../../common/utils");
const TermLoader          = require("../../../common/term_loader");
const Logger              = require("../../../common/logger");

let logger = new Logger({ name: "cleanse-stream" });

class CleanseStream extends Transform {

  constructor(terms) {
    super({ objectMode: true });
    this.terms = terms;
  }

  _cleanseTerms(termType, terms) {
    let newTerms = terms.map((term) => {
      if (!term) { return term; }
      return this.terms[termType][Utils.transformStringToKey(term)]["term"];
    });
    return _.uniq(newTerms);
  }

  _transformTrialForTermType(trial, termType) {
    const _transform = (obj, pathArr) => {
      if (!obj || !pathArr) { return null; }
      let newObj = obj[pathArr[0]];
      if (pathArr.length === 1) {
        if (newObj instanceof Array) {
          newObj = this._cleanseTerms(termType, newObj);
        } else {
          newObj = this._cleanseTerms(termType, [newObj])[0];
        }
      } else {
        let newPathArr = pathArr.slice(1, pathArr.length);
        if (newObj instanceof Array) {
          newObj.forEach((o) => {
            _transform(o, newPathArr);
          });
        } else {
          _transform(newObj, newPathArr);
        }
      }
      obj[pathArr[0]] = newObj;
    };
    _transform(trial, termType.split("."));
  }

  _transform(trial, enc, next) {
    logger.info(`Cleansing trial with nci_id (${trial.nci_id}).`);

    TermLoader.VALID_TERM_TYPES.forEach((termType) => {
      this._transformTrialForTermType(trial, termType);
    });

    this.push(trial);
    next();
  }

}

module.exports = CleanseStream;
