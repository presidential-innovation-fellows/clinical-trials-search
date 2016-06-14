import React, { Component, PropTypes } from 'react';
import Fetch from 'isomorphic-fetch';

import Url from '../../../../lib/Url';

import './Text.scss';

class Text extends Component {

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  render() {
    let { displayName } = this.props;

    return (
      <div>
        search {displayName} by text
      </div>
    );
  }

}

export default Text;
