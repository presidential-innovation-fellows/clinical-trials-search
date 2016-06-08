/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  Temporary script to dump pg trials into json.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const fs             = require("fs");
const pg             = require("pg");
const QueryStream    = require("pg-query-stream");
const JSONStream     = require("JSONStream");
const es             = require("event-stream");
const Transform      = require("stream").Transform;
const Logger         = require("../../common/logger");

let logger = new Logger({name: "export-trials"});

// a transform stream to strip the "trial_json_object" outer json
// container from the results
class StripTrialContainerStream extends Transform {
  _transform(data, enc, next) {
    data = data.toString();
    let trialContainer = '{"trial_json_object":';
    if (data.includes(trialContainer)) {
      data = data.replace(trialContainer, "");
      data = data.substring(0, data.lastIndexOf("}"));
      // logger.info(`Transformed: ${data}`);
    }
    if (data.length >= 32) {
      logger.info(`Piping '${data.substring(0, 32).replace(/(\r\n|\n|\r)/gm,"")}...' to stream...`);
    } else {
      logger.info(`Piping '${data.replace(/(\r\n|\n|\r)/gm,"")}' to stream...`);
    }
    this.push(data);
    return next();
  }
}

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
    let qs = client.query(new QueryStream(queryString, null, {batchSize: 20}));
    let js = JSONStream.stringify();
    let ts = new StripTrialContainerStream();
    let ws = fs.createWriteStream('trials.json');
    // run the query and write the results to file via piping the streams
    qs.pipe(js).pipe(ts).pipe(ws).on("finish", () => {
      logger.info("Wrote trials from 'trial_query.sql' to  'trials.json'.");
      // disconnect from pg
      client.end();
    });
  });
});
