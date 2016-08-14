//import { describe, it } from 'mocha';

import { expect } from 'chai';
const Searcher                  = require("../../search/searcher");
const AbstractSearcherClient    = require("../../search/clients/abstract_searcher_client");

/**
 * Represents a mock client for use by the Searcher class. 
 * 
 * @class SearcherMockClient
 * @extends {AbstractSearcherClient}
 */
class SearcherMockClient extends AbstractSearcherClient {

    /**
     * Creates an instance of SearcherESClient.
     * 
     */
    constructor() {
        super();
        this.client = false;
    }
}

describe('searcher', _ => {

    it('Should Build a NCT ID Query', () => {
        let searcher = new Searcher(new SearcherMockClient());
        //let query = {};        
        let query = searcher._searchTrialById("NCT02289950");

        expect(query).to.eql({

        });

    });

    it('Should Build a NCI ID Query', () => {
        let searcher = new Searcher(new SearcherMockClient());
        //let query = searcher._searchTrialById("NCI-2015-00253");
        let query = "foo"

        expect(query).to.eql({

        });

    });

});
