const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const JSONStream          = require("JSONStream");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("./logger");

const ES_HOST             = "localhost",
      ES_PORT             = "9200",
      ES_INDEX            = "cancer-clinical-trials",
      ES_TYPE             = "trial"
      ES_CONCURRENCY      = 2;

let logger = new Logger();

class Indexer {

  constructor(config) {
    this.client = new ElasticSearch.Client({
      host: `${ES_HOST}:${ES_PORT}`,
      log: Logger
    });
  }

  deleteIndex(callback) {
    logger.info(`Deleting index [${ES_INDEX}].`);
    this.client.indices.delete({
      index: ES_INDEX
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  initIndex(callback) {
    logger.info(`Creating index [${ES_INDEX}].`);
    this.client.indices.create({
      index: ES_INDEX,
      body: require('./es_config/settings.json')
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  indexExists(callback) {
    this.client.indices.exists({
      index: ES_INDEX
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  indexDocument(doc, callback) {
    this.client.index(doc, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  indexFromTrialsJsonDump(callback) {
    let rs = fs.createReadStream(
      path.join(__dirname, '../../importer/trials.json'));
    let js = JSONStream.parse("*");

    const _indexTrial = (trial, next) => {
      logger.info(`Indexing clinical trial with nci_id (${trial.nci_id}).`);
      this.indexDocument({
        "index": ES_INDEX,
        "type": ES_TYPE,
        "id": trial.nci_id,
        "body": trial
      }, (err, response, status) => {
        if(err) { logger.error(err); }
        return next(err, response);
      });
    };

    let indexQ = async.queue(_indexTrial, ES_CONCURRENCY);

    const _pushToQ = (trial) => {
      indexQ.push(trial, (err) => {
        if(err) { logger.error(err); }
      });
    }

    rs.pipe(js).on("data", _pushToQ).on("finished", () => {
      logger.info("Indexed all trials in \"trials.json\".");
    });
  }

  initMapping(callback) {
    logger.info(`Updating mapping for index (${ES_INDEX}).`);
    return this.client.indices.putMapping({
      index: ES_INDEX,
      type: ES_TYPE,
      body: require("./es_config/mapping.json")
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

}

module.exports = Indexer;
