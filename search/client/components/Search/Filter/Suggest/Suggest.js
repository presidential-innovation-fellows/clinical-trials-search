import React, { Component, PropTypes } from 'react';
import Fetch from 'isomorphic-fetch';
import Autosuggest from 'react-autosuggest';
import AutosuggestHighlight from 'autosuggest-highlight';
import Similarity from 'string-similarity';

import Url from '../../../../lib/Url';

import './Suggest.scss';

function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderSuggestion(suggestion, { value, valueBeforeUpDown }) {
  const suggestionText = suggestion.term;
  const query = (valueBeforeUpDown || value).trim();
  const matches = AutosuggestHighlight.match(suggestionText, query);
  const parts = AutosuggestHighlight.parse(suggestionText, matches);

  return (
    <span className={'suggestion-content'}>
      <span className='text'>
        {
          parts.map((part, index) => {
            const className = part.highlight ? 'filter-suggest-highlight' : null;

            return (
              <span className={className} key={index}>{part.text}</span>
            );
          })
        }
      </span>
    </span>
  );
}

function getSuggestionValue(suggestion) { // when suggestion selected, this function tells
  return suggestion.term;                 // what should be the value of the input
}

class Suggest extends Component {

  constructor() {
    super();

    this.state = {
      value: '',
      suggestions: []
    };

    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onSuggestionsUpdateRequested = this.onSuggestionsUpdateRequested.bind(this);
    this.onSuggestionSelected = this.onSuggestionSelected.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  loadSuggestions(value) {
    this.setState({});

    let term = escapeRegexCharacters(value);
    let {paramField} = this.props;
    Fetch(`http://localhost:3000/terms?term=${term}&term_type=${paramField}`)
      .then(response => response.json())
      .then((json) => {
        let suggestions = json.terms;
        if (value === this.state.value) {
          this.setState({
            suggestions
          });
        } else { // Ignore suggestions if input value changed
          this.setState({});
        }
      });
  }

  componentDidMount() {}

  onChange(event, { newValue }) {
    this.setState({
      value: newValue
    });
  }

  gotoSearch(event, params) {
    Url.addParams({ path: "/clinical-trials", params });
    this.setState({
      value: ""
    });
  }

  onSubmit(event) {
    event.preventDefault();
    let { value, suggestions } = this.state;
    let { paramField } = this.props;
    let params = {};
    params[paramField] = value;
    return this.gotoSearch(event, params);
  }

  onSuggestionSelected(event, { suggestion, suggestionValue }) {
    if (event.type === "click") {
      let { term_type, term } = suggestion;
      let params = {};
      params[term_type] = term;
      this.gotoSearch(event, params);
    }
  }

  onSuggestionsUpdateRequested({ value, reason }) {
    if (reason === "type") {
      // don't load suggestions or change state if the user is
      // selecting an option
      this.loadSuggestions(value);
    }
  }

  render() {
    const { value, suggestions } = this.state;
    const inputProps = {
      placeholder: `filter by ${this.props.displayName}`,
      value,
      onChange: this.onChange
    };

    return (
      <div className="filter-suggest">
        <form onSubmit={this.onSubmit}>
          <Autosuggest suggestions={suggestions}
                       onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
                       onSuggestionSelected={this.onSuggestionSelected}
                       getSuggestionValue={getSuggestionValue}
                       renderSuggestion={renderSuggestion}
                       inputProps={inputProps} />
        </form>
      </div>
    );
  }
}

export default Suggest;
