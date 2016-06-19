import React, { Component } from 'react';
import OmniSuggest from '../components/OmniSuggest';

export default class extends Component {

  render() {
    return (
      <div className="index-page">
        <div className="index-search">
          <div className="search-prompt-container">
            Search Cancer Clinical Trials
          </div>
          <div className="search-container">
            <OmniSuggest />
          </div>
        </div>
        <div className="index-about">
          <div className="card">
            <h1>What are Clinical Trials?</h1>
            <p>Clinical trials are research studies that involve people. They are the final step in a long process that begins with research in the lab. Most treatments we use today are the results of past clinical trials.</p>
            <p>
              Cancer clinical trials are designed to test new ways to:
              <br/>
              Treat cancer
              <br/>
              Find and diagnose cancer
              <br/>
              Prevent cancer
              <br/>
            </p>
          </div>
        </div>
      </div>
    );
  }

}
