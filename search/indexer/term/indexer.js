const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");

const AbstractIndexer     = require("../abstract_indexer");
const Logger              = require("../logger");

let logger = new Logger();

const CONFIG = require("../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esIndex": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};

class TermIndexer extends AbstractIndexer {

  constructor(params) {
    super(params);
    this.terms = {
      tags: {}
    };
  }

  loadTermsFromTrialsJsonDump(callback) {
    logger.info("Loading terms from \"trials.json\".");
    let rs = fs.createReadStream(
      path.join(__dirname, '../../../importer/trials.json'));
    let js = JSONStream.parse("*");

    let _loadTerms = (trial) => {
      trial.diseases.forEach((disease) => {
        let trialTerms = {
          tags: {}
        };
        disease.synonyms.forEach((synonym) => {
          if(typeof trialTerms.tags[synonym] === "undefined") {
            trialTerms.tags[synonym] = 1;
          } else{
            trialTerms.tags[synonym]++;
          }
        });
        Object.keys(trialTerms.tags).forEach((tag) => {
          if(typeof this.terms.tags[tag] === "undefined") {
            this.terms.tags[tag] = trialTerms.tags[tag];
          } else{
            this.terms.tags[tag] += trialTerms.tags[tag];
          }
        });
      });
    };

    rs.pipe(js).on("data", _loadTerms).on("end", () => {
      logger.info("Loaded terms from \"trials.json\".");
      return callback();
    });
  }

  indexTerms(callback) {
    let indexCounter = 0;
    const _indexTerm = (term, next) => {
      let id = `${term.text}_${term.classification}`;
      logger.info(`Indexing term (${id}).`);
      this.indexDocument({
        "index": this.esIndex,
        "type": this.esType,
        "id": id,
        "body": term
      }, (err, response, status) => {
        if(err) { logger.error(err); }
        indexCounter++;
        return next(err, response);
      });
    };

    let indexQ = async.queue(_indexTerm, CONFIG.ES_CONCURRENCY);

    const _pushToQ = (term) => {
      indexQ.push(term, (err) => {
        if(err) { logger.error(err); }
      });
    };

    let maxTagCount = _.max(_.values(this.terms.tags));
    Object.keys(this.terms.tags).forEach((tag) => {
      let count = this.terms.tags[tag];
      let count_normalized = count / maxTagCount;
      _pushToQ({
        "text": tag,
        "classification": "tag",
        "count": count,
        "count_normalized": count_normalized
      });
    });

    let queueCompleted = false;
    indexQ.drain = () => {
      logger.info(`Waiting ${CONFIG.QUEUE_GRACE_PERIOD/1000} seconds for queue to complete...`);
      setTimeout(() => {
        if(!queueCompleted) {
          logger.info(`Indexed all ${indexCounter} terms.`);
          queueCompleted = true;
          return callback();
        }
      }, CONFIG.QUEUE_GRACE_PERIOD);
    }
  }

  static init(callback) {
    let indexer = new TermIndexer(ES_PARAMS);
    logger.info(`Started indexing (${indexer.esType}) indices.`);
    async.waterfall([
      (next) => { indexer.indexExists(next); },
      (exists, next) => {
        if(exists) {
          indexer.deleteIndex(next)
        } else {
          next(null, null);
        }
      },
      (response, next) => { indexer.initIndex(next); },
      (response, next) => { indexer.initMapping(next); },
      (response, next) => { indexer.loadTermsFromTrialsJsonDump(next); },
      (next) => { indexer.indexTerms(next) }
    ], (err) => {
      if(err) { logger.error(err); }
      logger.info(`Finished indexing (${indexer.esType}) indices.`);
      callback(err);
    });
  }

}

module.exports = TermIndexer;
