import React, { Component, PropTypes } from 'react';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      numResultsTarget: 100
    }
  }

  static propTypes = {
    numResults: PropTypes.number,
  };

  render() {
    let { numResultsTarget } = this.state;
    let { numResults } = this.props;

    if (numResults > numResultsTarget) {
      return (
        <div className="prompt-filtering">
          That’s a lot of trials. Try using the filters above to narrow down
          your results.
        </div>
      )
    }
  }

}
