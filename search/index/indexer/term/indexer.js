const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const Writable            = require("stream").Writable;

const AbstractIndexer     = require("../abstract_indexer");
const Utils               = require("../../../../common/utils");
const TermLoader          = require("../../../../common/term_loader");

const CONFIG = require("../../../config.json");
const ES_MAPPING = require("./mapping.json");
const ES_SETTINGS = require("./settings.json");
const ES_PARAMS = {
  "esAlias": "cancer-terms",
  "esType": "term",
  "esMapping": ES_MAPPING,
  "esSettings": ES_SETTINGS
};
const TRIALS_FILEPATH = path.join(__dirname,
  '../../../../data/trials_cleansed.json');

class TermIndexerStream extends Writable {

  constructor(termIndexer) {
    super({objectMode: true});
    this.termIndexer = termIndexer;
    this.logger = termIndexer.logger;
  }

  _indexTerm(termDoc, done) {
    let id = `${termDoc.term_key}_${termDoc.term_type}`;
    this.logger.info(`Indexing term (${id}).`);
    this.termIndexer.indexDocument({
      "index": this.termIndexer.esIndex,
      "type": this.termIndexer.esType,
      "id": id,
      "body": termDoc
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      this.termIndexer.indexCounter++;

      return done(err, response);
    });
  };

  _write(termDoc, enc, next) {
    this._indexTerm(termDoc, (err, response) => {
      return next(null, response);
    });
  }

}

class TermIndexer extends AbstractIndexer {

  get LOGGER_NAME() {
    return "term-indexer";
  }

  constructor(params) {
    super(params);
    this.indexCounter = 0;
  }

  indexTermsForType(termType, callback) {
    let is = new TermIndexerStream(this);
    is.on("error", (err) => { this.logger.error(err); });

    this.indexCounter = 0;

    // if we don't have any terms to index, don't let everything fail, return
    if (!this.terms || !this.terms[termType] || _.isEmpty(this.terms[termType])) {
      return callback();
    }

    let maxTermCount = _.max(
      _.map(_.values(this.terms[termType]), (term) => {
        return term.count;
      })
    );
    _.forOwn(this.terms[termType], (termObj, termKey) => {
      let term = termObj["term"];
      // let terms = termObj["terms"];
      let count = termObj["count"];
      // let count_normalized = count / maxTermCount;
      // TODO: approximation, should figure out more exact normalization...
      let count_normalized = Math.log(count / maxTermCount + 1) / Math.log(2);
      let doc = {
        "term_key": termKey,
        "term": term,
        "term_type": termType,
        "count": count,
        "count_normalized": count_normalized
      };
      is.write(doc);
    });
    is.end();

    is.on("finish", () => {
      this.logger.info(`Indexed ${this.indexCounter} ${this.esType} ${termType} documents.`);
      return callback();
    });
  }

  indexTerms(callback) {
    const _indexTermsForType = (termType, next) => {
      this.indexTermsForType(termType, next);
    };
    async.eachSeries(TermLoader.VALID_TERM_TYPES, _indexTermsForType, callback);
  }

  loadTermsFromTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let termLoader = new TermLoader();
    termLoader.loadTermsFromTrialsJsonReadStream(rs, (err) => {
      if (err) {
        this.logger.error(err);
        return callback(err);
      }
      this.terms = termLoader.terms;
      return callback();
    });
  }

  static init(callback) {
    let indexer = new TermIndexer(ES_PARAMS);
    indexer.logger.info(`Started indexing (${indexer.esType}) indices.`);
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
      (response, next) => { indexer.loadTermsFromTrialsJsonFile(next); },
      (next) => { indexer.indexTerms(next) }
    ], (err) => {
      if(err) { indexer.logger.error(err); }
      indexer.logger.info(`Finished indexing (${indexer.esType}) indices.`);
      callback(err,{
        esIndex: indexer.esIndex,
        esAlias: indexer.esAlias
      });
    });
  }

}

module.exports = TermIndexer;
