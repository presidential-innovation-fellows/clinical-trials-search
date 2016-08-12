#!/bin/sh
set -e

# transform trials
cd import/transform
npm run transform-trials
cd ../..

# index trials and terms in es
cd search/index
npm run index
cd ../../
