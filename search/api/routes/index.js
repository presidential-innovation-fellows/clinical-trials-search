const express = require("express");
const searcher = require("../searcher");
const router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
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

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

module.exports = router;
