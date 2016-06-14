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
