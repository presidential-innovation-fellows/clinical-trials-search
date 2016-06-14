const params = [{
    "param_key": "diseases.synonyms",
    "display_name": "Disease",
    "filter_type": "suggest",
    "category": "primary"
  }, {
    "param_key": "sites.org.location",
    "display_name": "Location",
    "filter_type": "suggest",
    "category": "primary"
  }, {
    "param_key": "sites.org.name",
    "display_name": "Hospital/Center",
    "filter_type": "suggest",
    "category": "primary"
  }, {
    "param_key": "sites.org.family",
    "display_name": "Network/Organization",
    "filter_type": "suggest",
    "category": "primary"
  }, {
    "param_key": "anatomic_sites",
    "display_name": "Anatomic Site",
    "filter_type": "select",
    "category": "primary"
  }, {
    "param_key": "arms.treatment",
    "display_name": "Treatment",
    "filter_type": "suggest",
    "category": "primary"
  }, {
    "param_key": "arms.intervention_type",
    "display_name": "Treatment Type",
    "filter_type": "select",
    "category": "primary"
  }, {
    "param_key": "acronym",
    "display_name": "Acronym",
    "filter_type": "text",
    "category": "primary"
  }, {
    "param_key": "brief_title",
    "display_name": "Title",
    "filter_type": "text",
    "category": "primary"
  }, {
    "param_key": "current_trial_status",
    "display_name": "Status",
    "filter_type": "select",
    "category": "primary"
  }, {
    "param_key": "eligibility.structured.gender",
    "display_name": "Gender",
    "filter_type": "select",
    "category": "secondary"
  }, {
    "param_key": "eligibility.structured.max_age",
    "display_name": "Max Age",
    "filter_type": "number",
    "category": "secondary"
  }, {
    "param_key": "eligibility.structured.min_age",
    "display_name": "Min Age",
    "filter_type": "number",
    "category": "secondary"
  }, {
    "param_key": "nci_id",
    "display_name": "NCI ID",
    "filter_type": "text",
    "category": "secondary"
  }, {
    "param_key": "nct_id",
    "display_name": "NCT ID",
    "filter_type": "text",
    "category": "secondary"
  }, {
    "param_key": "phase",
    "display_name": "Phase",
    "filter_type": "select",
    "category": "secondary"
  }, {
    "param_key": "date_last_updated_anything",
    "display_name": "Date Updated",
    "filter_type": "date",
    "category": "secondary"
  }, {
    "param_key": "completion_date",
    "display_name": "Date Completed",
    "filter_type": "date",
    "category": "secondary"
  }, {
    "param_key": "start_date",
    "display_name": "Date Started",
    "filter_type": "date",
    "category": "secondary"
  }, {
    "param_key": "_all",
    "display_name": "All Text",
    "filter_type": "text",
    "category": "tertiary"
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

};

export default ValidParams;
