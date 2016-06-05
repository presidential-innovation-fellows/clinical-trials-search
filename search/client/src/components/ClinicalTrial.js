import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import fetch from 'isomorphic-fetch';

require('styles//ClinicalTrial.sass');

function createMarkup(text) {
  if(!text) { return {__html: ""}; }
  return {__html: text.replace(/(?:\r\n|\r|\n)/g, '<br />')};
}

class ClinicalTrial extends Component {

  constructor() {
    super();

    this.state = {
      trials: []
    };
  }

  componentDidMount() {
    let { id } = this.props.params;
    fetch(`http://localhost:3000/clinical-trial/${id}`)
      .then(response => response.json())
      .then((json) => {
        this.setState({
          trials: [json]
        });
      });
  }

  render() {
    let { id } = this.props.params;
    return (
      <div className="clinical-trial-page">
        <Link to="/">home</Link>
        {this.state.trials.map((trial, i) =>
          <div className="clinical-trial-detail">
            <h1>{trial.brief_title}</h1>
            <div>{trial.brief_summary}</div><br/>
            <div className="clinical-trial-section">
              <b>Sponsor:</b><br/><br/>
              <div>{trial.sponsor.sponsor}</div>
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
        )}
      </div>
    );
  }
}

export default ClinicalTrial;
