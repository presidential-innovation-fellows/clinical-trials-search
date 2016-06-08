const _                   = require("lodash");
const express             = require("express");
const searcher            = require("../search/searcher");
const Logger              = require('../../../common/logger');
const Utils               = require("../../../common/utils");
const trialMapping        = require("../../index/indexer/trial/mapping.json");

let logger = new Logger({name: "api-router"});

const router = express.Router();

const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(trialMapping["trial"]);

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

const _getInvalidTrialQueryParams = (queryParams) => {
  return _.without(queryParams, ["from", "size", "sort"])
  .filter((queryParam) => {
    let len = queryParam.length;
    let op = queryParam.substring(len - 4, len);
    let paramWithoutOp = queryParam.substring(0, len - 4);
    if (searchPropsByType["string"][queryParam]) {
      return false;
    } else if (op === "_gte" || "_lte") {
      if (
        searchPropsByType["date"][paramWithoutOp] ||
        searchPropsByType["long"][paramWithoutOp]
      ) {
        return false;
      }
    } else {
      return true;
    }
  });
}

/* get clinical trials that match supplied search criteria */
router.get('/clinical-trials', (req, res, next) => {
  // validate query params...
  queryParams = Object.keys(req.query);
  let invalidParams = _getInvalidTrialQueryParams(queryParams);
  if (invalidParams.length > 0) {
    return res.status(400).send({
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    });
  }

  let q = req.query;

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
