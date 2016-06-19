import React, { Component, PropTypes } from 'react';

import Url from '../../../../lib/Url';

import './Text.scss';

class Text extends Component {

  constructor() {
    super();

    this.state = {
      value: ""
    }

    this.onSubmit = this.onSubmit.bind(this);
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  componentDidMount() {
    let params = Url.getParams();
    let paramValues = params[this.props.paramField] || [];
    if (paramValues.length) {
      this.setState({
        value: paramValues[0]
      });
    }
  }

  escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  onSubmit(event) {
    event.preventDefault();
    let params = {};
    params[this.props.paramField] = [this.escapeRegexCharacters(this.state.value)];
    Url.overwriteParams({ path: "/clinical-trials", params });
  }

  handleValueChange(event) {
    this.setState({ value: event.target.value });
  }

  render() {
    let { paramField, displayName } = this.props;
    const htmlId = paramField.split(".").join("-");

    return (
      <div>
        <form name={paramField} onSubmit={this.onSubmit}>
          <label htmlFor={htmlId}>{displayName}</label>
          <input
            id={htmlId}
            type="text"
            value={this.state.value}
            onChange={this.handleValueChange}
          />
        </form>
      </div>
    );
  }

}

export default Text;
