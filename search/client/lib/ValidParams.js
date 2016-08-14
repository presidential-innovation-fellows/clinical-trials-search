const params = [
  {
    "param_key": "_diseases",
    "display_name": "Disease",
    "filter_type": "suggest",
    "category": "get started"
  }, {
    "param_key": "_locations",
    "display_name": "Location",
    "filter_type": "suggest",
    "category": "get started"
  }, {
    "param_key": "sites.org_family",
    "display_name": "Network/Organization",
    "filter_type": "suggest",
    "category": "get started"
  }, {
    "param_key": "eligibility.structured.gender",
    "display_name": "Gender",
    "filter_type": "gender",
    "category": "get started"
  }, {
    "param_key": "sites.org_name",
    "display_name": "Hospital/Center",
    "filter_type": "suggest",
    "category": "organization"
  }, {
    "param_key": "_treatments",
    "display_name": "Treatment",
    "filter_type": "suggest",
    "category": "treatment"
  }, {
    "param_key": "arms.interventions.intervention_type",
    "display_name": "Treatment Type",
    "filter_type": "select",
    "category": "treatment"
  }, {
    "param_key": "acronym",
    "display_name": "Acronym",
    "filter_type": "text",
    "category": "advanced"
  }, {
    "param_key": "brief_title",
    "display_name": "Brief Title",
    "filter_type": "text",
    "category": "advanced"
  }, {
    "param_key": "official_title",
    "display_name": "Official Title",
    "filter_type": "text",
    "category": "advanced"
  }, {
    "param_key": "current_trial_status",
    "display_name": "Status",
    "filter_type": "select",
    "category": "advanced"
  }, {
    "param_key": "eligibility.structured.max_age_number",
    "display_name": "Max Age",
    "filter_type": "number",
    "category": "get started"
  }, {
    "param_key": "eligibility.structured.min_age_number",
    "display_name": "Min Age",
    "filter_type": "number",
    "category": "get started"
  }, {
    "param_key": "nci_id",
    "display_name": "NCI ID",
    "filter_type": "text",
    "category": "advanced"
  }, {
    "param_key": "nct_id",
    "display_name": "NCT ID",
    "filter_type": "text",
    "category": "advanced"
  }, {
    "param_key": "phase.phase",
    "display_name": "Phase",
    "filter_type": "select",
    "category": "advanced"
  }, {
  //   "param_key": "date_last_updated_anything",
  //   "display_name": "Date Updated",
  //   "filter_type": "date",
  //   "category": "advanced"
  // }, {
  //   "param_key": "completion_date",
  //   "display_name": "Date Completed",
  //   "filter_type": "date",
  //   "category": "advanced"
  // }, {
  //   "param_key": "start_date",
  //   "display_name": "Date Started",
  //   "filter_type": "date",
  //   "category": "advanced"
  // }, {
    "param_key": "anatomic_sites",
    "display_name": "Anatomic Site",
    "filter_type": "select",
    "category": "advanced"
  }, {
    "param_key": "_all",
    "display_name": "All Text",
    "filter_type": "text",
    "category": "advanced"
  }
];

class ValidParams {

  static getParamsByCategory() {
    let paramsByCategory = {};
    params.forEach((param) => {
      if (!paramsByCategory[param["category"]]) {
        paramsByCategory[param["category"]] = {};
      }
      paramsByCategory[param["category"]][param["param_key"]] = {
        display_name: param.display_name,
        filter_type: param.filter_type
      };
    });
    return paramsByCategory;
  }

  static getParamsByKey() {
    let paramsByKey = {};
    params.forEach((param) => {
      if (!paramsByKey[param["param_key"]]) {
        paramsByKey[param["param_key"]] = {};
      }
      paramsByKey[param["param_key"]] = {
        display_name: param.display_name,
        filter_type: param.filter_type,
        category: param.category
      };
    });
    return paramsByKey;
  }

};

export default ValidParams;
