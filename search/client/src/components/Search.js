import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import fetch from 'isomorphic-fetch';
import Waypoint from 'react-waypoint';

function createMarkup(text) {
  window.tester = text;
  return {__html: text.replace(/(?:\r\n|\r|\n)/g, '<br />')};
}

function serialize(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

class Search extends Component {

  constructor() {
    super();

    this.state = {
      trials: [],
      size: 10,
      from: 0,
      hasMore: false,
      isLoading: false,
    };

    this.loadTrials = this.loadTrials.bind(this);
  }

  loadTrials() {
    let { query } = this.props.location;
    const { trials, size, from, numTrialsLoaded } = this.state;

    query.size = size;
    query.from = from;
    this.setState({isLoading: true});
    // fetch(`http://localhost:3000/search/trials`)
    fetch(`http://localhost:3000/search/trials?${serialize(query)}`)
      .then(response => response.json())
      .then((json) => {
        let numTrialsLoaded = from + size;
        let hasMore = json.total > numTrialsLoaded;
        this.setState({
          trials: trials.concat(json.trials),
          from: numTrialsLoaded,
          hasMore,
          isLoading: false
        });
      });
  }

  componentDidMount() {
    this.loadTrials();
  }

  placeWaypoint(itemNum, listLength) {
    if(itemNum === listLength - 3) {
      return (
        <Waypoint key={this.from} onEnter={this.loadTrials} />
      )
    }
  }

  render() {
    const { trials } = this.state;

    trials.forEach((trial) => {
      let treatmentsHash = {};
      let treatments = [];
      if(trial.arms) {
        trial.arms.forEach((arm) => {
          treatmentsHash[arm.intervention_type] = 1;
        });
        treatments = Object.keys(treatmentsHash);
      }
      trial.treatments = treatments;
    });

    return (
      <section className="search-page">
        <header className="page-header">
          <h1>Results for</h1>
        </header>
        <div className="sidebar">
          <h2>Filter Results</h2>
          <form>
            <fieldset className="usa-fieldset-inputs">
              <legend>Phases</legend>
              <ul className="usa-unstyled-list phases">
                <li>
                  <input id="apple-pie" type="checkbox" name="phases" value="apple-pie" />
                  <label htmlFor="apple-pie">Phase 1</label>
                </li>
                <li>
                  <input id="key-lime-pie" type="checkbox" name="phases" value="key-lime-pie" />
                  <label htmlFor="key-lime-pie">Phase 2</label>
                </li>
                <li>
                  <input id="peach-pie" type="checkbox" name="phases" value="peach-pie" />
                  <label htmlFor="peach-pie">Phase 3</label>
                </li>
                <li>
                  <input id="disabled" type="checkbox" name="phases" disabled="" />
                  <label htmlFor="disabled">Phase 4</label>
                </li>
              </ul>
            </fieldset>
            <div className="location">
              <label htmlFor="location">Location</label>
              <input id="location" type="string" name="location" placeholder="Enter a Location" />
            </div>
            <div className="advanced-search">
              <h3>Advanced Search</h3>
              <div id="advanced-search-content">
                <ul className="usa-unstyled-list">
                  <li>
                    <label htmlFor="keywords">Keywords</label>
                    <input id="keywords" type="string" name="keywords" placeholder="Enter Keywords" />
                  </li>
                  <li>
                    <label htmlFor="treatments">Treatments</label>
                    <input id="treatments" type="string" name="treatments" placeholder="Search for Treatments" />
                  </li>
                  <li>
                    <label htmlFor="drugs">Drugs</label>
                    <input id="drugs" type="string" name="drugs" placeholder="Search by Drug Name or ID" />
                  </li>
                  <li>
                    <input id="hiv-positive" type="checkbox" name="hiv-positive" value="hiv-positive" />
                    <label htmlFor="hiv-positive">HIV Positive</label>
                  </li>
                </ul>
              </div>
            </div>
          </form>
        </div>
        <div className="clinical-trials">
          {trials.map((trial, i) =>
            <div className="clinical-trial-brief">
              <h3>
                <Link to={"/clinical-trial/" + trial.nci_id}>
                  {trial.brief_title}
                  </Link>
              </h3>
              <ul>
                <li>
                  <b>Status:</b> {trial.current_trial_status}
                </li>
                <li>
                  <b>Phase:</b> <span>{trial.phase.split("_").join(", ")}</span>
                </li>
                <li>
                  <b>Treatment:</b> <span>{trial.treatments.join(", ")}</span>
                </li>
                <li>
                  <b>Condition{trial.diseases.length > 1 ? "s" : ""}:</b>{" "}
                  {trial.diseases.slice(0,3).map((disease, i) =>
                    <span>
                      <span>{disease.disease_menu_display_name}</span>
                      {i < 2 ? ", " : ""}
                    </span>
                  )}
                </li>
                {this.placeWaypoint(i, trials.length)}
              </ul>
            </div>
          )}
        </div>
      </section>
    )
  }

}

export default Search;
