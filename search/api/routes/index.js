const _                   = require("lodash");
const express             = require("express");
const md                  = require("marked");
const git                 = require("git-rev");
const searcherAdapter     = require("../../common/search_adapters/elasticsearch_adapter");
const Searcher            = require("../search/searcher");
const Logger              = require('../../../common/logger');
const Utils               = require("../../../common/utils");
const trialMapping        = require("../../index/indexer/trial/mapping.json");
const package             = require("../package.json");

let logger = new Logger({name: "api-router"});

let searcher = new Searcher(searcherAdapter);

const router = express.Router();

const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(trialMapping["trial"]);

const respondInvalidQuery = (res) => {
  return res.status(400).send("Invalid query.");
}

/* get a clinical trial by nci or nct id */
router.get('/clinical-trial/:id', (req, res, next) => {
  let id = req.params.id;
  searcher.getTrialById(id, (err, trial) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(trial);
  });
});

const _getInvalidTrialQueryParams = (queryParams) => {
  let without = _.without(queryParams,
    "from", "size", "sort", "_all", "_fulltext", "include", "exclude");
  return without.filter((queryParam) => {
    if (_.includes(searchPropsByType["string"], queryParam)) {
      return false;
    } else if (queryParam.endsWith("_gte") || queryParam.endsWith("_lte")) {
      let paramWithoutOp = queryParam.substring(0, queryParam.length - 4);
      if (
        _.includes(searchPropsByType["date"], paramWithoutOp) ||
        _.includes(searchPropsByType["long"], paramWithoutOp) ||
        _.includes(searchPropsByType["float"], paramWithoutOp)
      ) {
        return false;
      }
    } else if (
      queryParam.endsWith("_lon") ||
      queryParam.endsWith("_lat") ||
      queryParam.endsWith("_dist")
    ) {
      //Special endings for geo distance filtering.
      let paramWithoutOp = queryParam.substring(0, queryParam.lastIndexOf("_"));
      if ( _.includes(searchPropsByType["geo_point"], paramWithoutOp) ) {
        return false;
      }
    }
    return true;
  });
}

const queryClinicalTrialsAndSendResponse = (q, res, next) => {
  let queryParams = Object.keys(q);
  // validate query params...
  let invalidParams = _getInvalidTrialQueryParams(queryParams);
  if (invalidParams.length > 0) {
    let error = {
      "Error": "Invalid query params.",
      "Invalid Params": invalidParams
    };
    logger.error(error);
    return res.status(400).send(error);
  }

  searcher.searchTrials(q, (err, trials) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    // TODO: format trials
    res.json(trials);
  });
}

/* get clinical trials that match supplied search criteria */
router.get('/clinical-trials', (req, res, next) => {
  let q = req.query;
  queryClinicalTrialsAndSendResponse(q, res, next);
});

router.post('/clinical-trials', (req, res, next) => {
  let q = req.body;
  queryClinicalTrialsAndSendResponse(q, res, next);
});

/* get key terms that can be used to search through clinical trials */
router.get('/terms', (req, res, next) => {
  let q = _.pick(req.query, ["term", "term_type", "size", "from", "codes"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

router.post('/terms', (req, res, next) => {
  let q = _.pick(req.body, ["term", "term_type", "size", "from", "codes"]);

  searcher.searchTerms(q, (err, terms) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(terms);
  });
});

/* get a term by its key */
router.get('/term/:key', (req, res, next) => {
  let key = req.params.key;
  searcher.getTermByKey(key, (err, term) => {
    // TODO: add better error handling
    if(err) {
      return res.sendStatus(500);
    }
    res.json(term);
  });
});


router.get('/clinical-trial.json', (req, res, next) => {
  let clinicalTrialJson = Utils.omitPrivateKeys(trialMapping);
  let excludeKeys = [
    "analyzer", "index",
    "format", "include_in_root"
  ]
  clinicalTrialJson = Utils.omitDeepKeys(clinicalTrialJson, excludeKeys);
  res.json(clinicalTrialJson["trial"]["properties"]);
});

router.get('/', (req, res, next) => {
  let title = "NCI Clinical Trials API";
  res.render('index', { md, title });
});

router.get('/version', (req, res, next) => {
  const _sendVersionResponse = (gitHash) => {
    res.json({
      "version": package.version,
      "git-hash": gitHash,
      "git-repository": package.repository.url
    });
  };

  var gitHash;
  try {
    gitHash = require("../git_hash.json");
  } catch(err) {
    // catch error and log a warning
    logger.warning(
      "Missing ../git_hash.json file, attempting to use git-rev library to look up git hash..."
    );
  }

  if (gitHash) {
    _sendVersionResponse(gitHash)
  } else {
    git.long((gitHash) => {
      _sendVersionResponse(gitHash);
    });
  }
});

module.exports = router;
