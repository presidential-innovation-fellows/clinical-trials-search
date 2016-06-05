SELECT
  json_build_object(
    'code', code,
    'concept_name', concept_name,
    'parents', parents,
    'synonyms', synonyms,
    'definition', definition
  ) as thesaurus_json_object
FROM
  nci_thesaurus;
