import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import fetch from 'isomorphic-fetch';
import Waypoint from 'react-waypoint';

require('styles//Search.sass');

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
    fetch(`http://localhost:3000/clinical-trials?${serialize(query)}`)
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
      <div className="search-page">
        <Link to="/">home</Link>
        <div className="clinical-trials">
          {trials.map((trial, i) =>
            <div className="clinical-trial-brief">
              <h3>
                <Link to={"/clinical-trial/" + trial.nci_id}>
                  {trial.brief_title}
                  </Link>
              </h3>
              <div>
                <b>Status:</b> {trial.current_trial_status}
              </div>
              <div>
                <b>Phase:</b> <span>{trial.phase.phase.split("_").join(", ")}</span>
              </div>
              <div>
                <b>Treatment:</b> <span>{trial.treatments.join(", ")}</span>
              </div>
              <div>
                <b>Condition{trial.diseases.length > 1 ? "s" : ""}:</b>{" "}
                {trial.diseases.slice(0,3).map((disease, i) =>
                  <span>
                    <span>{disease.disease_menu_display_name}</span>
                    {i < 2 ? ", " : ""}
                  </span>
                )}
              </div>
              {this.placeWaypoint(i, trials.length)}
            </div>
          )}
        </div>
      </div>
    )
  }

}

export default Search;
