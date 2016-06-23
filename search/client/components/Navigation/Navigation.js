import React, { Component } from 'react';
import Link from '../Link';

export default class extends Component {

  render() {
    return (
      <div className="navigation">
        <div className="container">
          <div className="nci-logo">
            <a href="/" onClick={Link.handleClick}>
              <img src="/images/nci-logo-full.svg"/>
            </a>
          </div>
        </div>
      </div>
    );
  }

}
