import React, { Component } from 'react';
import Fetch from 'isomorphic-fetch';

import ApiFetch from '../../../lib/ApiFetch.js';
import Link from '../../Link';
import Url from '../../../lib/Url';
import Location from '../../../lib/Location';

function createMarkup(text) {
  if(!text) { return {__html: ""}; }
  return {__html: text.replace(/(?:\r\n|\r|\n)/g, '<br />')};
}

export default class extends Component {

  constructor() {
    super();
    this.state = {
      id: null,
      trial: null,
      isLoading: true
    };
  }

  componentDidMount() {
    let { id } = Url.getParams();
    this.setState({ id });
    ApiFetch(`clinical-trial/${id}`)
      .then(response => response.json())
      .then((json) => {
        this.setState({
          trial: json,
          isLoading: false
        });
      });
  }

  render() {
    let { id, trial, isLoading } = this.state;
    if (trial) {
      return (
        <div className="container">
          <div className="back">
            <a href="#back" onClick={Location.goBack}>Back to Your Results</a>
          </div>
          <aside className="card sidebar">
            <h1>Download Trial Info</h1>
            <p>
              You can download a PDF version of this page to share with your
              doctors, caregivers, or to keep it on file.
            </p>
            <a href="#">Download PDF</a>
          </aside>
          <section className="clinical-trial-detail">
            <div className="card">
              <heading>
                <h1>{trial.brief_title}</h1>
              </heading>
              <div className="trial-section">
                <p>{trial.brief_summary}</p>
              </div>
              <div className="trial-section">
                <h2>Locations</h2>
                <ul className="clinical-trial-locations">
                  {trial.sites.map((site, i) =>
                    <li className="clinical-trial-location">
                      <a href={`http://maps.google.com/?q=${[site.org.name, site.org.address_line_1, site.org.city, site.org.state_or_province, site.org.postal_code].join(' ')}`}>
                        {site.org.name}<br/>
                        {site.org.address_line_1}<br/>
                        {site.org.city}, {site.org.state_or_province} {site.org.postal_code}<br/>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
              <div className="trial-section">
                <h2>Detailed Info</h2>
                <div dangerouslySetInnerHTML={createMarkup(trial.detail_description)} />
              </div>
            </div>
          </section>
        </div>
      );
    } else if (!isLoading) {
      return (
        <section className="clinical-trial-detail">
          <div className="container">
            <div className="card">
              <p>No trial with id {id} found.</p>
            </div>
          </div>
        </section>
      );
    } else {
      return (
        <div className="clinical-trial-detail"></div>
      )
    }
  }

}
