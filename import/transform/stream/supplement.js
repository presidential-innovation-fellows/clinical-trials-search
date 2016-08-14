const _                   = require("lodash");
const moment              = require("moment");
const Transform           = require("stream").Transform;
const Logger              = require("../../../common/logger");

let logger = new Logger({ name: "supplement-stream" });

/**
 * Supplements trials by adding appropriate NCIt values and other terms
 *
 * @class TransformStream
 * @extends {Transform}
 */
class SupplementStream extends Transform {

  _createThesaurusLookups(thesaurus) {
    let thesaurusById = {};
    let thesaurusByName = {};
    thesaurus.forEach((row) => {
      if (row.code) {
        thesaurusById[row.code] = row;
      }
      if (row.synonyms && row.synonyms.length) {
        let name = row.synonyms.split("|")[0];
        thesaurusByName[name] = row;
      }
    });
    this.thesaurusById = thesaurusById;
    this.thesaurusByName = thesaurusByName;
  }

  _createNeoplasmCoreLookup(neoplasmCore) {
    let neoplasmCoreById = {};
    neoplasmCore.forEach((row) => {
      if (row.code) {
        neoplasmCoreById[row.code] = 1;
      }
    });
    this.neoplasmCoreById = neoplasmCoreById;
  }

  _createDiseaseBlacklistLookup(diseaseBlacklist) {
    let diseaseBlacklistById = {};
    diseaseBlacklist.forEach((row) => {
      if (row.code) {
        diseaseBlacklistById[row.code] = 1;
      }
    });
    this.diseaseBlacklistById = diseaseBlacklistById;
  }

  constructor(thesaurus, neoplasmCore, diseaseBlacklist) {
    super({ objectMode: true });

    this._createThesaurusLookups(thesaurus);
    this._createNeoplasmCoreLookup(neoplasmCore);
    this._createDiseaseBlacklistLookup(diseaseBlacklist);
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
        // flatten org into site
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
    // TODO: add tree members (similar to disease)
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

  _isValidDiseaseTerm(disease) {
    let _isNeoplasmLookup = {};
    const _isNeoplasm = (ncitCode) => {
      // short circuits if we already traversed this code
      if (_.has(_isNeoplasmLookup, ncitCode)) {
        return _isNeoplasmLookup[ncitCode];
      }
      // (recursive)
      // NOTE: C3262 is the code for the Neoplasm ancestor
      if (ncitCode === "C3262") {
        _isNeoplasmLookup[ncitCode] = true; // store for efficiency
        return true;
      } else {
        let disease = this.thesaurusById[ncitCode];
        if (disease && disease.parents) {
          let parents = disease.parents.split("|");
          if (parents.length > 0) {
            let neoplasmParents = parents.filter((parent) => {
              return _isNeoplasm(parent);
            });

            // store for efficiency
            _isNeoplasmLookup[ncitCode] = neoplasmParents.length > 0;
            return neoplasmParents.length > 0;
          }
        }

        _isNeoplasmLookup[ncitCode] = false; // store for efficiency
        return false;
      }
    };

    let ncitCode = disease.nci_thesaurus_concept_id;
    let preferredName = disease.preferred_name
    let isNeoplasm = _isNeoplasm(ncitCode);
    let isInNeoplasmCore = _.has(this.neoplasmCoreById, ncitCode);
    let isTrialTerm = disease.inclusion_indicator.toLowerCase() === "trial";
    let isTreeTerm = !isTrialTerm;
    let isStageOrGrade =
      ( preferredName.toLowerCase().includes("stage") ||
        preferredName.toLowerCase().includes("grade")
      ) && !preferredName.toLowerCase().includes("ajcc_v");
    let isFinding = preferredName.toLowerCase().includes("finding");
    let isStatus = preferredName.toLowerCase().includes("status");
    let isTestResult = preferredName.toLowerCase().includes("test result");
    let isInBlacklist = _.has(this.diseaseBlacklistById, ncitCode);
    let isNonNeoplasmTreeTerm = !isNeoplasm && isTreeTerm;

    let isValidDisease = (
      (
        isInNeoplasmCore ||
        !isNeoplasm ||
        (isNeoplasm && isStageOrGrade)
      ) &&
      !isNonNeoplasmTreeTerm &&
      !isFinding &&
      !isStatus &&
      !isTestResult &&
      !isInBlacklist
    );

    return isValidDisease;
  }

  _createDiseases(trial) {
    if (!trial.diseases) { return; }
    let diseases = {};
    trial.diseases.forEach((disease) => {
      // validate that we should use this disease
      if (this._isValidDiseaseTerm(disease)) {
        diseases[disease.disease_preferred_name] = 1;
        // TODO(Balint): add display term when NCIt export is updated...
        // diseases[this.thesaurusById[disease.disease_code].display_name] = 1;
        // TODO(Balint): consider adding synonyms...
        // disease.synonyms.forEach((synonym) => {
        //   diseases[synonym] = 1;
        // });
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

      this._modifyStructure(trial);
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

module.exports = SupplementStream;
