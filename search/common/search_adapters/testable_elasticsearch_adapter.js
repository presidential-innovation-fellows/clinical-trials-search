const ElasticSearch                 = require("elasticsearch");
const BaseElasticsearchAdapter      = require("./base_elasticsearch_adapter");

/**
 * Represents the client that should be used for integration tests 
 * 
 * @class ElasticsearchAdapter
 * @extends {AbstractElasticsearchAdapter}
 */
class TestableElasticsearchAdapter extends AbstractElasticsearchAdapter {

    /**
     * Creates an instance of ElasticsearchAdapter.
     * 
     */
    constructor() {
        super();

        let hosts = this.getHostsFromConfig();

        this.client = new ElasticSearch.Client({
            host: hosts,
            log: 'trace'
        });
    }
}

let exportedInstance = new TestableElasticsearchAdapter()
module.exports = exportedInstance;
