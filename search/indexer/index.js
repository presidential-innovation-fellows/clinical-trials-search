const async                 = require("async");
const TrialIndexer          = require("./trial/indexer");
const TermIndexer           = require("./term/indexer");
const Logger                = require("./logger");

let logger = new Logger();

logger.info("Started indexing.");
async.waterfall([
  (next) => { TrialIndexer.init(next); },
  (next) => { TermIndexer.init(next); }
], (err) => {
  logger.info("Finished indexing.");
});
