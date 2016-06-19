import React, { Component, PropTypes } from 'react';
import Link from '../../Link';
import ToggleMore from '../../ToggleMore';

import './Result.scss';

export default class extends Component {

  static propTypes = {
    trial: PropTypes.object.isRequired,
    children: PropTypes.element,
    state: PropTypes.object
  };

  getTreatments(trial) {
    let tHash = {};
    if (trial.arms) {
      trial.arms.forEach((arm) => {
        arm.interventions.forEach((intervention) => {
          let treatment = intervention.intervention_name;
          if (treatment) {
            if (intervention.intervention_type) {
              treatment += ` (${intervention.intervention_type})`;
            }
            tHash[treatment] = 1;
          }
        })
      });
    }
    let treatments = Object.keys(tHash).map((treatment) => {
      return {
        display: treatment,
        link: `/clinical-trials?_treatments=${treatment}`
      };
    });
    return treatments;
  }

  getDiseases(trial) {
    let dHash = {};
    if (trial.diseases) {
      trial.diseases.forEach((disease) => {
        let d = disease.disease;
        if (d) {
          dHash[d.display_name] = 1;
        }
      });
    }
    return Object.keys(dHash);
  }

  render() {
    const { trial, children } = this.props;
    let treatments = this.getTreatments(trial);
    let diseases = this.getDiseases(trial);

    return (
      <div key={trial.nci_id} className="clinical-trial-result card">
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
          <ToggleMore items={treatments}
                      itemKey="display"
                      numToShow={3} />
        </div>
        <div>
          <b>Disease{diseases.length > 1 ? "s" : ""}:</b>{" "}
          <ToggleMore items={diseases}
                      numToShow={3} />
        </div>
        {children}
      </div>
    );
  }

}
