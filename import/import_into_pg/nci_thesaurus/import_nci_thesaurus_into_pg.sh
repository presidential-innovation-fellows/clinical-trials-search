# don't forget to add header to nci_thesaurus.csv...
# code  concept_name  parents synonyms  definition

# insert the table
csvsql --insert ../../../data/nci_thesaurus.csv -t --db postgresql://localhost:5432/ctrp-data-warehouse
# create the index
psql -d ctrp-data-warehouse -c 'CREATE INDEX nci_thesaurus_code ON "public"."nci_thesaurus"(code)'
