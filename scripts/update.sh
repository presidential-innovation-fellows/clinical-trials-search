#!/bin/sh
set -e

# start postgres
cd pg
./start_postgres.sh
cd ../..

# download and import ctrp data warehouse drop
cd import/import_into_pg/ctrp
./download_ctrp.sh
./import_ctrp_into_pg.sh
cd ../../..

# export the trials from pg
cd import/export_from_pg
npm run export-trials
cd ../..

# cleanse trials
cd import/cleanse
npm run cleanse-trials
cd ../..

# index trials and terms in es
cd search/index
npm run index
cd ../../

# stop postgres
cd scripts/pg
./stop_postgres.sh
