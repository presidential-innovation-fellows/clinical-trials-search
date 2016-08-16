import { expect } from 'chai';
const AliasSwapper      = require("../../indexer/alias_swapper");
const async               = require("async");

describe('AliasSwapper', _ => {

    it('Should work', () => {

        let trialIndexInfo = {
            esAlias: "cancer-clinical-trials",
            esIndex: "cancer-clinical-trials2016816_2248",
            currentAliasIndexes: []
        };
        let termIndexInfo = {
            esAlias: "cancer-terms",
            esIndex: "cancer-terms2016816_2259",
            currentAliasIndexes: []
        }
        //The waterfall is causing issues.  Must fix later.
        async.waterfall([
            (next) => { AliasSwapper.init(trialIndexInfo, termIndexInfo, next); }
        ],(err) => {
            console.log(err);
        });
    });
});
