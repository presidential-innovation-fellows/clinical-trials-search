import React, { Component, PropTypes } from 'react';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      numResultsTarget: 10
    }
  }

  static propTypes = {
    numResults: PropTypes.number,
  };

  render() {
    let { numResultsTarget } = this.state;
    let { numResults } = this.props;

    if (numResults < numResultsTarget) {
      return (
        <div className="prompt-filtering">
          Print results...
        </div>
      )
    } else {
      return (
        <div className="prompt-filtering">
          Too many results, filter more...
        </div>
      )
    }
  }

}
