const redux = require('redux');
const reducers = require('../reducers');
// import * as reducers from '../reducers'
import { routerReducer } from 'react-router-redux';

module.exports = function() {
  // const store = redux.createStore(reducers, initialState)
  const store = redux.createStore(
    redux.combineReducers(Object.assign(
      {},
      reducers,
      {routing: routerReducer}
    ))
  );

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers', () => {
      const nextReducer = require('../reducers')
      store.replaceReducer(nextReducer)
    })
  }

  return store
}
