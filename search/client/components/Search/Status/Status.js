import React, { Component, PropTypes } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import StatusItem from './StatusItem';
import Url from '../../../lib/Url';
import ValidParams from '../../../lib/ValidParams';

export default class extends Component {

  _getDisplayType(type) {
    return ValidParams.getParamsByKey()[type]["display_name"].toLowerCase();
  }

  getFieldStatuses() {
    let params = Url.getParams();
    let fieldStatuses = [];

    Object.keys(params).forEach((key) => {
      let values = params[key];
      // TODO: handle special case, make this better (pull out explicit logic)
      if (key === "eligibility.structured.max_age_number_gte") {
        if (values && values[0] === "") {
          return;
        } else {
          return fieldStatuses.push({
            displayType: "Age",
            key: "age",
            statusItems: values.map((value) => {
              return { key, value };
            })
          });
        }
      } else if (key === "eligibility.structured.min_age_number_lte") {
        // nada
        return;
      }
      let fieldStatus = {
        displayType: this._getDisplayType(key),
        key,
        statusItems: values.map((value) => {
          return { key, value };
        })
      }
      fieldStatuses.push(fieldStatus);
    });

    return fieldStatuses;
  }

  static propTypes = {
    totalResults: PropTypes.number
  };

  render() {
    let fieldStatuses = this.getFieldStatuses();
    let { totalResults } = this.props;
    return (
      <div className="search-status">
        <div className="search-results">
          Showing <b>{totalResults}</b> {totalResults === 1 ? "trial" : "trials"}
        </div>
        {fieldStatuses.map((fieldStatus, i) =>
          <div key={fieldStatus.displayType}>
            <b>{fieldStatus.displayType}:</b>{" "}
            {fieldStatus.statusItems.map((statusItem, i) =>
              <span key={`${statusItem.key}_${statusItem.value}`}>
                <StatusItem status={statusItem} />
                {i < (fieldStatus.statusItems.length) - 1 ? " or " : ""}
              </span>
            )}
          </div>
        )}
        <br/>
      </div>
    )
  }

}
