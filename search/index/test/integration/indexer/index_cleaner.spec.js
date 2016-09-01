import { expect } from 'chai';
const IndexCleaner      = require("../../../indexer/index_cleaner");
const TestESAdapter     = require("../../../../common/search_adapters/testable_elasticsearch_adapter");
const async               = require("async");

describe('IndexCleaner', _ => {

    //TODO: Either load real data into local ES server before tests, OR
    //Replace instances of TestESAdapter with a mock Adapter object and move 
    //these tests to a unit tests folder.

    it('Should return indices older than 5 days ago', function(done) {        
        this.timeout = 15000;

        let alias = "cancer-clinical-trials";
        let expectedIndices = [
            "cancer-clinical-trials2016816_171717",
            "cancer-clinical-trials2016818_131343",
            "cancer-clinical-trials2016818_181844",
            "cancer-clinical-trials2016818_121254",
            "cancer-clinical-trials2016818_8856",
            "cancer-clinical-trials2016818_13130",
            "cancer-clinical-trials2016818_884",
            "cancer-clinical-trials2016823_101049",
            "cancer-clinical-trials2016818_8832",
            "cancer-clinical-trials2016818_9932",
            "cancer-clinical-trials2016818_882",
            "cancer-clinical-trials2016817_222211",
            "cancer-clinical-trials2016819_111159",
            "cancer-clinical-trials2016818_13136",
            "cancer-clinical-trials2016826_151513",
            "cancer-clinical-trials2016818_222252",
            "cancer-clinical-trials2016818_11119",
            "cancer-clinical-trials2016822_11116",
            "cancer-clinical-trials2016818_8811"          
        ];
        
        let cleaner = new IndexCleaner(TestESAdapter);

        cleaner.getIndices(alias, 5, (err, indices)=>{
            expect(indices.sort()).to.deep.eql(expectedIndices.sort());
            done();
        })

    });


    it('Should remove the index associated from the alias from the list of indices', function(done) {

        let alias = "cancer-clinical-trials";

        let indices = [
            'cancer-clinical-trials201691_9930', 
            'cancer-clinical-trials2016818_181844', 
            'cancer-clinical-trials2016826_151513'
        ];

        let expectedIndices = [
            'cancer-clinical-trials2016818_181844', 
            'cancer-clinical-trials2016826_151513'
        ];

        let cleaner = new IndexCleaner(TestESAdapter);
        cleaner.filterAliasedIndices(alias, indices, (err, filteredIndices) => {

            expect(filteredIndices).to.eql(expectedIndices);

            done();
        });

    })

    it('Should delete an index', function(done) {
    
        let index = 'cancer-clinical-trials2016830_111127';
        let aliasName = 'cancer-clinical-trials';

        let cleaner = new IndexCleaner(TestESAdapter);

        async.waterfall([
            (next) => { cleaner.deleteIndices(index,next); }, //Gets all indices older than 7 days
            (next) => { cleaner.getIndices(aliasName, 0, next); },
            (indices, next) => {
                expect(indices).to.not.include(index);
                next(false);
            }
        ], (err) => {
            //TODO: Make better error message -- this is important when 
            //we delete an index that does not exist or 
            expect(err).to.be.null;
            return done();
        });
    })

    it ('Should delete all old indices', function(done) {
        
        let aliasName = 'cancer-clinical-trials';
        let numdays = 8;
        
        let cleaner = new IndexCleaner(TestESAdapter);

        cleaner.cleanIndicesForAlias(aliasName, numdays, (err) => {    
            //TODO: This is throwing an uncaught assertion somewhere        
            return done(err);
        });
    })

});
