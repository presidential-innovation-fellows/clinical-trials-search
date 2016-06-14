const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");
const Bodybuilder         = require("bodybuilder");
const moment              = require("moment");

const Logger              = require("../../../common/logger");
const Utils               = require("../../../common/utils");
const CONFIG              = require("../../config.json");
const trialMapping        = require("../../index/indexer/trial/mapping.json");

let logger = new Logger({name: "searcher"});

const transformStringToKey = Utils.transformStringToKey;
const DATE_FORMAT = "YYYY-MM-DD";
const RESULT_SIZE_MAX = 50;
const RESULT_SIZE_DEFAULT = 10;
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
    logger.info("Getting trial", {id});
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

  _addAllFilter(body, q) {
    if (q._all) {
      body.query("match", "_all", q._all);
      delete q._all;
    }
  }

  _addStringFilters(body, q) {
    const _addStringFilter = (field, filter) => {
      if(filter instanceof Array) {
        filter.forEach((filterElement) => {
          body.filter("term", field, filterElement.toLowerCase());
        });
      } else {
        body.filter("term", field, filter.toLowerCase());
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

  _addBooleanFilters(body, q) {
    const _addBooleanFilter = (field, filter) => {
      const _stringToBool = (string) => {
        return string === "true" || string === "1";
      }
      if(filter instanceof Array) {
        filter.forEach((filterEl) => {
          body.filter("term", field, _stringToBool(filterEl));
        });
      } else {
        body.filter("term", field, _stringToBool(filter));
      }
    };

    searchPropsByType["boolean"].forEach((field) => {
      if(q[field]) {
        _addBooleanFilter(field, q[field]);
      }
    });
  }

  _addSizeFromParams(body, q) {
    q.size = q.size ? q.size : RESULT_SIZE_DEFAULT;
    let size = q.size > RESULT_SIZE_MAX ? RESULT_SIZE_MAX : q.size;
    let from = q.from ? q.from : 0;
    body.size(size);
    body.from(from);
  }

  _searchTrialsQuery(q) {
    let body = new Bodybuilder();

    this._addAllFilter(body, q);
    this._addStringFilters(body, q);
    this._addRangeFilters(body, q);
    this._addBooleanFilters(body, q);
    this._addSizeFromParams(body, q);

    let query = body.build("v2");
    // logger.info(query);

    return query;
  }

  searchTrials(q, callback) {
    logger.info("Trial searching", q);
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

  get TERM_TYPE_DEFAULTS() {
    return [
      "diseases.synonyms",
      "sites.org.location",
      "sites.org.name",
      "sites.org.family",
      "arms.interventions.treatment"
    ];
  }

  _searchTermsQuery(q) {
    let body = new Bodybuilder();

    // add query terms (boost when phrase is matched)
    if (q.term) {
      body.query("match", "term_suggest", q.term);
      body.query("match", "term_suggest", q.term, {type: "phrase"});
    }

    // set the term types (use defaults if not supplied)
    let termTypes = this.TERM_TYPE_DEFAULTS;
    if (q.term_type) {
      if (q.term_type instanceof Array) {
        termTypes = q.term_type;
      } else {
        termTypes = [q.term_type];
      }
    }
    termTypes.forEach((termType) => {
      body.orFilter("term", "term_type", termType);
    });

    // build the query and add custom fields (that bodyparser can't handle)
    let functionQuery = body.build("v2");
    // boost exact match
    if (q.term) {
      functionQuery.query.bool.should = {
        "match": {
          "term": q.term
        }
      };
    }

    // add scoring function
    functionQuery.functions = [{
      "field_value_factor": {
        "field": "count_normalized",
        "factor": .25
      }
    }];
    functionQuery.boost_mode = "multiply";

    // finalize the query
    let query = {
      "query": { "function_score": functionQuery },
      "size": 5
    };

    // logger.info(query);
    return query;
  }

  searchTerms(q, callback) {
    // logger.info("Term searching", q);
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
          let source = hit._source;
          source.score = hit._score;
          return source;
        })
      }
      return callback(null, formattedRes);
    });
  }

}

let searcher = new Searcher();
module.exports = searcher;
