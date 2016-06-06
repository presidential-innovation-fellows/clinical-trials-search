const express = require("express");
const searcher = require("../searcher");
const Logger = require('../../logger/logger');
const router = express.Router();

/* get a clinical trial by nci or nct id */
router.get('/clinical-trial/:id', (req, res, next) => {
  let id = req.params.id;
  searcher.getTrialById(id, (err, trial) => {
    // TODO: add better error handling
    if(err) {
      req.log.error(err);
      return res.sendStatus(500);
    }
    // TODO: format trial
    res.json(trial);
  });
});

/* get clinical trials that match supplied search criteria */
router.get('/clinical-trials', (req, res, next) => {
  let q = {
    disease_keys: req.query.disease_keys,
    location_keys: req.query.location_keys,
    organization_keys: req.query.organization_keys,
    test: req.query.test,
    from: req.query.from,
    size: req.query.size
  };

  searcher.searchTrials(q, (err, trials) => {
    // TODO: add better error handling
    if(err) {
      req.log.error(err);
      return res.sendStatus(500);
    }
    // TODO: format trials
    res.json(trials);
  })
});

/* get key terms that can be used to search through clinical trials */
router.get('/terms', (req, res, next) => {
  let queryTerm = req.query.term;
  if(!queryTerm) { respondInvalidQuery(res); }
  let queryClassification = req.query.classification;

  let q = {
    term: queryTerm,
    classification: queryClassification
  }
  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      req.log.error(err);
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

module.exports = router;
