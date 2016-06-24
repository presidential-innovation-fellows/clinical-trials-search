import React, { Component } from 'react';
import ClinicalTrialResults from '../components/ClinicalTrial/Results';
import SearchStatus from '../components/Search/Status';
import SearchFilter from '../components/Search/Filter';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      totalResults: 0
    };

    this.reportTotalResults = this.reportTotalResults.bind(this);
  }

  reportTotalResults(totalResults) {
    this.setState({ totalResults });
  }

  render() {
    return (
      <div className="clinical-trials-page">
        <SearchFilter />
        <div className="container">
          <SearchStatus totalResults={this.state.totalResults} />
          <ClinicalTrialResults reportTotalResults={this.reportTotalResults} />
        </div>
      </div>
    )
  }

}
