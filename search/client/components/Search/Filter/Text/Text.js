import React, { Component, PropTypes } from 'react';
import ReactSelect from 'react-select';

import Url from '../../../../lib/Url';

import './Text.scss';

class Text extends Component {

  constructor() {
    super();

    this.className = "filter-text";

    this.state = {
      selectedValues: [],
      inputText: "",
      placeholderText: ""
    }

    this.onChange = this.onChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.newOptionCreator = this.newOptionCreator.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  componentWillUpdate() {
    let params = Url.getParams();
    let paramValues = params[this.props.paramField] || [];
    let values = paramValues.map((value) => {
      return { term: value };
    });
    if (JSON.stringify(this.state.selectedValues) !== JSON.stringify(values)) {
      this.setState({
        selectedValues: values
      });
    }
  }

  onChange(values) {
    let params = {};
    params[this.props.paramField] = [];
    if (values && values.length) {
      params[this.props.paramField] = values.map((value) => {
        return value.term;
      });
    }
    Url.overwriteParams({ path: "/clinical-trials", params });

    this.setState({ selectedValues: values });
  }

  onInputChange(input) {
    this.setState({ inputText: this.escapeRegexCharacters(input) });
  }

  newOptionCreator(option) {
    debugger;
  }

  render() {
    const { paramField, displayName } = this.props;
    const htmlId = paramField.split(".").join("-");
    const inputProps = {
      id: htmlId,
    };

    return (
      <div className={this.className}>
        <label htmlFor={htmlId}>{displayName}</label>
        <ReactSelect name={paramField}
                     value={this.state.selectedValues}
                     multi={true}
                     allowCreate
                     valueKey="term"
                     labelKey="term"
                     onChange={this.onChange}
                     inputProps={inputProps}
                     placeholder={this.state.placeholderText}
                     onInputChange={this.onInputChange}
                     openOnFocus={false}
                     noResultsText=""
                     newOptionCreator={this.newOptionCreator} />
      </div>
    );
  }

}

export default Text;
