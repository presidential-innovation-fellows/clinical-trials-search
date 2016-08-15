//import { describe, it } from 'mocha';

import { expect } from 'chai';
const Bodybuilder               = require("bodybuilder");
const querystring               = require('querystring');
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
            query: {
                match: {
                    "nct_id": "NCT02289950"
                }
            }
        });

    });

    it('Should Build a NCI ID Query', () => {
        let searcher = new Searcher(new SearcherMockClient());
        let query = searcher._searchTrialById("NCI-2015-00253");

        expect(query).to.eql({
            query: {
                match: {
                    "nci_id": "NCI-2015-00253"
                }
            }
        });

    });

    it('Should Add String Filter With Single Value', () => {
        let searcher = new Searcher(new SearcherMockClient());
        let body = new Bodybuilder();
        let q = querystring.parse("current_trial_status=Active");
        searcher._addStringFilters(body, q);


        expect(body.build("v2")).to.eql({
            query: {
                bool: {
                    filter: {
                        term: {
                            "current_trial_status": "active"
                        }
                    }
                }
            }
        });

    });

    it('Should Add String Filter with multiple values', () => {
        let searcher = new Searcher(new SearcherMockClient());
        let body = new Bodybuilder();
        let q = querystring.parse("current_trial_status=Active&current_trial_status=Temporarily+Closed+to+Accrual");
        searcher._addStringFilters(body, q);


        expect(body.build("v2")).to.eql({
            query: {
                bool: {
                    filter: {
                        bool: {
                            "must": [
                                {
                                "query": {
                                    "bool": {
                                        "filter": {
                                            "bool": {
                                                "should": [
                                                    {
                                                        "term": { "current_trial_status": "active" }
                                                    },
                                                    {
                                                        "term": { "current_trial_status": "temporarily closed to accrual" }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                                }
                            ]                                                        
                        }
                    }
                }
            }
        });

    });

});
