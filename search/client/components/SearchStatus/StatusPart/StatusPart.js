import React, { Component, PropTypes } from 'react';

import Url from '../../../lib/Url';

import './StatusPart.scss';

export default class extends Component {

  constructor() {
    super();

    this.removeParam = this.removeParam.bind(this);
  }

  static propTypes = {
    status: PropTypes.object.isRequired,
  };

  static contextTypes = {
    store: PropTypes.object
  };

  removeParam() {
    const { status } = this.props;
    let params = {};
    params[status.key] = status.value;
    Url.removeParams({ path: "/clinical-trials", params });
  }

  render() {
    let { status } = this.props;
    return (
      <span>
        <span>{status.displayKey} {status.value}</span>{" "}
        <span className="removeStatusPart" onClick={this.removeParam}>[x]</span>
      </span>
    );
  };

}
