import React, { Component } from 'react';
import Fetch from 'isomorphic-fetch';

import ApiFetch from '../../../lib/ApiFetch.js';
import Link from '../../Link';
import Url from '../../../lib/Url';

import './Detail.scss';

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
        <div className="clinical-trial-detail">
          <div className="card">
            <h1>{trial.brief_title}</h1>
            <div>{trial.brief_summary}</div><br/>
            <div className="clinical-trial-section">
            </div><br/>
            <div className="clinical-trial-section">
              <b>Locations:</b><br/><br/>
              <div className="clinical-trial-locations">
                {trial.sites.map((site, i) =>
                  <div className="clinical-trial-location">
                    <a href={`http://maps.google.com/?q=${[site.org.name, site.org.address_line_1, site.org.city, site.org.state_or_province, site.org.postal_code].join(' ')}`}>
                      {site.org.name}<br/>
                      {site.org.address_line_1}<br/>
                      {site.org.city}, {site.org.state_or_province} {site.org.postal_code}<br/>
                    </a>
                  </div>
                )}
              </div>
            </div><br/>
            <div className="clinical-trial-section">
              <b>Detailed Info:</b><br/><br/>
              <div dangerouslySetInnerHTML={createMarkup(trial.detail_description)} />
            </div><br/><br/><br/>
          </div>
        </div>
      );
    } else if (!isLoading) {
      return (
        <div className="clinical-trial-detail">
          <div className="card">
            No trial with id {id} found.
          </div>
        </div>
      );
    } else {
      return (
        <div className="clinical-trial-detail"></div>
      )
    }
  }

}
