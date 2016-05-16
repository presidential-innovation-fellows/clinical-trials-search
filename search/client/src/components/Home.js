require('normalize.css/normalize.css');
require('styles/App.sass');

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
        <Link to="/clinical-trial/NCI-2013-02049">clinical-trial NCI-2013-02049</Link>
        { ' : ' }
        <Link to="/clinical-trial/NCI-2015-00701">clinical-trial NCI-2015-00701</Link>
      </div>
    );
  }
}

Home.defaultProps = {
};

export default Home;
