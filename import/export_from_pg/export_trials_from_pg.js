/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  Temporary script to dump pg trials into json.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const _              = require("lodash");
const fs             = require("fs");
const pg             = require("pg");
const moment         = require("moment");
const QueryStream    = require("pg-query-stream");
const JSONStream     = require("JSONStream");
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
    }
    this.push(data);
    return next();
  }

}

class TransformTrialStream extends Transform {

  constructor() {
    super({objectMode: true});
  }

  _createLocations(trial) {
    if (!trial.sites) { return; }
    trial.sites = trial.sites.map((site) => {
      let org = site.org;
      let location = _.compact([
        org.city,
        org.state_or_province,
        org.country
      ]).join(", ");
      if (location) {
        site.org.location = location;
      }
      return site;
    });
  }

  _createTreatments(trial) {
    if (!trial.arms) { return; }
    trial.arms = trial.arms.map((arm) => {
      arm.interventions = arm.interventions.map((intervention) => {
        let treatment = intervention.intervention_name;
        if (treatment) {
          if (intervention.intervention_type) {
            treatment += ` (${intervention.intervention_type})`;
            intervention.treatment = treatment;
          }
        }
        return intervention
      });
      return arm;
    });
  }

  // looks through all date fields, finds the latest one and uses that
  // for the "date_last_updated_anything" field
  _addDateLastUpdatedAnythingField(trial) {
    let updateDates = [];

    const _addDateToArr = (stringDate) => {
      let momentDate = moment(stringDate);
      if(stringDate && momentDate.isValid()) updateDates.push(momentDate);
    }

    [
      trial.amendment_date, trial.current_trial_status_date,
      trial.date_last_created, trial.date_last_updated
    ].forEach(_addDateToArr);

    if(trial.diseases) {
      trial.diseases.forEach((disease) => {
        [
          disease.date_last_created, disease.date_last_updated
        ].forEach(_addDateToArr);
      });
    }

    if(trial.sites) {
      trial.sites.forEach((site) => {
        _addDateToArr(site.recruitment_status_date);
        if(site.org) {
          _addDateToArr(site.org.status_date);
        }
      });
    }

    let updatedDate = moment.max(updateDates);

    trial.date_last_updated_anything = updatedDate.utc().format("YYYY-MM-DD");
  }

  _transform(trial, enc, next) {
    this._createLocations(trial);
    this._createTreatments(trial);
    this._addDateLastUpdatedAnythingField(trial);
    logger.info(`Exporting trial with nci_id (${trial.nci_id}) to stream...`);
    this.push(trial);
    next();
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
  fs.readFile("trial_query.sql", "utf-8", (err, queryString) => {
    logger.info("Querying postgres for trials...");
    // set up the streams
    let qs = client.query(new QueryStream(queryString, null, {batchSize: 20}));
    let ja = JSONStream.stringify();
    let ss = new StripTrialContainerStream();
    let ps = JSONStream.parse("*");
    let ts = new TransformTrialStream();
    let jz = JSONStream.stringify();
    let ws = fs.createWriteStream('../../data/trials.json');
    // run the query and write the results to file via piping the streams
    qs.pipe(ja).pipe(ss).pipe(ps).pipe(ts).pipe(jz).pipe(ws).on("finish", () => {
      logger.info("Wrote trials from 'trial_query.sql' to  'trials.json'.");
      // disconnect from pg
      client.end();
    });
  });
});
