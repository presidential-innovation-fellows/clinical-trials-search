SELECT
  json_build_object(
    'nci_id', study.nci_id,
    'nct_id', study.nct_id,
    'brief_title', study.brief_title,
    'official_title', study.official_title,
    'lead_org', study.lead_org,
    'sites', (
      SELECT
        json_agg(
          json_build_object(
            'contact_email', site.contact_email,
            'contact_name', site.contact_name,
            'contact_phone', site.contact_phone,
            'generic_contact', site.generic_contact,
            'org', (
              SELECT
                json_agg(
                  json_build_object(
                    'address_line_1', org.address_line_1,
                    'address_line_2', org.address_line_2,
                    'postal_code', org.postal_code,
                    'city', org.city,
                    'state_or_province', org.state_or_province,
                    'country', org.country,
                    'name', org.name,
                    'status', org.status,
                    'status_date', org.status_date,
                    'email', org.email,
                    'fax', org.fax,
                    'phone', org.phone,
                    'tty', org.tty,
                    'change_request_count', org.change_request_count,
                    'family', org.family,
                    'org_to_family_relationship', org.org_to_family_relationship
                  )
                )
              FROM
                dw_organization org
              WHERE
                site.org_po_id = org.po_id
            ),
            'recruitment_status', site.recruitment_status,
            'recruitment_status_date', site.recruitment_status_date,
            'target_accrual', site.target_accrual,
            'program_code', site.program_code,
            'local_site_identifier', site.local_site_identifier
          )
        )
      FROM
        dw_study_participating_site site
      WHERE
        study.nci_id = site.nci_id
    ),
    'anatomic_sites', (
      SELECT
        json_build_array(
          json_agg(
            anatomic_site.anatomic_site_name
          )
        )
      FROM
        dw_study_anatomic_site anatomic_site
      WHERE
        study.nci_id = anatomic_site.nci_id
    ),
    'diseases', (
      SELECT
        json_agg(
          json_build_object(
            'disease_code', disease.disease_code,
            'disease_preferred_name', disease.disease_preferred_name,
            'disease_menu_display_name', disease.disease_menu_display_name,
            'lead_disease_indicator', disease.lead_disease_indicator,
            'nci_thesaurus_concept_id', disease.nci_thesaurus_concept_id,
            'date_last_created', disease.date_last_created,
            'date_last_updated', disease.date_last_updated
          )
        )
      FROM
        dw_study_disease disease
      WHERE
        study.nci_id = disease.nci_id
    ),
    'biomarkers', (
      SELECT
        json_agg(
          json_build_object(
            'assay_purpose', biomarker.assay_purpose,
            'assay_purpose_description', biomarker.assay_purpose_description,
            'assay_type_code', biomarker.assay_type_code,
            'assay_type_description', biomarker.assay_type_description,
            'assay_use', biomarker.assay_use,
            'long_name', biomarker.long_name,
            'name', biomarker.name,
            'status_code', biomarker.status_code,
            'tissue_collection_method_code', biomarker.tissue_collection_method_code,
            'tissue_specimen_type_code', biomarker.tissue_specimen_type_code,
            'hugo_biomarker_code', biomarker.hugo_biomarker_code,
            'evaluation_type_code', biomarker.evaluation_type_code,
            'evaluation_type_other_text', biomarker.evaluation_type_other_text,
            'specimen_type_other_text', biomarker.specimen_type_other_text
          )
        )
      FROM
        dw_study_biomarker biomarker
      WHERE
        study.nci_id = biomarker.nci_id
    ),
    'accruals', (
      SELECT
        json_agg(
          json_build_object(
            'accrual_count', accrual.accrual_count,
            'count_type', accrual.count_type,
            'org_name', accrual.org_name,
            'org_org_family', accrual.org_org_family
          )
        )
      FROM
        dw_study_accrual_count accrual
      WHERE
        study.nci_id = accrual.nci_id
    ),
    'eligibility', (
      json_build_object(
        'gender', study.eligible_gender,
        'max_age', study.eligible_max_age,
        'max_age_number', study.eligible_max_age_number,
        'max_age_unit', study.eligible_max_age_unit,
        'min_age', study.eligible_min_age,
        'min_age_number', study.eligible_min_age_number,
        'min_age_unit', study.eligible_min_age_unit
      )
    ),
    'irb', (
      json_build_object(
        'irb_approval_number', study.irb_approval_number,
        'irb_approval_status', study.irb_approval_status,
        'irb_city', study.irb_city,
        'irb_country', study.irb_country,
        'irb_email', study.irb_email,
        'irb_name', study.irb_name,
        'irb_organization_affiliation', study.irb_organization_affiliation,
        'irb_phone', study.irb_phone,
        'irb_state_or_province', study.irb_state_or_province,
        'irb_street_address', study.irb_street_address,
        'irb_zip_code', study.irb_zip_code
      )
    ),
    'phase', study.phase,
    'sponsor', (
      json_build_object(
        'sponsor', study.sponsor,
        'responsible_party_name', study.responsible_party_name,
        'sponsor_org_family', study.sponsor_org_family,
        'sponsor_resp_party_email', study.sponsor_resp_party_email,
        'sponsor_resp_party_phone', study.sponsor_resp_party_phone
      )
    ),
    'start_date', study.start_date,
    'funding', study.summary_4_funding_category
  ) as trial_json_object
FROM
  dw_study study
WHERE
  lower(current_trial_status) = 'active' AND
  lower(processing_status) LIKE 'abstraction verified%';
