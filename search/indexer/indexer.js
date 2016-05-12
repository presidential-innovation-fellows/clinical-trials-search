const ElasticSearch = require("elasticsearch"),
      Logger = require("./logger");

const ES_HOST = "localhost",
      ES_PORT = "9200",
      ES_INDEX = "cancer_clinical_trials";

let logger = new Logger();

module.exports = class Indexer {

  constructor(config) {
    this.client = new ElasticSearch.Client({
      host: `${ES_HOST}:${ES_PORT}`,
      log: Logger
    });
  }

  deleteIndex() {
    logger.info(`Deleting index [${ES_INDEX}].`);
    return this.client.indices.delete({
      index: ES_INDEX
    });
  }

  initIndex() {
    logger.info(`Creating index [${ES_INDEX}].`);
    return this.client.indices.create({
      index: ES_INDEX
    });
  }

  indexExists() {
    return this.client.indices.exists({
      index: ES_INDEX
    });
  }

  initMapping() {
    logger.info(`Creating mapping for index [${ES_INDEX}].`);
    return this.client.indices.putMapping({
      index: ES_INDEX,
      type: "document",
      body: {
        properties: require("./mapping.json")
      }
    });
  }

};
