import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import FilterDate from './Date'
import FilterSelect from './Select'
import FilterSuggest from './Suggest'
import FilterText from './Text'

import Url from '../../../lib/Url';
import ValidParams from '../../../lib/ValidParams';

import './Filter.scss';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      showFilters: false,
      selectedCategory: "primary",
      validParamsByCategory: ValidParams.getParamsByCategory()
    }

    this.toggleFilters = this.toggleFilters.bind(this);
  }

  toggleFilters() {
    let { showFilters } = this.state;
    this.setState({ showFilters: !showFilters });
  }

  selectCategory(category) {
    this.setState({ selectedCategory: category });
  }

  render() {
    let { showFilters, selectedCategory, validParamsByCategory } = this.state;
    let categories = Object.keys(validParamsByCategory);
    let validParams = validParamsByCategory[selectedCategory];
    let filters = Object.keys(validParams).map((paramKey) => {
      let filterType = validParams[paramKey]["filter_type"];
      let displayName = validParams[paramKey]["display_name"].toLowerCase();
      switch(filterType) {
        case "date":
          return (<FilterDate paramField={paramKey} displayName={displayName} />);
        case "select":
          return (<FilterSelect paramField={paramKey} displayName={displayName} />);
        case "suggest":
          return (<FilterSuggest paramField={paramKey} displayName={displayName} />);
        case "text":
          return (<FilterText paramField={paramKey} displayName={displayName} />);
        default:
          return;
      };
    });
    var filterRender;
    if (showFilters) {
      filterRender = (
        <div>
          <div className="filter-category-headers">
            <div className="filter-category-preheaders">&nbsp;</div>
            {categories.map((category, i) =>
              <span className={"filter-category-header" + (category === selectedCategory ? " selected" : "")} onClick={() => this.selectCategory(category)}>
                {category}
              </span>
            )}
            <div className="filter-category-postheaders">&nbsp;</div>
          </div>
          <div className="filters">
            {filters}
          </div>
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
