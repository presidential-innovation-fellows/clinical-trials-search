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

let missingBiomarkers = {};
let foundBiomarkers = {};

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
      let result = {
        nci_id: trial.nci_id,
        biomarkers: []
      };

      biomarkers.forEach((biomarker) => {
        let biomarkerResult = {
          name: biomarker.name,
          status: "not found"
        };
        let biomarkerNames = [biomarker.name];
        let moreBiomarkerSynonyms = this._getMoreBiomarkerSynonyms(biomarker.name);
        if (moreBiomarkerSynonyms) {
          biomarkerNames = biomarkerNames.concat(moreBiomarkerSynonyms);
        }
        if (biomarker.synonyms) {
          biomarkerNames = biomarkerNames.concat(biomarker.synonyms);
        }

        biomarkerNames.forEach((biomarkerName) => {
          trial.eligibility.unstructured.forEach((eligibility) => {
            if (eligibility.description.includes(biomarkerName)) {
              biomarkerResult.status = "found";
              let foundData = {
                matched_biomarker_term: biomarkerName,
                matched_eligibility_description: eligibility.description
              };
              if (!biomarkerResult.found_data) {
                biomarkerResult.found_data = [foundData];
              } else {
                biomarkerResult.found_data.push(foundData);
              }
            }
          });
        });

        if (biomarkerResult.status === "found") {
          foundCount++;
          if (foundBiomarkers[biomarker.name]) {
            foundBiomarkers[biomarker.name]++;
          } else {
            foundBiomarkers[biomarker.name] = 1;
          }
        } else {
          if (missingBiomarkers[biomarker.name]) {
            missingBiomarkers[biomarker.name]++;
          } else {
            missingBiomarkers[biomarker.name] = 1;
          }
          biomarkerResult.debug_data = {
            biomarker_terms: biomarkerNames,
            eligibility_text: trial.eligibility.unstructured.map((eligibility) => {
              return eligibility.description;
            })
          };
        }
        totalCount++;

        result.biomarkers.push(biomarkerResult);
      });

      this.push(result);
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
    let ws = fs.createWriteStream("../../data/biomarker_results.json");

    rs.pipe(js).pipe(cs).pipe(jw).pipe(ws).on("finish", callback);
  }

  static cleanse() {
    logger.info("Started cleansing trials.json.");
    let trialsCleanser = new this();
    async.waterfall([
      (next) => { trialsCleanser._processCleansedTrialsJsonFile(next); }
    ], (err) => {
      if (err) { logger.error(err); }

      let missingBiomarkersArr = _.map(missingBiomarkers, function(value, key){
        return { biomarker: key, value: value };
      }).sort((a, b) => { return b.value - a.value; });
      logger.info(`Missing biomarkers...`, missingBiomarkersArr);

      let foundBiomarkersArr = _.map(foundBiomarkers, function(value, key){
        return { biomarker: key, value: value };
      }).sort((a, b) => { return b.value - a.value; });
      logger.info(`Found biomarkers...`, foundBiomarkersArr);

      logger.info(`Found ${foundCount}/${totalCount} biomarkers.`);
      logger.info("Finished cleansing trials.json.");
    });
  }

}

TrialsCleanser.cleanse();
