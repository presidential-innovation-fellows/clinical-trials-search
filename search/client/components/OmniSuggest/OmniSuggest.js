import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { newParams } from '../../actions';
import fetch from 'isomorphic-fetch';
import Autosuggest from 'react-autosuggest';
import AutosuggestHighlight from 'autosuggest-highlight';
import Location from '../../lib/Location';
import Similarity from 'string-similarity';

import './OmniSuggest.scss';

function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSubTypeFromTerm(term) {
  let match = term.match(/ \((.*)\)/);
  let subType = null;
  if (match instanceof Array) {
    term = term.replace(match[0], "");
    subType = match[1];
  }
  return { term, subType };
}

function renderSuggestion(suggestion, { value, valueBeforeUpDown }) {
  const suggestionText = suggestion.term;
  const query = (valueBeforeUpDown || value).trim();
  const matches = AutosuggestHighlight.match(suggestionText, query);
  const parts = AutosuggestHighlight.parse(suggestionText, matches);

  let termTypeText = {
    "diseases.synonyms": "disease",
    "sites.org.location": "location",
    "sites.org.name": "hospital/center",
    "sites.org.family": "network/organization",
    "anatomic_sites": "anatomic site",
    "arms.treatment": suggestion.sub_type ? `treatment - ${suggestion.sub_type.toLowerCase()}` : `treatment`
  }[suggestion.term_type];

  return (
    <span className={'suggestion-content ' + suggestion.term_type}>
      <span className='text'>
        {
          parts.map((part, index) => {
            const className = part.highlight ? 'omni-suggest-highlight' : null;

            return (
              <span className={className} key={index}>{part.text}</span>
            );
          })
        }
      </span>
      <span className='suggestion-type'>&nbsp;({termTypeText})</span>
    </span>
  );
}

function getSuggestionValue(suggestion) { // when suggestion selected, this function tells
  return suggestion.term;                 // what should be the value of the input
}

class OmniSuggest extends Component {

  get SIMILARITY_THRESHOLD() {
    return 0.8;
  }

  static contextTypes = {
    store: PropTypes.object
  };

  constructor() {
    super();

    this.state = {
      value: '',
      suggestions: []
    };

    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onSuggestionsUpdateRequested = this.onSuggestionsUpdateRequested.bind(this);
    // this.onSuggestionSelected = this.onSuggestionSelected.bind(this);
  }

  loadSuggestions(value) {
    this.setState({});

    let term = escapeRegexCharacters(value);
    fetch(`http://localhost:3000/terms?term=${term}`)
      .then(response => response.json())
      .then((json) => {
        let suggestions = json.terms.map((suggestion) => {
          if (suggestion.term_type === "arms.treatment") {
            let {term, subType} = extractSubTypeFromTerm(suggestion.term);
            suggestion.term = term;
            suggestion.sub_type = subType;
          }
          return suggestion;
        });
        if (value === this.state.value) {
          this.setState({
            suggestions
          });
        } else { // Ignore suggestions if input value changed
          this.setState({});
        }
      });
  }

  componentDidMount() {
    let store = this.context.store;
    let unsubscribe = store.subscribe(() =>
      // console.log(store.getState())
    );
  }

  onChange(event, { newValue }) {
    this.setState({
      value: newValue
    });
  }

  gotoResults(event, {term_type, term}) {
    let store = this.context.store;
    let params = {}
    params[term_type] = term;
    store.dispatch(newParams(params));
    // let query = `${suggestion.term_type}=${encodeURIComponent(suggestion.term)}`
  }

  onSubmit(event) {
    event.preventDefault();
    let { value, suggestions } = this.state;
    let query = { "_all": encodeURIComponent(value) };
    if (suggestions.length) {
      let topSuggestion = suggestions[0];
      if (topSuggestion) {
        let term = topSuggestion.term;
        if (topSuggestion.term_type === "location") {
          let locParts = topSuggestion.term.split(", ");
          if (locParts.length) { term = locParts[0]; }
        }
        let similarity = Similarity.compareTwoStrings(value, term);
        if (similarity > this.SIMILARITY_THRESHOLD) {
          return this.gotoResults(event, topSuggestion);
        }
      }
    }
    return this.gotoResults(event, {
      "term_type": "_all",
      "term": value
    });
    // Location.push(`/clinical-trials?${query}`);
  }

  // onSuggestionSelected(event, { suggestion, suggestionValue }) {
  //   this.gotoResults(event, suggestion);
  // }

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
      placeholder: 'enter a disease, location, organization, or treatment',
      value,
      onChange: this.onChange
    };

    return (
      <div className="omni-suggest">
        <form onSubmit={this.onSubmit}>
          <Autosuggest suggestions={suggestions}
                       onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
                       onSuggestionSelected={this.onSuggestionSelected}
                       getSuggestionValue={getSuggestionValue}
                       renderSuggestion={renderSuggestion}
                       inputProps={inputProps} />
          <div className='search-icon'>
            <input type="image" src="images/search-icon.svg" alt="Submit Form" />
          </div>
        </form>
      </div>
    );
  }
}

OmniSuggest = connect()(OmniSuggest);

export default OmniSuggest;
