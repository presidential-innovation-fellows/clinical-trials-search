/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  Temporary script to pg version of thesaurus into json.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const fs             = require("fs");
const pg             = require("pg");
const QueryStream    = require("pg-query-stream");
const JSONStream     = require("JSONStream");
const es             = require("event-stream");
const Transform      = require("stream").Transform;
const Logger         = require("../../logger/logger");

let logger = new Logger({name: "EXPORT_THESAURUS_FROM_PG_SCRIPT"});

// a transform stream to strip the "thesaurus_json_object" outer json
// container from the results
class StripThesaurusContainer extends Transform {
  _transform(data, enc, next) {
    data = data.toString();
    let thesaurusContainer = '{"thesaurus_json_object":';
    if (data.includes(thesaurusContainer)) {
      data = data.replace(thesaurusContainer, "");
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
const CONN_STRING = "postgres://localhost:5432/ctrp-data-warehouse";
let client = new pg.Client(CONN_STRING);
client.connect((err) => {
  if(err) {
    logger.error(err);
    throw err;
  };
  // load the query sql
  fs.readFile("thesaurus_query.sql", "utf-8", (err, queryString) => {
    logger.info("Querying postgres for thesaurus...");
    // set up the streams
    let qs = client.query(new QueryStream(queryString, null, {batchSize: 10}));
    let js = JSONStream.stringify();
    let ts = new StripThesaurusContainer();
    let ws = fs.createWriteStream('thesaurus.json');
    // run the query and write the results to file via piping the streams
    qs.pipe(js).pipe(ts).pipe(ws).on("finish", () => {
      logger.info("Wrote thesaurus from 'thesaurus_query.sql' to  'thesaurus.json'.");
      // disconnect from pg
      client.end();
    });
  });
});
