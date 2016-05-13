/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  Temporary script to translate sql version of trials into json.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const fs             = require("fs");
const pg             = require("pg");
const QueryStream    = require("pg-query-stream");
const JSONStream     = require("JSONStream");
const es             = require("event-stream");
const Transform      = require("stream").Transform;
const Logger         = require("./logger");

let logger = new Logger();

// connect to pg
const CONN_STRING = "postgres://localhost:5432/michaelbalint";
let client = new pg.Client(CONN_STRING);
client.connect((err) => {
  if(err) {
    logger.error(err);
    throw err;
  };
  // load the query sql
  fs.readFile("trial_query.sql", "utf-8", (err, queryString) => {
    logger.info("Querying postgres for trials...");
    // set up the streams
    let qs = client.query(new QueryStream(queryString));
    let js = JSONStream.stringify();
    let ws = fs.createWriteStream('trials.json');
    // run the query and write the results to file via piping the streams
    qs.pipe(js).pipe(ws).on("finish", () => {
      logger.info("Wrote trials from 'trial_query.sql' to  'trials.json'.");
      // disconnect from pg
      client.end();
    });
  });
});
