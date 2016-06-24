import React, { Component, PropTypes } from 'react';

import Url from '../../../../lib/Url';

class Gender extends Component {

  constructor() {
    super();

    this.className = "filter-gender";

    this.state = {
      isMaleChecked: true,
      isFemaleChecked: true
    }

    this.onChange = this.onChange.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  componentDidMount() {
    this.updateState();
  }

  componentWillUpdate() {
    this.updateState();
  }

  updateState() {
    let { isMaleChecked, isFemaleChecked } = this.state;
    let params = Url.getParams();
    let paramValues = params[this.props.paramField] || [];
    let urlValues = {};
    paramValues.forEach((paramValue) => { urlValues[paramValue.toLowerCase()] = 1; });
    if (urlValues["male"] && urlValues["both"]) {
      if (!isMaleChecked) {
        this.setState({ isMaleChecked: true });
      }
    } else if (urlValues["female"] && urlValues["both"]) {
      if (!isFemaleChecked) {
        this.setState({ isFemaleChecked: true });
      }
    } else {
      if (!isMaleChecked || !isFemaleChecked) {
        this.setState({
          isMaleChecked: true,
          isFemaleChecked: true
        });
      }
    }
  }

  updateUrl() {
    let { isMaleChecked, isFemaleChecked } = this.state;
    let paramValues = [];
    if (isMaleChecked && isFemaleChecked) {
      // nada
    } else if (isMaleChecked) {
      paramValues = ["both", "male"];
    } else if (isFemaleChecked) {
      paramValues = ["both", "female"];
    } else {
      // nada
    }

    let params = {};
    params[this.props.paramField] = paramValues;

    Url.overwriteParams({ path: "/clinical-trials", params });
  }

  onChange(event) {
    let { isMaleChecked, isFemaleChecked } = this.state;
    switch(event.target.name) {
      case "male":
        return this.setState({isMaleChecked: !isMaleChecked}, this.updateUrl);
      case "female":
        return this.setState({isFemaleChecked: !isFemaleChecked}, this.updateUrl);
    }
  }

  render() {
    const { paramField, displayName } = this.props;

    return (
      <div className={this.className}>
        <fieldset>
          <legend>{displayName}</legend>
          <div className="checkbox-container">
            <input name="male" id="male" type="checkbox" checked={this.state.isMaleChecked} onChange={this.onChange}></input>
            <label htmlFor="male"><span>Male</span></label>
          </div>
          <div className="checkbox-container">
            <input name="female" id="female" type="checkbox" checked={this.state.isFemaleChecked} onChange={this.onChange}></input>
            <label htmlFor="female"><span>Female</span></label>
          </div>
        </fieldset>
      </div>
    );
  }

}

export default Gender;
