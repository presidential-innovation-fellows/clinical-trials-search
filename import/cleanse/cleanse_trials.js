const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");
const Transform           = require("stream").Transform;

const Utils               = require("../../common/utils");
const TermLoader          = require("../../common/term_loader");
const Logger              = require("../../common/logger");

let logger = new Logger({name: "export-cleanser"});

const TRIALS_FILEPATH = path.join(__dirname,
  '../../data/trials.json');

class CleanseStream extends Transform {

  constructor(terms) {
    super({objectMode: true});
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

class TrialsCleanser {

  constructor() {
    this.terms = {};
  }

  _loadTermsFromTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let termLoader = new TermLoader();
    termLoader.loadTermsFromTrialsJsonReadStream(rs, (err) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      this.terms = termLoader.terms;

      return callback();
    });
  }

  _processCleansedTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");
    let cs = new CleanseStream(this.terms);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream("../../data/trials_cleansed.json");

    rs.pipe(js).pipe(cs).pipe(jw).pipe(ws).on("finish", callback);
  }

  static cleanse() {
    logger.info("Started cleansing trials.json.");
    let trialsCleanser = new this();
    async.waterfall([
      (next) => { trialsCleanser._loadTermsFromTrialsJsonFile(next); },
      (next) => { trialsCleanser._processCleansedTrialsJsonFile(next); }
    ], (err) => {
      if (err) { logger.error(err); }
      logger.info("Finished cleansing trials.json.");
    });
  }

}

TrialsCleanser.cleanse();
