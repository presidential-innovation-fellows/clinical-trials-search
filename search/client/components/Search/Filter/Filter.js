import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import FilterDate from './Date'
import FilterSelect from './Select'
import FilterSuggest from './Suggest'
import FilterText from './Text'
import FilterGender from './Gender'
import FilterAge from './Age'

import Url from '../../../lib/Url';
import ValidParams from '../../../lib/ValidParams';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      showFilters: false,
      selectedCategory: "get started",
      validParamsByCategory: ValidParams.getParamsByCategory(),
      validParamsByKey: ValidParams.getParamsByKey()
    }

    this.toggleFilters = this.toggleFilters.bind(this);
    this.renderFilter = this.renderFilter.bind(this);
  }

  toggleFilters() {
    let { showFilters } = this.state;
    this.setState({ showFilters: !showFilters });
  }

  selectCategory(category) {
    this.setState({ selectedCategory: category });
  }

  renderFilters() {
    switch(this.state.selectedCategory) {
      case "get started":
        return this.renderGeneralFilters();
      case "advanced":
        return this.renderAdvancedFilters();
    }
  }

  renderFilter(paramKey) {
    const { validParamsByKey } = this.state;
    let filterType = validParamsByKey[paramKey]["filter_type"];
    let displayName = validParamsByKey[paramKey]["display_name"];
    switch(filterType) {
      case "date":
        return <FilterDate key={paramKey} paramField={paramKey} displayName={displayName} />;
      case "select":
        return <FilterSelect key={paramKey} paramField={paramKey} displayName={displayName} />;
      case "suggest":
        return <FilterSuggest key={paramKey} paramField={paramKey} displayName={displayName} />;
      case "text":
        return <FilterText key={paramKey} paramField={paramKey} displayName={displayName} />;
      case "gender":
        return <FilterGender key={paramKey} paramField={paramKey} displayName={displayName} />;
      default:
        return;
    };
  }

  renderGeneralFilters() {
    return (
      <div className="filters">
        <div className="filters-column">
          {this.renderFilter("_diseases")}
          {this.renderFilter("_locations")}
          {this.renderFilter("sites.org.family")}
          {this.renderFilter("arms.interventions.intervention_type")}
        </div>
        <div className="filters-column">
          {this.renderFilter("eligibility.structured.gender")}
          <FilterAge key="age" />
        </div>
      </div>
    )
  }

  renderAdvancedFilters() {
    return (
      <div className="filters">
        <div className="filters-column">
          {this.renderFilter("nci_id")}
          {this.renderFilter("nct_id")}
          {this.renderFilter("official_title")}
          {this.renderFilter("brief_title")}
          {this.renderFilter("acronym")}
        </div>
        <div className="filters-column">
          {this.renderFilter("current_trial_status")}
          {this.renderFilter("phase.phase")}
          {this.renderFilter("anatomic_sites")}
          {this.renderFilter("_all")}
        </div>
      </div>
    )
  }

  render() {
    let { showFilters, selectedCategory } = this.state;
    let categories = ["get started", "advanced"];
    let filters = this.renderFilters();
    var filterRender;
    if (showFilters) {
      filterRender = (
        <div>
          <div className="filter-category-headers">
            <div className="filter-category-preheaders">&nbsp;</div>
            {categories.map((category, i) =>
              <span key={category} className={"filter-category-header" + (category === selectedCategory ? " selected" : "")} onClick={() => this.selectCategory(category)}>
                {category}
              </span>
            )}
            <div className="filter-category-postheaders">&nbsp;</div>
          </div>
          {filters}
          <div className="toggle-hide-filter" onClick={this.toggleFilters} key={showFilters}>
            Close
          </div>
        </div>
      );
    } else {
      filterRender = (
        <div className="toggle-show-filter" onClick={this.toggleFilters} key={showFilters}>
          Filter Results [+]
        </div>
      );
    }
    // <div>TODO: filter slide by max age</div>
    // <div>add default search for open trials</div>
    // <div>TODO: filter select by interventional model</div>
    // <div>TODO: filter select by masking?</div>
    // <div>TODO: filter select by protocol type</div>
    // <div>TODO: search anywhere in the trial (_all)</div>

    return (
      <div className="filter-page">
        {filterRender}
      </div>
    );
  }

}
