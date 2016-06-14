#!/bin/sh
set -e

# apt-get install postgres, elasticsearch, node, npm

cd ../import/export_from_pg && npm install
cd ../cleanse && npm install
cd ../../search/api && npm install
cd ../index && npm install
