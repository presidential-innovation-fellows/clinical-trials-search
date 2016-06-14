import React, { Component, PropTypes } from 'react';
import Fetch from 'isomorphic-fetch';

import Url from '../../../../lib/Url';

import './Date.scss';

class Date extends Component {

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  render() {
    let { displayName } = this.props;

    return (
      <div>
        filter {displayName} using dates
      </div>
    );
  }

}

export default Date;
