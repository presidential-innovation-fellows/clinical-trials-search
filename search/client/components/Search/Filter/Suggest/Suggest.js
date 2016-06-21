import Select from '../Select';

import ApiFetch from '../../../../lib/ApiFetch.js';

class Suggest extends Select {

  constructor() {
    super();

    this.className = "filter-suggest";

    this.state.minimumInput = 1;
    // this.state.placeholderText = "search...";
  }

  getOptions(input, callback) {
    let { paramField } = this.props;
    ApiFetch(`terms?term=${input}&term_type=${paramField}&size=5`)
    .then((response) => {
      return response.json();
    }).then((json) => {
      return callback(null, {
        options: json.terms
      });
    });
  }

}

export default Suggest;
