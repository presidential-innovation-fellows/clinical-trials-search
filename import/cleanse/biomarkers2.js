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

let foundCount = 0;
let totalCount = 0;

class CleanseStream extends Transform {

  constructor() {
    super({objectMode: true});
  }

  _getMoreBiomarkerSynonyms(biomarkerName) {
    const moreSynonyms = require("./biomarkers_more_synonyms.json");

    return moreSynonyms[biomarkerName];
  }

  _transform(trial, enc, next) {
    logger.info(`Processing trial with nci_id (${trial.nci_id}).`);

    if (!trial.biomarkers) {
      return next();
    }

    let biomarkers = trial.biomarkers.filter((biomarker) => {
      return biomarker.assay_use === 'Integral' &&
             biomarker.assay_purpose.includes('Eligibility Criterion')
    });

    if (biomarkers && biomarkers.length) {

      biomarkers.forEach((biomarker) => {
        let biomarkerNames = [biomarker.name];
        let moreBiomarkerSynonyms = this._getMoreBiomarkerSynonyms(biomarker.name);
        if (moreBiomarkerSynonyms) {
          biomarkerNames = biomarkerNames.concat(moreBiomarkerSynonyms);
        }
        if (biomarker.synonyms) {
          biomarkerNames = biomarkerNames.concat(biomarker.synonyms);
        }

        let result = {
          biomarker: biomarker.name,
          assay_purpose: biomarker.assay_purpose,
          assay_use: biomarker.assay_use,
          biomarkers_found: [],
          relevant_eligibility_text: []
        };
        biomarkerNames.forEach((biomarkerName) => {
          trial.eligibility.unstructured.forEach((eligibility) => {
            if (eligibility.description.includes(biomarkerName)) {
              result.biomarkers_found.push(biomarkerName);
              result.relevant_eligibility_text.push(eligibility.description);
            }
          });
        });

        if (result.biomarkers_found.length > 0) {
          this.push({
            nci_id: trial.nci_id,
            trial_status: trial.status,
            biomarker: result.biomarker,
            biomarkers_found: result.biomarkers_found.join("; "),
            relevant_eligibility_text: result.relevant_eligibility_text.join("; "),
            assay_purpose: result.assay_purpose,
            assay_use: result.assay_use
          });
        }
      });
    }

    next();
  }

}

class TrialsCleanser {

  _processCleansedTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");
    let cs = new CleanseStream();
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream("../../data/biomarker_results.csv");

    rs.pipe(js).pipe(cs).pipe(jw).pipe(ws).on("finish", callback);
  }

  static cleanse() {
    logger.info("Started cleansing trials.json.");
    let trialsCleanser = new this();
    async.waterfall([
      (next) => { trialsCleanser._processCleansedTrialsJsonFile(next); }
    ], (err) => {
      if (err) { logger.error(err); }

      logger.info(`Found ${foundCount}/${totalCount} biomarkers.`);
      logger.info("Finished cleansing trials.json.");
    });
  }

}

TrialsCleanser.cleanse();
