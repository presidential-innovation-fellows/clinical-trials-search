'use strict';

import React from 'react';
import $ from 'jquery';
import Autosuggest from 'react-autosuggest';
import AutosuggestHighlight from 'autosuggest-highlight';

require('styles//Suggester.sass');

// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// function renderSuggestion(suggestion) {
//   return (
//     <span>{suggestion.text}, {suggestion.classification}</span>
//   );
// }

function renderSuggestion(suggestion, { value, valueBeforeUpDown }) {
  const suggestionText = suggestion.text;
  const query = (valueBeforeUpDown || value).trim();
  const matches = AutosuggestHighlight.match(suggestionText, query);
  const parts = AutosuggestHighlight.parse(suggestionText, matches);

  let classificationText = {
    'organization': 'hospital/center',
    'organization_family': 'network/organization',
    'disease': 'disease',
    'location': 'location'
  }[suggestion.classification];

  return (
    <span className={'suggestion-content ' + suggestion.classification}>
      <span className='text'>
        {
          parts.map((part, index) => {
            const className = part.highlight ? 'suggester-highlight' : null;

            return (
              <span className={className} key={index}>{part.text}</span>
            );
          })
        }
      </span>
      <span className='suggestion-classification'>&nbsp;({classificationText})</span>
    </span>
  );
}

function getSuggestionValue(suggestion) { // when suggestion selected, this function tells
  return suggestion.text;                 // what should be the value of the input
}

class SuggesterComponent extends React.Component {
  constructor() {
    super();

    this.state = {
      value: '',
      suggestions: []
    };

    this.onChange = this.onChange.bind(this);
    this.onSuggestionsUpdateRequested = this.onSuggestionsUpdateRequested.bind(this);
  }

  loadSuggestions(value) {
    this.setState({});

    let queryUrl =
      `http://localhost:3000/search/terms?term=${escapeRegexCharacters(value)}`;
    $.getJSON(queryUrl, (data) => {
      var suggestions = data.terms;
      // console.log(suggestions);
      if (value === this.state.value) {
        this.setState({
          suggestions
        });
      } else { // Ignore suggestions if input value changed
        this.setState({});
      }
    });

  }

  onChange(event, { newValue }) {
    this.setState({
      value: newValue
    });
  }

  onSuggestionSelected(event, { suggestionValue }) {
    this.loadSuggestions(suggestionValue);
  }

  onSuggestionsUpdateRequested({ value }) {
    this.loadSuggestions(value);
  }

  render() {
    const { value, suggestions } = this.state;
    const inputProps = {
      placeholder: 'enter a disease, location, or organization',
      value,
      onChange: this.onChange
    };

    return (
      <div>
        <Autosuggest suggestions={suggestions}
                     onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
                     getSuggestionValue={getSuggestionValue}
                     renderSuggestion={renderSuggestion}
                     inputProps={inputProps} />
        <div className='search-icon'>
          <img src='images/search-icon.svg' />
        </div>
      </div>
    );
  }
}

SuggesterComponent.displayName = 'SuggesterComponent';

// Uncomment properties you need
// SuggesterComponent.propTypes = {};
// SuggesterComponent.defaultProps = {};

export default SuggesterComponent;
