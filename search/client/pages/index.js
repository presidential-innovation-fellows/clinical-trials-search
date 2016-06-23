import React, { Component } from 'react';
import OmniSuggest from '../components/OmniSuggest';

export default class extends Component {

  render() {
    return (
      <div className="index-page">
        <section className="index-search">
          <div className="container">
            <div className="search-container">
              <h1>
                <label for="clinical-trials-search">
                  Search Cancer Clinical Trials
                </label>
              </h1>
              <OmniSuggest />
            </div>
          </div>
        </section>
        <section className="index-about">
          <div className="container">
            <div className="main-content">
              <div className="card">
                <h1>What are Clinical Trials?</h1>
                <p>Clinical trials are research studies that involve people. They are the final step in a long process that begins with research in the lab. Most treatments we use today are the results of past clinical trials.</p>
                <p>
                  Cancer clinical trials are designed to test new ways to treat cancer, find and diagnose cancer, and explore ways to prevent cancer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
