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
  let without = _.without(queryParams, "from", "size", "sort", "_all");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["long"], paramWithoutOp)
      ) {
        return false;
      }
    }
    return true;
  });
}

/* get clinical trials that match supplied search criteria */
router.get('/clinical-trials', (req, res, next) => {
  // validate query params...
  queryParams = Object.keys(req.query);
  let invalidParams = _getInvalidTrialQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return res.status(400).send(error);
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
  let { term, term_type } = req.query;

  let q = { term, term_type };
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
