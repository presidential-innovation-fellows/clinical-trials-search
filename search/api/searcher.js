const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");
const Bodybuilder         = require("bodybuilder");

const Logger              = require("../../logger/logger");
const Utils               = require("../../utils/utils");
const CONFIG              = require("../config.json");

let logger = new Logger({name: "searcher"});

const transformStringToKey = Utils.transformStringToKey;

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

  _searchTrialsQuery(q) {
    let body = new Bodybuilder();

    const _addArrayFilter = (field, queryString) => {
      let filters = JSON.parse(queryString);
      if(filters instanceof Array) {
        filters.forEach((filter) => {
          body.filter("term", field, transformStringToKey(filter));
        });
      }
    };

    [
      "disease_keys", "location_keys", "organization_keys"
    ].forEach((field) => {
      if(q[field]) {
        _addArrayFilter(field, q[field]);
      }
    });

    q.size = q.size ? q.size : 10;
    let size = q.size > 50 ? 50 : q.size;
    let from = q.from ? q.from : 0;
    body.size(size);
    body.from(from);

    let query = body.build("v2");

    return query;
  }

  searchTrials(q, callback) {
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

  _searchClinicalTrialById(id) {
    let body = new Bodybuilder();

    if(id.substr(0, 4) === "NCI-")
      body.query("match", "nci_id", id);
    else if(id.substr(0, 3) === "NCT")
      body.query("match", "nct_id", id);

    let query = body.build("v2");
    return query;
  }

  // queries on either nci or nct id
  getClinicalTrialById(id, callback) {
    this.client.search({
      index: 'cancer-clinical-trials',
      type: 'trial',
      body: this._searchClinicalTrialById(id)
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

}

let searcher = new Searcher();
module.exports = searcher;
