import React, { Component, PropTypes } from 'react';
import Link from '../../Link'

import './Result.scss';

export default class extends Component {

  static propTypes = {
    trial: PropTypes.object.isRequired,
    children: PropTypes.element,
    state: PropTypes.object
  };

  getTreatments(trial) {
    let treatments = [];
    if (trial.arms) {
      trial.arms.forEach((arm) => {
        if (arm.treatment) {
          treatments.push({
            display: arm.treatment,
            link: `/clinical-trials?arms.treatment=${arm.treatment}`
          });
        }
      });
    }
    return treatments;
  }

  render() {
    const { trial, children } = this.props;
    let treatments = this.getTreatments(trial);

    return (
      <div key={trial.nci_id} className="clinical-trial-result">
        <h3>
          <a href={`/clinical-trial?id=${trial.nci_id}`} onClick={Link.handleClick}>
            {trial.brief_title}
          </a>
        </h3>
        <div>
          <b>Status:</b> {trial.current_trial_status}
        </div>
        <div>
          <b>Phase:</b> <span>{trial.phase.phase.split("_").join(", ")}</span>
        </div>
        <div>
          <b>Treatment{treatments.length > 1 ? "s" : ""}:</b>{" "}
          {treatments.map((treatment, i) =>
            <span key={i}>
              <a href={treatment.link} onClick={Link.handleClick}>
                {treatment.display}
              </a>
              {i < treatments.length - 1 ? ", " : ""}
            </span>
          )}
        </div>
        <div>
          <b>Condition{trial.diseases.length > 1 ? "s" : ""}:</b>{" "}
          {trial.diseases.slice(0,3).map((disease, i) =>
            <span key={`${trial.nci_id} ${disease.disease_menu_display_name}`}>
              <span>{disease.disease_menu_display_name}</span>
              {i < 2 ? ", " : ""}
            </span>
          )}
        </div>
        {children}
      </div>
    );
  }

}
