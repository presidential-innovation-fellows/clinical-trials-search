require('normalize.css/normalize.css');
require('styles/App.sass');

import React from 'react';
import SuggesterComponent from './SuggesterComponent';

class AppComponent extends React.Component {
  render() {
    return (
      <div className="index">
        <div className="main-container">
          <a href="https://www.cancer.gov">
            <img className="nci-logo" src="images/nci-logo-full.svg"/>
          </a>
          <div className="search-container">
            <SuggesterComponent />
          </div>
        </div>
      </div>
    );
  }
}

AppComponent.defaultProps = {
};

export default AppComponent;
