const async               = require("async");
const _                   = require("lodash");
const ElasticSearch       = require("elasticsearch");

const Logger              = require("../../../common/logger");
const CONFIG              = require("../../config.json");

class ElasticSearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return "elasticsearch";
  }
}

/**
 * Class for Swapping out ElasticSearch Aliases 
 * 
 * @class AliasSwapper
 */
class AliasSwapper {

  get LOGGER_NAME() {
    return "alias-swapper";
  }

  constructor() {
    this.logger = new Logger({name: this.LOGGER_NAME});


    let hosts = [];

    if (Array.isArray(CONFIG.ES_HOST)) {
      CONFIG.ES_HOST.forEach(host => {
        hosts.push(`${host}:${CONFIG.ES_PORT}`)
      });
    } else {
      hosts.push(`${CONFIG.ES_HOST}:${CONFIG.ES_PORT}`);
    } 
  
    this.client = new ElasticSearch.Client({
      hosts: hosts,
      log: ElasticSearchLogger
    });
  }

  /**
   * Gets an array of indices that are associated with the alias 
   * 
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  getIndexesForAlias(aliasName, callback) {
    this.logger.info(
      `Getting indexes for alias (${aliasName}).`);      
    this.client.indices.getAlias({
      alias: aliasName
    }, (err, response, status) => {
      let indices = new Array();
      if(err) { this.logger.error(err); }
      else {          
        _.forEach(response, function(item, key) {
          if (_.has(item, ['aliases', aliasName])) {
            indices.push(key);
          }
        });
      }
      return callback(err, indices);
    });
  }

  /**
   * Gets an array of indices that are associated with the alias 
   * 
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  aliasExists(aliasName, callback) {
    this.logger.info(
      `Checking existance of alias (${aliasName}).`);
    this.client.indices.existsAlias({
      name: aliasName
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }

  /**
   * Gets an array of indices that are associated with the alias 
   * 
   * @param {any} aliasName The alias to check for.
   * @param {any} callback
   */
  swapAlias(actions, callback) {
    this.logger.info(
      `Swapping aliases.`);      
    this.client.indices.updateAliases({
        body: {
            actions: actions
        }
    }, (err, response, status) => {
      if(err) { this.logger.error(err); }
      return callback(err, response);
    });
  }


  /**
   * Initializes and executes the swapping of aliases for trials and terms
   * 
   * @static
   * @param {any} trialIndexInfo Information about the index and alias for trials
   * @param {any} termIndexInfo Information about the index and alias for terms
   * @param {any} callback
   */
  static init(trialIndexInfo, termIndexInfo, callback) {


    let swapper = new AliasSwapper();
    swapper.logger.info(`Starting alias swapping.`);

    //Find out who is using aliases


    async.waterfall([
      //Get indexes for trial alias
      (next) => { swapper.aliasExists(trialIndexInfo.esAlias, next); },      
      (exists, next) => {    
        if(exists) {
          swapper.getIndexesForAlias(trialIndexInfo.esAlias, next)
        } else {
          //Empty Array of Indexes used by Alias
          next(null, []);
        }
      },
      (indexesForAlias, next) => {
          trialIndexInfo.currentAliasIndexes = indexesForAlias; 
          next(null); 
      },

      //Get indexes for term alias
      (next) => { swapper.aliasExists(termIndexInfo.esAlias, next); },      
      (exists, next) => {
        if(exists) {
          swapper.getIndexesForAlias(termIndexInfo.esAlias, next)
        } else {
          //Empty Array of Indexes used by Alias
          next(null, []);
        }
      },
      (indexesForAlias, next) => {
          termIndexInfo.currentAliasIndexes = indexesForAlias; 
          next(null); 
      },      
      //Build the removal and addions.
      (next) => {

          let actions = [];

          //Loop over the trial and term indexes and setup the add/removes for this
          //swap.
          [trialIndexInfo, termIndexInfo].forEach(indexType => {
            indexType.currentAliasIndexes.forEach((index) => {
              actions.push({
                "remove": {
                    "index": index,
                    "alias": indexType.esAlias
                }
              })
            });
            actions.push({
                "add": {
                    "index": indexType.esIndex,
                    "alias": indexType.esAlias
                }
            });
          });

          swapper.swapAlias(actions, next);
      }
    ], (err) => {
      if(err) { swapper.logger.error(err); }
      swapper.logger.info(`Finished swapping aliases.`);
      return callback(err);
    });
  }

}

module.exports = AliasSwapper;