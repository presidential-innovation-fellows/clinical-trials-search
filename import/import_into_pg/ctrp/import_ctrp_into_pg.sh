#!/bin/sh

# TODO: come up with a less hacky solution

# remove the backup db
dropdb ctrp-data-warehouse-backup --if-exists

# copy the existing db to the backup
createdb -T ctrp-data-warehouse ctrp-data-warehouse-backup

# remove the existing db and recreate it
dropdb ctrp-data-warehouse --if-exists
createdb ctrp-data-warehouse

# import the nci thesaurus
cd ../nci_thesaurus && ./import_nci_thesaurus_into_pg.sh

# import the new data
psql -d ctrp-data-warehouse -f ../../../data/DW2.sql

# create an extra index for the nci_thesaurus id lookup
psql -d ctrp-data-warehouse -c 'CREATE INDEX dw_study_disease_nci_thesaurus_concept_id ON "public"."dw_study_disease"(nci_thesaurus_concept_id)'
