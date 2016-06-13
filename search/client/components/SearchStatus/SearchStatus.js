import React, { Component, PropTypes } from 'react';
import StatusPill from './StatusPill';

export default class extends Component {

  static contextTypes = {
    store: PropTypes.object
  };

  getDisplayType(type) {
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
    let store = this.context.store;
    let { searchParams } = store.getState();
    let statuses = [];

    Object.keys(searchParams).forEach((key) => {
      let value = searchParams[key];
      let status = {
        displayKey: this.getDisplayType(key),
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
          <StatusPill key={status.key} status={status} />
        )}
      </div>
    )
  }

}
