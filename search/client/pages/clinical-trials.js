import React, { Component } from 'react';
import ClinicalTrialResults from '../components/ClinicalTrial/Results';
import SearchStatus from '../components/Search/Status';
import SearchFilter from '../components/Search/Filter';

export default class extends Component {

  render() {
    return (
      <div className="clinical-trials-page">
        <SearchFilter />
        <br/>
        <SearchStatus />
        <ClinicalTrialResults />
      </div>
    )
  }

}
