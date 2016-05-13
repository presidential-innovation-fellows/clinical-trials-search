const fs = require("fs");
const path = require("path");
const JSONStream = require("JSONStream");

const ElasticSearch = require("elasticsearch"),
      Logger = require("./logger");

// const EsTrialFormatter = require("es_trial_formatter");

const ES_HOST = "localhost",
      ES_PORT = "9200",
      ES_INDEX = "cancer-clinical-trials",
      ES_TYPE = "trial";

let logger = new Logger();

class Indexer {

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

  indexDocument(doc) {
    return this.client.index(doc);
  }

  indexFromTrialsJsonDump() {
    let rs = fs.createReadStream(
      path.join(__dirname, '../../importer/trials.json'));
    let js = JSONStream.parse("*.trial_json_object");
    logger.info("testing");

    const _indexTrial = (trial) => {
      logger.info(`Indexing clinical trial with nci_id (${trial.nci_id}).`);
      // trial = EsTrialFormatter.format(trial);
      this.indexDocument({
        "index": ES_INDEX,
        "type": ES_TYPE,
        "id": trial.nci_id,
        "body": trial
      });
    };

    rs.pipe(js).on("data", _indexTrial).on("finished", () => {
      logger.info("Indexed all trials in \"trials.json\".");
    });
  }

  updateMapping() {
    logger.info(`Updating mapping for index (${ES_INDEX}).`);
    return this.client.indices.putMapping({
      index: ES_INDEX,
      type: ES_TYPE,
      body: {
        properties: require("./mapping.json")
      }
    });
  }

}

module.exports = Indexer;
