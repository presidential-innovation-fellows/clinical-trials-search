import { expect } from 'chai';
const AliasSwapper      = require("../../indexer/alias_swapper");
const async               = require("async");






describe('AliasSwapper', _ => {

    let trialIndexInfo = {
        esAlias: "cancer-clinical-trials-TESTALIAS",
        esIndex: "cancer-clinical-trials-TESTINDEX",
        currentAliasIndexes: []
    };
    let termIndexInfo = {
        esAlias: "cancer-terms-TESTALIAS",
        esIndex: "cancer-terms-TESTINDEX",
        currentAliasIndexes: []
    }

    before("Create Indexes for Swapping", function() {
        
    })

    it('Should work', () => {

        //The waterfall is causing issues.  Must fix later.
        async.waterfall([
            (next) => { AliasSwapper.init(trialIndexInfo, termIndexInfo, next); }
        ],(err) => {
            console.log(err);
        });
    });

    after("Removing Indexes and Alias after Swapping", function() {

    })

});
