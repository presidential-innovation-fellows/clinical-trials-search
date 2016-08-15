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

## Indexing Content
TBD

## Running the API
TBD
