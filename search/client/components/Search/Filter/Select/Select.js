import React, { Component, PropTypes } from 'react';
import ReactSelect from 'react-select';
import AutosuggestHighlight from 'autosuggest-highlight';

import ApiFetch from '../../../../lib/ApiFetch.js';
import Url from '../../../../lib/Url';

import './Select.scss';

class Select extends Component {

  constructor() {
    super();

    this.className = "filter-select";

    this.state = {
      selectedValues: [],
      inputText: "",
      minimumInput: 0,
      placeholderText: ""
    }

    this.getOptions = this.getOptions.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.optionRenderer = this.optionRenderer.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  componentDidMount() {
    let params = Url.getParams();
    let paramValues = params[this.props.paramField] || [];
    let values = paramValues.map((value) => {
      return { term: value };
    });
    this.setState({
      selectedValues: values
    });
  }

  escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getOptions(input, callback) {
    let { paramField } = this.props;
    ApiFetch(`terms?term=&term_type=${paramField}&size=100`)
    .then((response) => {
      return response.json();
    }).then((json) => {
      return callback(null, {
        options: json.terms,
        complete: true
      });
    });
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

  optionRenderer(option) {
    const query = this.state.inputText;
    const suggestionText = option.term;
    const matches = AutosuggestHighlight.match(suggestionText, query);
    const parts = AutosuggestHighlight.parse(suggestionText, matches);
    return <span className='text'>
      {
        parts.map((part, index) => {
          const className = part.highlight ? 'filter-select-highlight' : null;

          return (
            <span className={className} key={index}>{part.text}</span>
          );
        })
      }
    </span>
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
        <ReactSelect.Async name={paramField}
                           value={this.state.selectedValues}
                           multi={true}
                           valueKey="term"
                           labelKey="term"
                           loadOptions={this.getOptions}
                           onChange={this.onChange}
                           inputProps={inputProps}
                           placeholder={this.state.placeholderText}
                           optionRenderer={this.optionRenderer}
                           onInputChange={this.onInputChange}
                           minimumInput={this.state.minimumInput} />
      </div>
    );
  }

}

export default Select;
