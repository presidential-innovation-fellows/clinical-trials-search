const async                 = require("async");
const path                  = require("path");
const TrialIndexer          = require("./indexer/trial/indexer");
const TermIndexer           = require("./indexer/term/indexer");
const AliasSwapper          = require("./indexer/alias_swapper");
const IndexOptimizer        = require("./indexer/index_optimizer");
const Logger                = require("../../common/logger");
const elasticsearchAdapter  = require("../common/search_adapters/elasticsearch_adapter");

const TRIALS_FILEPATH = path.join(__dirname,
  '../../data/trials_cleansed.json');

/**
 * Defines the class responsible for creating and managing the elasticsearch indexes 
 * 
 * @class Indexer
 */
class Indexer {

  /**
   * Creates an instance of Indexer.
   * 
   */
  constructor() {
    this.logger = new Logger({name: "indexer"});
  }
  
  /**
   * Index the trials contained in the trials file 
   * 
   * @param {any} trials_file The path to a JSON file containing a collection of trials.
   */
  index(trials_file) {
    this.logger.info("Started indexing.");

    let trialIndexInfo = false;
    let termIndexInfo = false;

    async.waterfall([
      (next) => { TrialIndexer.init(elasticsearchAdapter, trials_file, next); },
      (info, next) => {
        //Save out alias and trial index name
        trialIndexInfo = info; 
        return next(null); 
      },
      (next) => { TermIndexer.init(elasticsearchAdapter, trials_file, next); },
      (info, next) => {
        //Save out term index
        termIndexInfo = info; 
        return next(null); 
      },
      //Optimize the index
      (next) => { IndexOptimizer.init(elasticsearchAdapter, trialIndexInfo, termIndexInfo, next); },
      //if all went well, swap aliases
      (next) => { AliasSwapper.init(elasticsearchAdapter, trialIndexInfo, termIndexInfo, next); }    
    ], (err, status) => {
      if (!err && status == "done") {      
        this.logger.info("Finished indexing.");
      } else {
        this.logger.error(`An error may have occurred: ${err}`);
      }
    });
  }  
}

//If we are running this module directly from Node this code will execute.
//This will index all trials taking our default input.
if (require.main === module) {
  let indexer = new Indexer();
  indexer.index(TRIALS_FILEPATH);
}
