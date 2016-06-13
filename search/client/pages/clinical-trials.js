import React, { Component } from 'react';
import ClinicalTrialResults from '../components/ClinicalTrial/Results';
import SearchStatus from '../components/SearchStatus';

export default class extends Component {

  render() {
    return (
      <div className="clinical-trials-page">
        <SearchStatus />
        <ClinicalTrialResults />
      </div>
    )
  }

}
