const express = require("express");
const searcher = require("../searcher");
const router = express.Router();

router.get('/clinical-trial/:id', (req, res, next) => {
  let nciId = req.params.id;
  searcher.getClinicalTrialById(nciId, (err, clinicalTrial) => {
    // TODO: add error handling
    res.json(clinicalTrial);
  });
});

router.get('/search/terms', (req, res, next) => {
  let queryTerm = req.query.term;
  if(!queryTerm) { respondInvalidQuery(res); }
  let queryClassification = req.query.classification;

  let q = {
    term: queryTerm,
    classification: queryClassification
  }
  searcher.searchTerms(q, (err, terms) => {
    // TODO: add error handling
    res.json(terms);
  });
});

router.get('/search/trials', (req, res, next) => {
  let q = {
    disease: req.query.disease,
    location: req.query.location,
    organization: req.query.organization,
    from: req.query.from,
    size: req.query.size
  };

  searcher.searchTrials(q, (err, trials) => {
    // TODO: add error handling
    res.json(trials);
  })
});

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

module.exports = router;
