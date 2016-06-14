import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import FilterSuggest from './Suggest'
import Url from '../../../lib/Url';

import './Filter.scss';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      showFilters: false
    }

    this.toggleFilters = this.toggleFilters.bind(this);
  }

  toggleFilters() {
    let { showFilters } = this.state;
    this.setState({ showFilters: !showFilters });
  }

  render() {
    let { showFilters } = this.state;
    var filters;
    if (showFilters) {
      filters = (
        <div>
          <FilterSuggest paramField="sites.org.location" displayName="location" />
          <FilterSuggest paramField="diseases.synonyms" displayName="disease" />
          <FilterSuggest paramField="sites.org.name" displayName="hospital/center" />
          <FilterSuggest paramField="sites.org.family" displayName="network/organization" />
          <FilterSuggest paramField="anatomic_sites" displayName="anatomic site" />
          <FilterSuggest paramField="arms.treatment" displayName="treatment" />
          <div>TODO: filter select by status</div>
          <div>TODO: filter slide by max age</div>
          <div>TODO: filter select by gender</div>
          <div>TODO: search by nci id</div>
          <div>TODO: search by nct id</div>
          <div>TODO: search by title</div>
          <div>TODO: search anywhere in the trial (_all)</div>
          <div>TODO: filter date by last updated</div>
          <div>TODO: filter select by interventional model</div>
          <div>TODO: filter select by masking?</div>
          <div>TODO: filter select by phase</div>
          <div>TODO: filter select by protocol type</div>
          <div>TODO: filter select by primary purpose</div>

          <div>add default search for open trials</div>
        </div>
      );
    }

    return (
      <ReactCSSTransitionGroup
        transitionName="fade-transition"
        transitionEnterTimeout={300}
        transitionLeaveTimeout={100}
        transitionAppear={true}
        transitionAppearTimeout={300}>
          <div className="toggle-show-filter" onClick={this.toggleFilters} key={showFilters}>
            {showFilters ? "[-] hide filters" : "[+] show filters"}
          </div>
          {filters}
      </ReactCSSTransitionGroup>
    );
  }

}
