const async                 = require("async");
const TrialIndexer          = require("./indexer/trial/indexer");
const TermIndexer           = require("./indexer/term/indexer");
const Logger                = require("../../logger");

let logger = new Logger();

logger.info("Started indexing.");
async.waterfall([
  // (next) => { TrialIndexer.init(next); },
  (next) => { TermIndexer.init(next); }
], (err) => {
  logger.info("Finished indexing.");
});
