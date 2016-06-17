import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import StatusItem from './StatusItem';
import Url from '../../../lib/Url';
import ValidParams from '../../../lib/ValidParams';

import './Status.scss';

export default class extends Component {

  _getDisplayType(type) {
    return ValidParams.getParamsByKey()[type]["display_name"].toLowerCase();
  }

  getFieldStatuses() {
    let params = Url.getParams();
    let fieldStatuses = [];

    Object.keys(params).forEach((key) => {
      let values = params[key];
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

  render() {
    let fieldStatuses = this.getFieldStatuses();
    return (
      <div className="search-status">
        {fieldStatuses.map((fieldStatus, i) =>
          <ReactCSSTransitionGroup
            transitionName="fade-transition"
            transitionEnterTimeout={300}
            transitionLeaveTimeout={100}
            transitionAppear={true}
            transitionAppearTimeout={300}>
              <div key={fieldStatus.displayType}>
                <b>{fieldStatus.displayType}:</b>{" "}
                {fieldStatus.statusItems.map((statusItem, i) =>
                  <span>
                    <StatusItem status={statusItem} />
                    {i < (fieldStatus.statusItems.length) - 1 ? " or " : ""}
                  </span>
                )}
              </div>
          </ReactCSSTransitionGroup>
        )}
        <br/>
      </div>
    )
  }

}
