import React, { Component } from 'react';
import StatusPart from './StatusPart';

import Url from '../../lib/Url';

export default class extends Component {

  _getDisplayType(type) {
    return {
      "diseases.synonyms": "disease",
      "sites.org.location": "location",
      "sites.org.name": "hospital/center",
      "sites.org.family": "network/organization",
      "anatomic_sites": "anatomic site",
      "arms.treatment": "treatment"
    }[type];
  }

  getStatuses() {
    let params = Url.getParams();
    let statuses = [];

    Object.keys(params).forEach((key) => {
      let value = params[key];
      let status = {
        displayKey: this._getDisplayType(key),
        key: key
      }
      if (value instanceof Array) {
        status.value = value.join(", ");
      } else {
        status.value = value;
      }
      statuses.push(status);
    });

    return statuses;
  }

  render() {
    let statuses = this.getStatuses();
    return (
      <div className="search-status">
        {statuses.map((status, i) =>
          <StatusPart key={status.key} status={status} />
        )}
      </div>
    )
  }

}
