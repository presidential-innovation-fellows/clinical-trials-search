
/**
 * Defines an abstract client for the Searcher class 
 * 
 * @class AbstractSearcherClient
 */
class AbstractSearcherClient {



    /**
     * Gets an instance of a client that can be used by the Searcher 
     * 
     * @returns
     */
    getClient() {
        return this.client;
    }
}

module.exports = AbstractSearcherClient;