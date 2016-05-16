import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux'
import configureStore from './stores';
import App from './components/App';
import Home from './components/Home';
import ClinicalTrial from './components/ClinicalTrial';

const store = configureStore();

// Create an enhanced history that syncs navigation events with the store
const history = syncHistoryWithStore(browserHistory, store);

render(
  <Provider store={store}>
    <Router history={history}>
      <Route path="/" component={App}>
        <IndexRoute component={Home}/>
        <Route path="clinical-trial/:id" component={ClinicalTrial}/>
      </Route>
    </Router>
  </Provider>,
  document.getElementById('app')
);
