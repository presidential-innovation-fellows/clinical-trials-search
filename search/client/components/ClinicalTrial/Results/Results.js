import React, { Component, PropTypes } from 'react';

import Waypoint from 'react-waypoint';
import Fetch from 'isomorphic-fetch';

import ApiFetch from '../../../lib/ApiFetch.js';
import ClinicalTrialResult from '../Result';
import Link from '../../Link'
import Location from '../../../lib/Location';
import Url from '../../../lib/Url';

import './Results.scss';

export default class extends Component {

  get LOAD_SIZE() {
    return 10;
  }

  constructor() {
    super();

    this.state = {
      query: {},
      trials: [],
      size: this.LOAD_SIZE,
      from: 0,
      hasMore: false,
      isLoading: false,
      queryLoaded: false,
      total: 0
    };

    this.loadTrials = this.loadTrials.bind(this);
  }

  static propTypes = {
    reportTotalResults: PropTypes.func
  };

  loadTrials() {
    const { trials, size, from, isLoading } = this.state;
    let query = Url.getParams();
    let queryCopy = Url.getParams();
    query.size = size;
    query.from = from;
    query.include = [
      "nci_id",
      "brief_title",
      "current_trial_status",
      "phase",
      "arms.interventions.intervention_name",
      "arms.interventions.intervention_type",
      "diseases.disease.display_name"
    ]
    this.setState({
      isLoading: true,
      query: queryCopy
    });
    const { reportTotalResults } = this.props;
    ApiFetch(`clinical-trials?${Url.stringifyParams(query)}`)
      .then(response => response.json())
      .then((json) => {
        let numTrialsLoaded = from + size;
        let hasMore = json.total > numTrialsLoaded;
        this.setState({
          trials: from ? trials.concat(json.trials) : json.trials,
          from: numTrialsLoaded,
          hasMore,
          isLoading: false,
          queryLoaded: true,
          total: json.total
        });
        reportTotalResults(json.total);
      });
  }

  componentDidMount() {
    if (!this.state.queryLoaded) {
      this.loadTrials();
    }
  }

  componentWillUpdate() {}

  componentDidUpdate() {
    const queryChanged = Url.areParamsDiff(this.state.query);
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
    const { trials, total } = this.state;

    if (total) {
      return (
        <div className="clinical-trials">
          <div>
            {trials.map((trial, i) =>
              <ClinicalTrialResult key={trial.nci_id} trial={trial}>
                {this.placeWaypoint(i, trials.length)}
              </ClinicalTrialResult>
            )}
          </div>
        </div>
      )
    } else {
      return (
        <div className="clinical-trials">
          No results found. <a href="/" onClick={Link.handleClick}>Start a new search?</a>
        </div>
      )
    }
  }

}
