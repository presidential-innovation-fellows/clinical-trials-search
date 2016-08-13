const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const moment              = require("moment");
const babyparse           = require("babyparse");
const byline              = require('byline');
const JSONStream          = require("JSONStream");
const Transform           = require("stream").Transform;

const Utils               = require("../../common/utils");
const TermLoader          = require("../../common/term_loader");
const Logger              = require("../../common/logger");

const ZIP_CODES           = require("../../data/zip_codes.json");

let logger = new Logger({ name: "import-transform" });

const THESAURUS_FILEPATH = "../../data/nci_thesaurus.txt";
const TRIALS_FILEPATH = "../../data/trials.out";
const TRIALS_KOSHER_CHARS_FILEPATH = "../../data/trials_kosher_chars.txt";
const TRIALS_TRANSFORMED_FILEPATH = "../../data/trials_transformed.json";
const TRIALS_CLEANSED_FILEPATH = "../../data/trials_cleansed.json";

/**
 * Removes special characters from file so that other streams can function
 * properly.
 *
 * @class SpecialCharsStream
 * @extends {Transform}
 */
class SpecialCharsStream extends Transform {

  _transform(buffer, enc, next) {
    let bufferString = buffer.toString();
    let kosherString = bufferString.replace(/\u2028/g, "")
      .replace(/\u2029/g, "");

    this.push(kosherString);
    next();
  }

}

/**
 * Transforms trials by adding appropriate NCIt values and other terms
 *
 * @class TransformStream
 * @extends {Transform}
 */
class TransformStream extends Transform {

  constructor(thesaurus) {
    super({ objectMode: true });

    let thesaurusById = {};
    let thesaurusByName = {};
    thesaurus.forEach((row) => {
      if (row.code) {
        thesaurusById[row.code] = row;
      }
      if (row.synonyms) {
        let name = row.synonyms.split("|")[0];
        thesaurusByName[name] = row;
      }
    });
    this.thesaurusById = thesaurusById;
    this.thesaurusByName = thesaurusByName;
  }

  _addThesaurusTerms(trial) {
    if (trial.diseases) {
      trial.diseases.forEach((disease) => {
        let diseaseId = disease.nci_thesaurus_concept_id;
        if (diseaseId && this.thesaurusById[diseaseId]) {
          if (this.thesaurusById[diseaseId].parents) {
            disease.parents = this.thesaurusById[diseaseId].parents.split("|");
          }
          if (this.thesaurusById[diseaseId].synonyms) {
            disease.synonyms = this.thesaurusById[diseaseId].synonyms.split("|");
          }
        }
      });
    }

    if (trial.arms) {
      trial.arms.forEach((arm) => {
        arm.interventions.forEach((intervention) => {
          // TODO: retrieve by id (likely have to modify data warehouse)
          if (this.thesaurusByName[intervention.intervention_name]) {
            intervention.synonyms =
              this.thesaurusByName[intervention.intervention_name].synonyms.split("|");
          }
        });
      });
    }
  }

  _modifyStructure(trial) {
    if (trial.diseases) {
      trial.diseases.forEach((disease) => {
        disease.display_name = disease.disease_menu_display_name;
        disease.preferred_name = disease.disease_preferred_name;

        delete disease.disease_menu_display_name;
        delete disease.disease_preferred_name;
      });
    }

    if (trial.sites) {
      trial.sites.forEach((site) => {
        if (site.org) {
          site.org_address_line_1 = site.org.address_line_1;
          site.org_address_line_2 = site.org.address_line_2;
          site.org_city = site.org.city;
          site.org_country = site.org.country;
          site.org_email = site.org.email;
          site.org_family = site.org.family;
          site.org_fax = site.org.fax;
          site.org_name = site.org.name;
          site.org_to_family_relationship = site.org.org_to_family_relationship;
          site.org_phone = site.org.phone;
          site.org_postal_code = site.org.postal_code;
          site.org_state_or_province = site.org.state_or_province;
          site.org_status = site.org.status;
          site.org_status_date = site.org.status_date;
          site.org_tty = site.org.tty;

          delete site.org;
        }
      });
    }
  }

  _createLocations(trial) {
    if (!trial.sites) { return; }
    let locations = {};
    trial.sites.forEach((site) => {
      let location = _.compact([
        site.org_city,
        site.org_state_or_province,
        site.org_country
      ]).join(", ");
      if (location) {
        locations[location] = 1;
      }
    });
    trial._locations = Object.keys(locations);
  }

  _createTreatments(trial) {
    if (!trial.arms) { return; }
    let treatments = {};
    trial.arms.forEach((arm) => {
      arm.interventions.forEach((intervention) => {
        let treatment = intervention.intervention_name;
        if (treatment) {
          if (intervention.intervention_type) {
            treatment += ` (${intervention.intervention_type})`;
          }
          treatments[treatment] = 1;
        }
      });
    });
    trial._treatments = Object.keys(treatments);
  }

  _createDiseases(trial) {
    if (!trial.diseases) { return; }
    let diseases = {};
    trial.diseases.forEach((disease) => {
      diseases[disease.disease_menu_display_name] = 1;
      if (disease.synonyms) {
        disease.synonyms.forEach((synonym) => {
          diseases[synonym] = 1;
        });
      }
    });
    trial._diseases = Object.keys(diseases);
  }

  // looks through all date fields, finds the latest one and uses that
  // for the "date_last_updated_anything" field
  _addDateLastUpdatedAnythingField(trial) {
    let updateDates = [];

    const _addDateToArr = (stringDate) => {
      let momentDate = moment(stringDate);
      if (stringDate && momentDate.isValid()) updateDates.push(momentDate);
    }

    [
      trial.amendment_date, trial.current_trial_status_date,
      trial.date_last_created, trial.date_last_updated
    ].forEach(_addDateToArr);

    if (trial.diseases) {
      trial.diseases.forEach((disease) => {
        if (disease.disease) {
          let d = disease.disease;
          [d.date_last_created, d.date_last_updated].forEach(_addDateToArr);
        }
      });
    }

    if (trial.sites) {
      trial.sites.forEach((site) => {
        _addDateToArr(site.recruitment_status_date);
        _addDateToArr(site.org_status_date);
      });
    }

    let updatedDate = moment.max(updateDates);

    trial.date_last_updated_anything = updatedDate.utc().format("YYYY-MM-DD");
  }

  _transform(buffer, enc, next) {

    let line = buffer.toString();
    if (line.slice(0, 2) === " {") {
      var trial;
      try {
        trial = JSON.parse(line);
      } catch (err) {
        // TODO: send this as an alert email/sms
        // logger.error("Could not parse trial: " + line);
        logger.error(err);
        return next();
      }

      logger.info(`Transforming trial with nci_id (${trial.nci_id})...`);

      this._addThesaurusTerms(trial);
      this._createLocations(trial);
      this._createTreatments(trial);
      this._createDiseases(trial);
      this._addDateLastUpdatedAnythingField(trial);

      this.push(trial);
    }

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
        if (site && site.postal_code) {
          let geopoint = ZIP_CODES[site.postal_code];
          if (geopoint) {
            site.coordinates = geopoint;
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

  _removeSpecialChars(callback) {
    logger.info(`Removing special chars from ${TRIALS_FILEPATH}...`);
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_FILEPATH));
    let ss = new SpecialCharsStream();
    let ws = fs.createWriteStream(TRIALS_KOSHER_CHARS_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ss)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  _loadThesaurus(callback) {
    logger.info("Loading NCI Thesaurus...");
    // let rs = fs.createReadStream(path.join(__dirname, THESAURUS_FILEPATH));
    // babyparse.parse(rs);
    babyparse.parseFiles(THESAURUS_FILEPATH, {
      header: true,
      complete: (results) => {
        this.thesaurus = results.data
        return callback();
      },
      error: (err) => {
        return callback(err);
      }
    });
  }

  _transformTrials(callback) {
    logger.info("Adding Thesaurus terms to trials...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_KOSHER_CHARS_FILEPATH));
    let ls = byline.createStream();
    let ts = new TransformStream(this.thesaurus);
    let gs = new GeoCodingStream();
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_TRANSFORMED_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ls)
      .on("error", (err) => { logger.error(err); })
      .pipe(ts)
      .on("error", (err) => { logger.error(err); })
      .pipe(gs)
      .on("error", (err) => { logger.error(err); })
      .pipe(jw)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  _loadTerms(callback) {
    logger.info("Loading terms...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_TRANSFORMED_FILEPATH));
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
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_TRANSFORMED_FILEPATH));
    let js = JSONStream.parse("*");
    let cs = new CleanseStream(this.terms);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_CLEANSED_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(js)
      .on("error", (err) => { logger.error(err); })
      .pipe(cs)
      .on("error", (err) => { logger.error(err); })
      .pipe(jw)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  static cleanse() {
    logger.info("Started transforming trials.json.");
    let trialsTransformer = new this();
    async.waterfall([
      (next) => { trialsTransformer._removeSpecialChars(next); },
      (next) => { trialsTransformer._loadThesaurus(next); },
      (next) => { trialsTransformer._transformTrials(next); },
      (next) => { trialsTransformer._loadTerms(next); },
      (next) => { trialsTransformer._cleanseTrials(next); }
    ], (err) => {
      if (err) { logger.error(err); }

      logger.info("Finished transforming trials.json.");
    });
  }

}

TrialsTransformer.cleanse();
