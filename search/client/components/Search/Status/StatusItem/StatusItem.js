import React, { Component, PropTypes } from 'react';

import Url from '../../../../lib/Url';

export default class extends Component {

  constructor() {
    super();

    this.removeParam = this.removeParam.bind(this);
  }

  static propTypes = {
    status: PropTypes.object.isRequired,
  };

  removeParam() {
    const { status } = this.props;
    let params = {};
    if (status.key === "eligibility.structured.max_age_number_gte" ||
        status.key === "eligibility.structured.min_age_number_lte")
    {
      params["eligibility.structured.max_age_number_gte"] = null;
      params["eligibility.structured.min_age_number_lte"] = null;
    } else {
      params[status.key] = status.value;
    }
    Url.removeParams({ path: "/clinical-trials", params });
  }

  render() {
    let { status } = this.props;
    return (
      <span className="status-item">
        <span className="remove-status" onClick={this.removeParam}>[x]</span>{" "}
        <span>{status.value}</span>
      </span>
    );
  };

}
