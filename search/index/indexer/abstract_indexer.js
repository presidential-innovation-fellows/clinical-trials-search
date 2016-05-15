const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const JSONStream          = require("JSONStream");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../../logger");
const CONFIG              = require("../../config.json");

let logger = new Logger();

class AbstractIndexer {

  constructor(params) {
    this.esIndex = params.esIndex;
    this.esType = params.esType;
    this.esMapping = params.esMapping;
    this.esSettings = params.esSettings;
    this.client = new ElasticSearch.Client({
      host: `${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`,
      log: Logger
    });
  }

  deleteIndex(callback) {
    logger.info(`Deleting index (${this.esIndex}).`);
    this.client.indices.delete({
      index: this.esIndex
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  initIndex(callback) {
    logger.info(`Creating index (${this.esIndex}).`);
    this.client.indices.create({
      index: this.esIndex,
      body: this.esSettings
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  indexExists(callback) {
    this.client.indices.exists({
      index: this.esIndex
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

  initMapping(callback) {
    logger.info(`Updating mapping for index (${this.esIndex}).`);
    return this.client.indices.putMapping({
      index: this.esIndex,
      type: this.esType,
      body: this.esMapping
    }, (err, response, status) => {
      if(err) { logger.error(err); }
      return callback(err, response);
    });
  }

  // implement this
  static init(callback) {
    return callback();
  }

}

module.exports = AbstractIndexer;
