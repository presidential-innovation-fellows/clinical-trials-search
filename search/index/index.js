const async                 = require("async");
const TrialIndexer          = require("./indexer/trial/indexer");
const TermIndexer           = require("./indexer/term/indexer");
const AliasSwapper          = require("./indexer/alias_swapper");
const Logger                = require("../../common/logger");

let logger = new Logger({name: "indexer"});

logger.info("Started indexing.");

let trialIndexInfo = false;
let termIndexInfo = false;

async.waterfall([
  (next) => { TrialIndexer.init(next); },
  (info, next) => {
    //Save out alias and trial index name
    trialIndexInfo = info; 
    return next(null); 
  },
  (next) => { TermIndexer.init(next); },
  (info, next) => {
    //Save out term index
    termIndexInfo = info; 
    return next(null); 
  },
  //if all went well, swap aliases
  (next) => { AliasSwapper.init(trialIndexInfo, termIndexInfo, next); }    
], (err) => {
  logger.info("Finished indexing.");
});
