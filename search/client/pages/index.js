import React, { Component } from 'react';
import OmniSuggest from '../components/OmniSuggest';

export default class extends Component {

  render() {
    return (
      <div className="index">
        <div className="logo-container">
          Search Clinical Trials
        </div>
        <div className="search-container">
          <OmniSuggest />
        </div>
      </div>
    );
  }

}
