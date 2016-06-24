import React, { Component } from 'react';

export default class extends Component {

  render() {
    return (
      <div className="customer-service-widget">
        <div className="widget-label">
          <i className="fa fa-phone"></i>Get Help
        </div>
        <div className="widget-detail">
          <h4>Have a Question?</h4>
          <p>We’re here to help.</p>
          <p className="widget-number">
            1-800-4-CANCER<br></br>
            (1-800-422-6237)
          </p>
          <div className="widget-arrow"></div>
        </div>
      </div>
    );
  }
}
