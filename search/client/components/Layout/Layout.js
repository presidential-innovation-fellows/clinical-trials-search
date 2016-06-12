import React, { Component, PropTypes } from 'react';
import './Layout.scss';
import Navigation from '../Navigation';

class Layout extends Component {

  static propTypes = {
    children: PropTypes.element.isRequired,
  };

  componentDidMount() {
    // debugger;
  }

  render() {
    return (
      <div className="Layout">
        <Navigation />
        {this.props.children}
      </div>
    );
  }

}

// Layout.contextTypes = { store: PropTypes.object };

export default Layout;
