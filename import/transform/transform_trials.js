const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const babyparse           = require("babyparse");
const JSONStream          = require("JSONStream");
const Transform           = require("stream").Transform;

const Utils               = require("../../common/utils");
const TermLoader          = require("../../common/term_loader");
const Logger              = require("../../common/logger");

const ZIP_CODES           = require("../../data/zip_codes.json");

let logger = new Logger({ name: "import-transform" });

const THESAURUS_FILEPATH = "../../data/nci_thesaurus.txt";
const TRIALS_FILEPATH = "../../data/trials.json";
const TRIALS_WITH_THESAURUS_TERMS_FILEPATH = "../../data/trials_with_thesaurus_terms.json";
const TRIALS_TRANSFORMED_FILEPATH = "../../data/trials_transformed.json";

// TODO(Balint): Need error logging for all streams!

/**
 * Thesaurus Transformer for adding NCI Thesaurus terms to trials
 *
 * @class ThesaurusStream
 * @extends {Transform}
 */
class ThesaurusStream extends Transform {

  constructor(thesaurus) {
    super({ objectMode: true });
    this.thesaurus = thesaurus;
  }

  _transform(trial, enc, next) {
    logger.info(`Adding NCI Thesaurus terms to trial with nci_id (${trial.nci_id}).`);

    if (trial.diseases) {
      trial.diseases.forEach((disease) => {
        let diseaseId = disease.nci_thesaurus_concept_id;
        if (diseaseId && this.thesaurus[diseaseId]) {
          if (this.thesaurus[diseaseId].parents) {
            disease.parents = this.thesaurus[diseaseId].parents.split("|");
          }
          if (this.thesaurus[diseaseId].synonyms) {
            disease.synonyms = this.thesaurus[diseaseId].synonyms.split("|");
          }
        }
      });
    }

    this.push(trial);
    next();
  }

}

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

/**
 * Stream Transformer for geocoding trial study sites.
 * (Currently uses a basic zip_code => lat/lon map file for geocoding)
 *
 * @class GeoCodingStream
 * @extends {Transform}
 */
class GeoCodingStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  _transform(trial, enc, next) {
    logger.info(`Geocoding trial with nci_id (${trial.nci_id}).`);

    if (trial.sites) {
      trial.sites.forEach((site) => {
        let org = site.org;

        if (org && org.postal_code) {
          let geopoint = ZIP_CODES[org.postal_code];
          if (geopoint) {
            org.coordinates = geopoint;
          }
        }
      });
    }

    this.push(trial);
    next();
  }

}

class TrialsTransformer {

  constructor() {
    this.terms = {};
  }

  _loadThesaurus(callback) {
    logger.info("Loading NCI Thesaurus...");
    // let rs = fs.createReadStream(path.join(__dirname, THESAURUS_FILEPATH));
    // babyparse.parse(rs);
    babyparse.parseFiles(THESAURUS_FILEPATH, {
      header: true,
      complete: (results) => {
        let thesaurus = {}
        results.data.forEach((row) => {
          thesaurus[row.code] = row;
        });
        this.thesaurus = thesaurus;

        return callback();
      },
      error: (err) => {
        return callback(err);
      }
    });
  }

  _addThesaurusTermsToTrials(callback) {
    logger.info("Adding Thesaurus terms to trials...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_FILEPATH));
    let js = JSONStream.parse("*");
    let cs = new ThesaurusStream(this.thesaurus);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_WITH_THESAURUS_TERMS_FILEPATH);

    rs.pipe(js).pipe(cs).pipe(jw).pipe(ws).on("finish", callback);
  }

  _loadTerms(callback) {
    logger.info("Loading terms...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_WITH_THESAURUS_TERMS_FILEPATH));
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

  _cleanseTrials(callback) {
    logger.info("Cleansing trials...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_WITH_THESAURUS_TERMS_FILEPATH));
    let js = JSONStream.parse("*");
    let cs = new CleanseStream(this.terms);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_TRANSFORMED_FILEPATH);

    rs.pipe(js).pipe(cs).pipe(gs).pipe(jw).pipe(ws).on("finish", callback);
  }

  static cleanse() {
    logger.info("Started transforming trials.json.");
    let trialsTransformer = new this();
    async.waterfall([
      (next) => { trialsTransformer._loadThesaurus(next); },
      (next) => { trialsTransformer._addThesaurusTermsToTrials(next); },
      (next) => { trialsTransformer._loadTerms(next); },
      (next) => { trialsTransformer._cleanseTrials(next); }
    ], (err) => {
      if (err) { logger.error(err); }

      logger.info("Finished transforming trials.json.");
    });
  }

}

TrialsTransformer.cleanse();
