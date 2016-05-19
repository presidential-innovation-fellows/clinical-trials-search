require('normalize.css/normalize.css');

import React from 'react';
import { Link, browserHistory } from 'react-router'
import SuggesterComponent from './SuggesterComponent';

class Home extends React.Component {
  render() {
    return (
      <div className="index">
        <div className="main-container">
          <div className="logo-container">
            Search Clinical Trials
          </div>
          <div className="search-container">
            <SuggesterComponent />
          </div>
        </div>
      </div>
    );
  }
}

Home.defaultProps = {
};

export default Home;
