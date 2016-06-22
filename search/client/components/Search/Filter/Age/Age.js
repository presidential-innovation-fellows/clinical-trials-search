import React, { Component, PropTypes } from 'react';

import Url from '../../../../lib/Url';

class Age extends Component {

  constructor() {
    super();

    this.className = "filter-age";

    this.state = {
      age: null,
      minAgeField: "eligibility.structured.min_age_number_lte",
      maxAgeField: "eligibility.structured.max_age_number_gte"
    }

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    this.updateState();
  }

  updateState() {
    let { age, minAgeField, maxAgeField } = this.state;
    let params = Url.getParams();

    if(params[minAgeField] !== age) {
      this.setState({ age: params[minAgeField] })
    }
  }

  updateUrl() {
    let { age, minAgeField, maxAgeField } = this.state;
    let params = {};

    if (age === "") {
      params[minAgeField] = null;
      params[maxAgeField] = null;
      Url.removeParams({ path: "/clinical-trials", params });
    } else {
      params[minAgeField] = age;
      params[maxAgeField] = age;
      Url.overwriteParams({ path: "/clinical-trials", params });
    }
  }

  onChange(event) {
    let age = event.target.value;
    if (this.state.age !== age) {
      this.setState({ age }, this.updateUrl);
    }
  }

  render() {
    return (
      <div className={this.className}>
        <label htmlFor="filter-age-input">Age</label>
        <input id="filter-age-input"
               name="filter-age-input"
               type="number"
               min="0"
               max="200"
               value={this.state.age}
               onChange={this.onChange} />
      </div>
    );
  }

}

export default Age;
