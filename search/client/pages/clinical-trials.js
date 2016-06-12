import React, { Component } from 'react';
import Waypoint from 'react-waypoint';
import Fetch from 'isomorphic-fetch';
import ClinicalTrialResult from '../components/ClinicalTrialResult';
import Link from '../components/Link'
import QueryString from 'query-string';

export default class extends Component {

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
    let query = QueryString.parse(location.search);
    const { trials, size, from, numTrialsLoaded } = this.state;

    query.size = size;
    query.from = from;
    this.setState({isLoading: true});
    let url = `http://localhost:3000/clinical-trials?${QueryString.stringify(query)}`;
    Fetch(url)
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

    return (
      <div className="search-page">
        <div className="clinical-trials">
          {trials.map((trial, i) =>
            <ClinicalTrialResult key={trial.nci_id} trial={trial}>
              {this.placeWaypoint(i, trials.length)}
            </ClinicalTrialResult>
          )}
        </div>
      </div>
    )
  }

}
