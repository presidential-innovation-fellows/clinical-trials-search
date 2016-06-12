import React, { Component, PropTypes } from 'react';

import QueryString from 'query-string';
import Waypoint from 'react-waypoint';
import Fetch from 'isomorphic-fetch';

import ClinicalTrialResult from '../Result';
import Link from '../../Link'
import Location from '../../../lib/Location';

import './Results.scss';

export default class extends Component {

  get LOAD_SIZE() {
    return 10;
  }

  static contextTypes = {
    store: PropTypes.object
  };

  constructor() {
    super();

    this.state = {
      query: {},
      trials: [],
      size: this.LOAD_SIZE,
      from: 0,
      hasMore: false,
      isLoading: false,
      queryLoaded: false
    };

    this.loadTrials = this.loadTrials.bind(this);
  }

  loadTrials() {
    const { trials, size, from, isLoading } = this.state;
    let query = QueryString.parse(location.search);
    let queryCopy = QueryString.parse(location.search);
    query.size = size;
    query.from = from;
    this.setState({
      isLoading: true,
      query: queryCopy
    });
    let url = `http://localhost:3000/clinical-trials?${QueryString.stringify(query)}`;
    Fetch(url)
      .then(response => response.json())
      .then((json) => {
        let numTrialsLoaded = from + size;
        let hasMore = json.total > numTrialsLoaded;
        this.setState({
          trials: from ? trials.concat(json.trials) : json.trials,
          from: numTrialsLoaded,
          hasMore,
          isLoading: false,
          queryLoaded: true
        });
      });
  }

  componentDidMount() {
    if (!this.state.queryLoaded) {
      this.loadTrials();
    }
  }

  componentWillUpdate() {}

  componentDidUpdate() {
    let query = QueryString.parse(location.search);
    const queryChanged = JSON.stringify(this.state.query) !== JSON.stringify(query);
    if (queryChanged && this.state.queryLoaded) {
      this.setState({ from: 0, queryLoaded: false }, () => {
        this.loadTrials();
      });
    }
  }

  componentWillReceiveProps(nextProps) {}

  placeWaypoint(itemNum, listLength) {
    if(listLength >= this.LOAD_SIZE && itemNum === listLength - 3) {
      return (
        <Waypoint key={this.from} onEnter={this.loadTrials} />
      )
    }
  }

  render() {
    const { trials } = this.state;

    return (
      <div className="clinical-trials">
        {trials.map((trial, i) =>
          <ClinicalTrialResult key={trial.nci_id} trial={trial}>
            {this.placeWaypoint(i, trials.length)}
          </ClinicalTrialResult>
        )}
      </div>
    )
  }

}
