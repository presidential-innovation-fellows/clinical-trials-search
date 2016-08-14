//import { describe, it } from 'mocha';

import { expect } from 'chai';
const searcher            = require("../../search/searcher");

describe('searcher', _ => {

    it('Should Build a NCT ID Query', () => {
        //let mysearcher = new Searcher();
        //let query = {};
        let query = searcher._searchTrialById("NCT02289950");

        expect(query).to.eql({

        });

    });

    it('Should Build a NCI ID Query', () => {
        //let mysearcher = new Searcher();
        //let query = searcher._searchTrialById("NCI-2015-00253");
        let query = "foo"

        expect(query).to.eql({

        });

    });

});
