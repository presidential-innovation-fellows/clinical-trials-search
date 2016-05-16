import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import fetch from 'isomorphic-fetch';

let trial = "";

class ClinicalTrial extends Component {

  constructor() {
    super();

    this.state = {
      trials: []
    };
  }

  componentDidMount() {
    let { id } = this.props.params;
    fetch(`http://localhost:3000/clinical-trial/${id}`)
      .then(response => response.json())
      .then((json) => {
        this.setState({
          trials: [json]
        });
      });
  }

  render() {
    let { id } = this.props.params;
    return (
      <div>
        <div>{id}</div>
        <ul>
          {this.state.trials.map((post, i) =>
            <li key={i}>{post.nct_id}</li>
          )}
        </ul>
        <Link to="/">home</Link>
      </div>
    );
  }
}

export default ClinicalTrial;
