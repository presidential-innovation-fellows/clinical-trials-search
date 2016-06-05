const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../logger/logger");
const CONFIG              = require("../config.json");

let logger = new Logger({name: "SEARCH_API_SEARCHER"});

class SearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "SEARCH_API_SEARCHER_ELASTICSEARCH";
  }
}

class Searcher {

  constructor() {
    this.client = new ElasticSearch.Client({
      host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
      log: SearchLogger
    });
  }

  _getKeyTerm(text) {
    return text
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/ /g,"_")
      .toLowerCase();
  }

  // TODO: make or implement a query builder
  _searchTermsQuery(q) {
    let query = {
      "size": 5,
      "query": {
        "function_score": {
          "query": {
            "bool": {
              "should": [{
                "match": {
                  "name": q.term
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

  // TODO: make or implement a query builder
  _searchTrialsQuery(q) {
    let query = {
      "query": {
        "bool": {
          "should": []
        }
      }
    };
    if (q.disease) {
      query.query.bool.should.push({
        "match": {
          "diseases_raw": this._getKeyTerm(q.disease)
        }
      });
    }
    if (q.location) {
      query.query.bool.should.push({
        "match": {
          "locations_raw": this._getKeyTerm(q.location)
        }
      });
    }
    if (q.organization) {
      query.query.bool.should.push({
        "match": {
          "organizations_raw": this._getKeyTerm(q.organization)
        }
      });
    }
    q.size = q.size ? q.size : 10;
    query.size = q.size > 50 ? 50 : q.size;
    query.from = q.from ? q.from : 0;
    console.log(JSON.stringify(query));
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

  // TODO: make or implement a query builder
  _searchClinicalTrialById(nciId) {
    return {
      "query": {
        "bool": {
          "must": [{
            "match": {
              "nci_id": nciId
            }
          }]
        }
      }
    };
  }

  getClinicalTrialById(nciId, callback) {
    this.client.search({
      index: 'cancer-clinical-trials',
      type: 'trial',
      body: this._searchClinicalTrialById(nciId)
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
