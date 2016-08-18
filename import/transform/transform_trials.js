const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const byline              = require('byline');
const JSONStream          = require("JSONStream");

const TermLoader          = require("../../common/term_loader");
const Logger              = require("../../common/logger");

const CleanseStream       = require("./stream/cleanse.js");
const CsvStream           = require("./stream/csv.js");
const GeoCodingStream     = require("./stream/geo_coding.js");
const SpecialCharsStream  = require("./stream/special_chars.js");
const SupplementStream    = require("./stream/supplement.js");

let logger = new Logger({ name: "import-transform" });

const THESAURUS_FILEPATH = "../../data/ThesaurusExtended.txt";
const NEOPLASM_CORE_FILEPATH = "../../data/Neoplasm_Core.csv";
const DISEASE_BLACKLIST_FILEPATH = "disease_blacklist.csv";
const TRIALS_FILEPATH = "../../data/trials.out";
const TRIALS_KOSHER_CHARS_FILEPATH = "../../data/trials_kosher_chars.txt";
const TRIALS_SUPPLEMENTED_FILEPATH = "../../data/trials_supplemented.json";
const TRIALS_CLEANSED_FILEPATH = "../../data/trials_cleansed.json";

class TrialsTransformer {

  constructor() {
    this.terms = {};
  }

  _removeSpecialChars(callback) {
    logger.info(`Removing special chars from ${TRIALS_FILEPATH}...`);
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_FILEPATH));
    let ss = new SpecialCharsStream();
    let ws = fs.createWriteStream(TRIALS_KOSHER_CHARS_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ss)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  _loadThesaurus(callback) {
    logger.info("Loading the NCI Thesaurus...");
    let header = [
      "code", "concept_name", "parents", "synonyms",
      "definition", "display_name", "semantic_types"
    ];
    let delimiter = "\t";
    let exclude = [
      "definition", "semantic_types"
    ]
    this.thesaurus = [];

    let rs = fs.createReadStream(path.join(__dirname, THESAURUS_FILEPATH));
    let ls = byline.createStream();
    let cs = new CsvStream({header, delimiter, exclude});

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ls)
      .on("error", (err) => { logger.error(err); })
      .pipe(cs)
      .on("error", (err) => { logger.error(err); })
      .on("data", (jsonRow) => {
        this.thesaurus.push(jsonRow);
      })
      .on("finish", () => {
        logger.info(`Loaded ${this.thesaurus.length} terms from the NCI Thesaurus.`);
        return callback();
      });
  }

  _loadNeoplasmCore(callback) {
    logger.info("Loading the Neoplasm Core...");
    let header = ["code", "concept_name"];
    let delimiter = "";
    this.neoplasmCore = [];

    let rs = fs.createReadStream(path.join(__dirname, NEOPLASM_CORE_FILEPATH));
    let ls = byline.createStream();
    let cs = new CsvStream({header, delimiter});

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ls)
      .on("error", (err) => { logger.error(err); })
      .pipe(cs)
      .on("error", (err) => { logger.error(err); })
      .on("data", (jsonRow) => {
        this.neoplasmCore.push(jsonRow);
      })
      .on("finish", () => {
        logger.info(`Loaded ${this.neoplasmCore.length} terms from the Neoplasm Core.`);
        return callback();
      });
  }

  _loadDiseaseBlacklist(callback) {
    logger.info("Loading the Disease Blacklist...");
    let header = ["code", "preferred_name"];
    let delimiter = "";
    this.diseaseBlacklist = [];

    let rs = fs.createReadStream(path.join(__dirname, DISEASE_BLACKLIST_FILEPATH));
    let ls = byline.createStream();
    let cs = new CsvStream({header, delimiter});

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ls)
      .on("error", (err) => { logger.error(err); })
      .pipe(cs)
      .on("error", (err) => { logger.error(err); })
      .on("data", (jsonRow) => {
        this.diseaseBlacklist.push(jsonRow);
      })
      .on("finish", () => {
        logger.info(`Loaded ${this.diseaseBlacklist.length} terms from the Disease Blacklist.`);
        return callback();
      });
  }

  _transformTrials(callback) {
    logger.info("Transforming trials...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_KOSHER_CHARS_FILEPATH));
    let ls = byline.createStream();
    let ts = new SupplementStream(this.thesaurus, this.neoplasmCore, this.diseaseBlacklist);
    let gs = new GeoCodingStream();
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_SUPPLEMENTED_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(ls)
      .on("error", (err) => { logger.error(err); })
      .pipe(ts)
      .on("error", (err) => { logger.error(err); })
      .pipe(gs)
      .on("error", (err) => { logger.error(err); })
      .pipe(jw)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  _loadTerms(callback) {
    logger.info("Loading terms...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_SUPPLEMENTED_FILEPATH));
    let termLoader = new TermLoader();
    termLoader.loadTermsFromTrialsJsonReadStream(rs, (err) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      this.terms = termLoader.terms;

      return callback();
    });
  }

  _cleanseTrials(callback) {
    logger.info("Cleansing trials...");
    let rs = fs.createReadStream(path.join(__dirname, TRIALS_SUPPLEMENTED_FILEPATH));
    let js = JSONStream.parse("*");
    let cs = new CleanseStream(this.terms);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream(TRIALS_CLEANSED_FILEPATH);

    rs.on("error", (err) => { logger.error(err); })
      .pipe(js)
      .on("error", (err) => { logger.error(err); })
      .pipe(cs)
      .on("error", (err) => { logger.error(err); })
      .pipe(jw)
      .on("error", (err) => { logger.error(err); })
      .pipe(ws)
      .on("error", (err) => { logger.error(err); })
      .on("finish", callback);
  }

  static run() {
    logger.info("Started transforming trials.json.");
    let trialsTransformer = new this();
    async.waterfall([
      (next) => { trialsTransformer._removeSpecialChars(next); },
      (next) => { trialsTransformer._loadThesaurus(next); },
      (next) => { trialsTransformer._loadNeoplasmCore(next); },
      (next) => { trialsTransformer._loadDiseaseBlacklist(next); },
      (next) => { trialsTransformer._transformTrials(next); },
      (next) => { trialsTransformer._loadTerms(next); },
      (next) => { trialsTransformer._cleanseTrials(next); }
    ], (err) => {
      if (err) { logger.error(err); }

      logger.info("Finished transforming trials.json.");
    });
  }

}

TrialsTransformer.run();
