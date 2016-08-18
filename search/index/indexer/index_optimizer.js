const async               = require("async");
const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../../common/logger");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

/**
 * Class for optimizing ElasticSearch Indexes 
 * 
 * @class AliasSwapper
 */
class IndexOptimizer {

  get LOGGER_NAME() {
    return "index-optimizer";
  }

  /**
   * Creates an instance of AliasSwapper.
   * 
   * @param {any} adapter The search adapter to use for connecting to ElasticSearch
   */
  constructor(adapter) {
    this.logger = new Logger({name: this.LOGGER_NAME});

    this.client = adapter.getClient();
  }

  /**
   * Optimizes (forceMerge) an index into 1 segment so that
   * all elasticsearch servers return the same scores for 
   * searches. 
   * 
   * @param {any} indexName The index to optimize.
   * @param {any} callback
   */
  forceMerge(indexName, callback) {
    this.logger.info(
      `Optimizing Index (${indexName})`);      
    this.client.indices.forcemerge({
        maxNumSegments: 1,
        waitForMerge: true,
        index: indexName
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  /**
   * Initializes and executes the optimizing of for trials and terms
   * 
   * @static
   * @param {any} adapter The search adapter to use for making requests to ElasticSearch
   * @param {any} trialIndexInfo Information about the index and alias for trials
   * @param {any} termIndexInfo Information about the index and alias for terms
   * @param {any} callback
   */
  static init(adapter, trialIndexInfo, termIndexInfo, callback) {

    let optimizer = new IndexOptimizer(adapter);
    optimizer.logger.info(`Starting index optimization.`);

    async.waterfall([
      (next) => { optimizer.forceMerge(trialIndexInfo.esIndex, next); },
      (result, next) => { optimizer.forceMerge(termIndexInfo.esIndex, next); }
    ], (err) => {
      if(err) { optimizer.logger.error(err); }
      optimizer.logger.info(`Finished optimizing indices.`);
      return callback(err);
    });
  }

}

module.exports = IndexOptimizer;