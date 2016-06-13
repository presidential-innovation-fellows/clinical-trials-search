import React, { Component, PropTypes } from 'react';

export default class extends Component {

  static propTypes = {
    status: PropTypes.object.isRequired,
  };

  static contextTypes = {
    store: PropTypes.object
  };

  render() {
    let { status } = this.props;
    return (
      <span>
        {status.displayKey} {status.value}
      </span>
    );
  };

}
