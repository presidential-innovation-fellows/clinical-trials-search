import React, { Component, PropTypes } from 'react';
import Navigation from '../Navigation';

require('../../styles/main.scss');

class Layout extends Component {

  static propTypes = {
    children: PropTypes.element.isRequired,
  };

  render() {
    return (
      <div className="layout">
        <Navigation />
        {this.props.children}
      </div>
    );
  }

}

export default Layout;
