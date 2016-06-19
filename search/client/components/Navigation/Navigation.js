import React, { Component } from 'react';
import './Navigation.scss';
import Link from '../Link';

import './Navigation.scss';

export default class extends Component {

  render() {
    return (
      <div className="navigation">
        <div className="nci-logo">
          <a href="/" onClick={Link.handleClick}>
            <img src="/images/nci-logo-full.svg"/>
          </a>
        </div>
        <div className="nci-home-link">
          <a href="http://www.cancer.gov/">
            Visit Cancer.gov
          </a>
        </div>
      </div>
    );
  }

}
