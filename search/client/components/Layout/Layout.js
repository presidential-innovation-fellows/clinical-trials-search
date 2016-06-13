import React, { Component, PropTypes } from 'react';
import Navigation from '../Navigation';

import './Layout.scss';

class Layout extends Component {

  static propTypes = {
    children: PropTypes.element.isRequired,
  };

  render() {
    return (
      <div className="Layout">
        <Navigation />
        {this.props.children}
      </div>
    );
  }

}

export default Layout;
