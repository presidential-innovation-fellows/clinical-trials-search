const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../logger");
const CONFIG              = require("../config.json");

let logger = new Logger();

class Searcher {

  constructor() {
    this.client = new ElasticSearch.Client({
      host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
      log: Logger
    });
  }

  _searchTermsQuery(q) {
    return {
      "query": {
        "function_score": {
          "query": {
            "match": {
              "text": q.term
            }
          },
          "functions": [{
            "field_value_factor": {
              "field": "count_normalized",
              "factor": 2.5
            }
          }]
        }
      }
    };
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
      return callback(null, res);
      let formattedRes = {
        total: res.hits.total,
        terms: _.map(res.hits.hits, (hit) => {
          return _.pick(hit._source, [
            "text", "classification", "count", "count_normalized"
          ]);
        })
      }
      return callback(null, formattedRes);
    });
  }

  searchTrials(q, callback) {
    return callback(null, "response text");
  }

}

let searcher = new Searcher();
module.exports = searcher;
