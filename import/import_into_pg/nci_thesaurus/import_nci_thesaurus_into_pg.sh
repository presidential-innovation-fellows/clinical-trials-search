# don't forget to add header to nci_thesaurus.csv...
# code  concept_name  parents synonyms  definition
# insert the table
csvsql --insert ../../../data/nci_thesaurus.csv -t --db postgresql://localhost:5432/ctrp-data-warehouse
# create the index
psql -d ctrp-data-warehouse -c 'CREATE INDEX nci_thesaurus_code ON "public"."nci_thesaurus"(code)'

# create the relationships table
psql -d ctrp-data-warehouse -c "CREATE TABLE nci_thesaurus_relationships AS SELECT code as child, unnest(string_to_array(parents, '|')) as parent FROM nci_thesaurus;"
# create the indices
psql -d ctrp-data-warehouse -c 'CREATE INDEX nci_thesaurus_child ON "public"."nci_thesaurus_relationships"(child)'
psql -d ctrp-data-warehouse -c 'CREATE INDEX nci_thesaurus_parent ON "public"."nci_thesaurus_relationships"(parent)'
