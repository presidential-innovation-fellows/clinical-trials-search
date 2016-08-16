# Installing API/Indexer

## Configuration

### Attaching to Elastic Search Servers
You can connect to one or more ElasticSearch servers in order to index content, 
and for the API to consume content.  The configuration (config.json) should be as follows:
#### Single Host
```
{
  "ES_HOST": "hostname",
  "ES_PORT": "9200"
}
```
#### Multiple Hosts
(we assume the nodes will all use the same port number)
```
{
  "ES_HOST": [ "host1", "host2", "host3" ],
  "ES_PORT": "9200"
}
```

## Preliminary Steps
(assumes you done a git clone of the clinical-trials-search repository)
1. cd to the root of your local copy & ensure you are in correct branch.
  * we will refer to this path as &lt;root&gt; in subsequent steps
1. cd &lt;root&gt;/common && npm install
1. cd &lt;root&gt;/search/common && npm install
1. cd &lt;root&gt;/search/api && npm install
1. cd &lt;root&gt;/search/index && npm install
1. modify search configuration
  1. cd &lt;root&gt;/search
  1. edit config.json
  1. enter your hosts and port
  1. save 

## Indexing Content
### Pre-Steps
1. copy files

### Steps to Index
1. cd &lt;root&gt;/search/index
1. npm run index

## Running the API
### Pre-Steps
1. Run the indexer to populate an elastic search cluster.
### Steps to Running API
1. cd &lt;root&gt;/search/api
2. npm start
