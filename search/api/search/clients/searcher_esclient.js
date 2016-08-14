const ElasticSearch             = require("elasticsearch");
const CONFIG                    = require("../../../config.json");
const Logger                    = require("../../../../common/logger");
const AbstractSearcherClient    = require("./abstract_searcher_client");


/**
 * A logger to be used by ElasticSearch 
 * 
 * @class SearchLogger
 * @extends {Logger}
 */
class SearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "searcher-elasticsearch";
  }
}

/**
 * Represents a client for use by the Searcher class. 
 * 
 * @class SearcherESClient
 * @extends {AbstractSearcherClient}
 */
class SearcherESClient extends AbstractSearcherClient {

    /**
     * Creates an instance of SearcherESClient.
     * 
     */
    constructor() {
        super();
        this.client = new ElasticSearch.Client({
            host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
            log: SearchLogger
        });
    }
}

let searcherClient = new SearcherESClient();

module.exports = searcherClient;
