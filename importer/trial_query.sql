SELECT
  json_build_object(
    'nci_id',
    s.nci_id,
    'nct_id',
    s.nct_id,
    'brief_title',
    s.brief_title,
    'official_title',
    s.official_title,
    'diseases',
    (
      SELECT
        json_agg(
          json_build_object(
            'disease_code',
            d.disease_code,
            'disease_preferred_name',
            d.disease_preferred_name,
            'nci_thesaurus_concept_id',
            d.nci_thesaurus_concept_id,
            'date_last_created',
            d.date_last_created,
            'date_last_updated',
            d.date_last_updated
          )
        )
      FROM
        dw_study_disease d
      WHERE
        s.nci_id = d.nci_id
    )
  ) as trial_json_object
FROM
  dw_study s
WHERE
  lower(current_trial_status) = 'active' AND
  lower(processing_status) LIKE 'abstraction verified%';
