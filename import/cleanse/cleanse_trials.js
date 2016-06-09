const fs                  = require("fs");
const path                = require("path");
const async               = require("async");
const _                   = require("lodash");
const JSONStream          = require("JSONStream");
const Transform           = require("stream").Transform;

const Utils               = require("../../common/utils");
const TermLoader          = require("../../common/term_loader");
const Logger              = require("../../common/logger");

let logger = new Logger({name: "export-cleanser"});

const TRIALS_FILEPATH = path.join(__dirname,
  '../../import/export_from_pg/trials.json');

class CleanseStream extends Transform {

  constructor(terms) {
    super({objectMode: true});
    this.terms = terms;
  }

  _cleanseTerms(termType, terms) {
    let newTerms = terms.map((term) => {
      // logger.info(termType, term, Utils.transformStringToKey(term));
      return this.terms[termType][Utils.transformStringToKey(term)]["term"];
    });
    return _.uniq(newTerms);
  }

  _transformDiseases(trial) {
    if (!trial.diseases) { return; }
    trial.diseases = trial.diseases.map((disease) => {
      disease.synonyms = this._cleanseTerms("diseases", disease.synonyms);
      return disease;
    });
  }

  _transformOrganizations(trial) {
    if (!trial.sites) { return; }
    trial.sites = trial.sites.map((site) => {
      let org = site.org;
      let organization = org.name;
      if (organization) {
        organization = this._cleanseTerms("organizations", [organization])[0];
        site.org.name = organization;
      }
      return site;
    });
  }

  _transformOrganizationFamilies(trial) {
    if (!trial.sites) { return; }
    trial.sites = trial.sites.map((site) => {
      let org = site.org;
      let organization_family = org.family;
      if (organization_family) {
        organization_family = this._cleanseTerms("organizationFamilies", [organization_family])[0];
        site.org.family = organization_family;
      }
      return site;
    });
  }

  _transformTreatments(trial) {
    if (!trial.arms) { return; }
    trial.arms = trial.arms.map((arm) => {
      let treatment = arm.intervention_name
      if (treatment) {
        treatment = this._cleanseTerms("organizationFamilies", [treatment])[0];
        arm.intervention_name = treatment;
      }
      return arm;
    });
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
        location = this._cleanseTerms("locations", [location])[0];
        site.org.location = location;
      }
      return site;
    });
  }

  _transform(trial, enc, next) {
    logger.info(`Cleansing trial with nci_id (${trial.nci_id}).`);

    this._transformDiseases(trial);
    this._transformOrganizations(trial);
    this._transformOrganizationFamilies(trial);
    this._createLocations(trial);

    this.push(trial);
    next();
  }

}

class TrialsCleanser {

  constructor() {
    this.terms = {};
  }

  _loadTermsFromTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let termLoader = new TermLoader();
    termLoader.loadTermsFromTrialsJsonReadStream(rs, (err) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      this.terms = termLoader.terms;

      return callback();
    });
  }

  _processCleansedTrialsJsonFile(callback) {
    let rs = fs.createReadStream(TRIALS_FILEPATH);
    let js = JSONStream.parse("*");
    let cs = new CleanseStream(this.terms);
    let jw = JSONStream.stringify();
    let ws = fs.createWriteStream("trials.json");

    rs.pipe(js).pipe(cs).pipe(jw).pipe(ws).on("finish", callback);
  }

  static cleanse() {
    logger.info("Started cleansing trials.json.");
    let trialsCleanser = new this();
    async.waterfall([
      (next) => { trialsCleanser._loadTermsFromTrialsJsonFile(next); },
      (next) => { trialsCleanser._processCleansedTrialsJsonFile(next); }
    ], (err) => {
      if (err) { logger.error(err); }
      logger.info("Finished cleansing trials.json.");
    });
  }

}

TrialsCleanser.cleanse();
