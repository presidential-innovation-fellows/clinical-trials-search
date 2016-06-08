const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");
const Bodybuilder         = require("bodybuilder");
const moment              = require("moment");

const Logger              = require("../../../logger/logger");
const Utils               = require("../../../utils/utils");
const CONFIG              = require("../../config.json");
const trialMapping        = require("../../index/indexer/trial/mapping.json");

let logger = new Logger({name: "searcher"});

const transformStringToKey = Utils.transformStringToKey;
const DATE_FORMAT = "YYYY-MM-DD";
const searchPropsByType =
  Utils.getFlattenedMappingPropertiesByType(trialMapping["trial"]);

class SearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "searcher-elasticsearch";
  }
}

class Searcher {

  constructor() {
    this.client = new ElasticSearch.Client({
      host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
      log: SearchLogger
    });
  }

  /***********************************************************************
                                    TRIAL
   ***********************************************************************/

  _searchTrialById(id) {
    let body = new Bodybuilder();

    if(id.substr(0, 4) === "NCI-")
      body.query("match", "nci_id", id);
    else if(id.substr(0, 3) === "NCT")
      body.query("match", "nct_id", id);

    let query = body.build("v2");
    return query;
  }

  // queries on either nci or nct id
  getTrialById(id, callback) {
    this.client.search({
      index: 'cancer-clinical-trials',
      type: 'trial',
      body: this._searchTrialById(id)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      if(!res.hits || !res.hits.hits || !res.hits.hits[0]) {
        return callback(null, {});
      }
      // TODO: format
      let formattedRes = res.hits.hits[0]._source;
      return callback(null, formattedRes);
    });
  }

  /***********************************************************************
                                    TRIALS
   ***********************************************************************/

  _addStringFilters(body, q) {
    const _addStringFilter = (field, filter) => {
      if(filter instanceof Array) {
        filter.forEach((filterElement) => {
          body.filter("term", field, transformStringToKey(filterElement));
        });
      } else {
        body.filter("term", field, filter);
      }
    };

    searchPropsByType["string"].forEach((field) => {
      if(q[field]) {
        _addStringFilter(field, q[field]);
      }
    });
  }

  _addRangeFilters(body, q) {
    const _addRangeFilter = (field, lteRange, gteRange) => {
      let ranges = {};

      const _addRangeForRangeType = (rangeType, dateRange) => {
        if(dateRange) {
          dateRange = moment(dateRange);
          if(dateRange.isValid()) {
            ranges[rangeType] = dateRange.utc().format(DATE_FORMAT);
          } else {
            throw new Error(
              `Invalid date supplied for ${field}_${rangeType}. ` +
              `Please use format ${DATE_FORMAT} or ISO8601.`
            );
            return;
          }
        }
      };

      _addRangeForRangeType("lte", lteRange);
      _addRangeForRangeType("gte", gteRange);

      body.filter("range", field, ranges);
    }

    let possibleRangeProps = _.union(
      searchPropsByType["date"],
      searchPropsByType["long"]
    )
    possibleRangeProps.forEach((field) => {
      let lteRange = q[field + "_lte"];
      let gteRange = q[field + "_gte"];
      if(lteRange || gteRange) {
        _addRangeFilter(field, lteRange, gteRange);
      }
    });
  }

  _addSizeFromParams(body, q) {
    q.size = q.size ? q.size : 10;
    let size = q.size > 50 ? 50 : q.size;
    let from = q.from ? q.from : 0;
    body.size(size);
    body.from(from);
  }

  _searchTrialsQuery(q) {
    let body = new Bodybuilder();

    this._addStringFilters(body, q);
    this._addRangeFilters(body, q);
    this._addSizeFromParams(body, q);

    let query = body.build("v2");
    // logger.info(query);

    return query;
  }

  searchTrials(q, callback) {
    logger.info(`Searching for ${JSON.stringify(q)}`);
    this.client.search({
      index: 'cancer-clinical-trials',
      type: 'trial',
      body: this._searchTrialsQuery(q)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      let formattedRes = {
        total: res.hits.total,
        trials: _.map(res.hits.hits, (hit) => {
          return hit._source;
        })
      }
      return callback(null, formattedRes);
    });
  }

  /***********************************************************************
                                   TERMS
   ***********************************************************************/

  _searchTermsQuery(q) {
    let query = {
      "size": 5,
      "query": {
        "function_score": {
          "query": {
            "bool": {
              "should": [{
                "match": {
                  "term": q.term
                }
              }]
            }
          },
          "functions": [{
            "field_value_factor": {
              "field": "count_normalized",
              "factor": 1.5
            }
          }]
        }
      }
    };
    if(q.classification) {
      query.query.function_score.query.bool["must"] = [{
        "term": {
          "classification": q.classification
        }
      }];
    }
    return query;
  }

  searchTerms(q, callback) {
    this.client.search({
      index: 'cancer-terms',
      type: 'term',
      body: this._searchTermsQuery(q)
    }, (err, res) => {
      if(err) {
        logger.error(err);
        return callback(err);
      }
      // return callback(null, res);
      let formattedRes = {
        total: res.hits.total,
        terms: _.map(res.hits.hits, (hit) => {
          return hit._source;
        })
      }
      return callback(null, formattedRes);
    });
  }

}

let searcher = new Searcher();
module.exports = searcher;
