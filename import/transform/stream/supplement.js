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
        disease.preferred_name = disease.disease_preferred_name;
        disease.display_name =
          this.thesaurusById[disease.nci_thesaurus_concept_id].display_name;
        // NOTE: don't use the disease_menu_display_name, it isn't the
        //       display name that we actually want, use the one from the NCIt
        // disease.display_name = disease.disease_menu_display_name;

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

  _addCurrentTrialStatusSortOrder(trial) {
    if(!trial.current_trial_status) {
      return;
    }

    const sortHash = {
      "closed to accrual and intervention": 6,
      "in review": 2,
      "temporarily closed to accrual and intervention": 5,
      "administratively complete": 8,
      "temporarily closed to accrual": 4,
      "enrolling by invitation": 1,
      "closed to accrual": 7,
      "active": 0,
      "complete": 9,
      "withdrawn": 10,
      "approved": 3
    };

    trial._current_trial_status_sort_order =
      sortHash[trial.current_trial_status.toLowerCase()];
  }

  _addStudyProtocolTypeSortOrder(trial) {
    if(!trial.study_protocol_type) {
      return;
    }

    const sortHash = {
      "interventional": 0,
      "non-interventional": 1
    };

    trial._study_protocol_type_sort_order =
      sortHash[trial.study_protocol_type.toLowerCase()];
  }

  _addPrimaryPurposeCodeSortOrder(trial) {
    if(!trial.primary_purpose || !trial.primary_purpose.primary_purpose_code) {
      return;
    }

    const sortHash = {
      "treatment": 0,
      "supportive_care": 1,
      "screening": 2,
      "prevention": 3,
      "diagnostic": 4,
      "basic_science": 5,
      "health_services_research": 6,
      "other": 7
    }

    trial.primary_purpose._primary_purpose_code_sort_order =
      sortHash[trial.primary_purpose.primary_purpose_code.toLowerCase()];
  }

  _addPhaseSortOrder(trial) {
    if(!trial.phase || !trial.phase.phase) {
      return;
    }

    const sortHash = {
      "O": 5,
      "I": 4,
      "I_II": 3,
      "II": 2,
      "II_III": 1,
      "III": 0,
      "IV": 6,
      "NA": 7
    }

    trial.phase._phase_sort_order =
      sortHash[trial.phase.phase.toLowerCase()];
  }

  _createActiveSitesCount(trial) {
    if(!trial.sites) {
      return;
    }

    trial._active_sites_count = trial.sites.filter((site) => {
      let recruitmentStatus = site.recruitment_status.toLowerCase();
      return recruitmentStatus === "active" ||
        recruitmentStatus === "enrolling_by_invitation";
    }).length;
  }

  _createAgeInYears(trial) {
    if(!trial.eligibility || !trial.eligibility.structured) {
      return;
    }

    const _getAgeInYears = (age, unit) => {
      switch(unit.toLowerCase()) {
        case "years":
          return age;
        case "months":
          return age/12;
        case "days":
          return age/365;
        case "hours":
          return age/365*24;
        default:
          logger.error(`Invalid age unit (${unit}).`);
          return age;
      }
    }

    const _alterAge = (type) => {
      // type = "max" or "min"
      if (trial.eligibility.structured[`${type}_age_unit`]) {
        let ageInYears = _getAgeInYears(
          trial.eligibility.structured[`${type}_age_number`],
          trial.eligibility.structured[`${type}_age_unit`]
        );
        trial.eligibility.structured[`${type}_age_in_years`] = ageInYears;
      }
    }

    _alterAge("max");
    _alterAge("min");
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
    let isStageOrGrade = (
      preferredName.toLowerCase().includes("stage") ||
      preferredName.toLowerCase().includes("grade")
    )
    let isFinding = preferredName.toLowerCase().includes("finding");
    let isStatus = preferredName.toLowerCase().includes("status");
    let isTestResult = preferredName.toLowerCase().includes("test result");
    let isInBlacklist = _.has(this.diseaseBlacklistById, ncitCode);
    let isNonNeoplasmTreeTerm = !isNeoplasm && isTreeTerm;

    let isValidDisease = (
      isTrialTerm || (
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
      )
    );

    return isValidDisease;
  }

  _createDiseases(trial) {
    const _pushOrCreateArr = (arr, value) => {
      if (arr) {
        arr.push(value);
      } else {
        arr = [value];
      }
      return arr;
    };
    if (!trial.diseases) { return; }
    let diseases = {};
    trial.diseases.forEach((disease) => {
      // validate that we should use this disease
      if (this._isValidDiseaseTerm(disease)) {
        let ncitCode = disease.nci_thesaurus_concept_id;
        // add preferred name
        if (disease.preferred_name && disease.preferred_name !== "") {
          diseases[disease.preferred_name] =
            _pushOrCreateArr(
              diseases[disease.preferred_name],
              ncitCode
            );
        }
        // add display name
        let displayName =
          this.thesaurusById[disease.nci_thesaurus_concept_id].display_name;
        if (displayName && displayName !== "") {
          diseases[displayName] =
            _pushOrCreateArr(
              diseases[displayName],
              ncitCode
            );
        }
        // TODO(Balint): consider adding synonyms...
        // disease.synonyms.forEach((synonym) => {
        //   diseases[synonym] = 1;
        // });
      }
    });

    let diseasesArr = [];
    _.forOwn(diseases, (value, key) => {
      diseasesArr.push({
        term: key,
        codes: value
      });
    })

    trial._diseases = diseasesArr;
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
      this._addCurrentTrialStatusSortOrder(trial);
      this._addStudyProtocolTypeSortOrder(trial);
      this._addPrimaryPurposeCodeSortOrder(trial);
      this._addPhaseSortOrder(trial);
      this._createActiveSitesCount(trial);
      this._createAgeInYears(trial);
      this._addThesaurusTerms(trial);
      this._createLocations(trial);
      this._createTreatments(trial);
      this._createDiseases(trial);

      this.push(trial);
    }

    next();
  }

}

module.exports = SupplementStream;
