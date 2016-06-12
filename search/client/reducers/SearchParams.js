const searchParams = (state = {}, action) => {

  let params = {};

  switch (action.type) {

    case 'NEW_PARAMS':
      Object.keys(action.params).forEach((key) => {
        params[key] = action.params[key];
      });
      return params;

    case 'ADD_PARAMS':
      params = {...state};
      Object.keys(action.params).forEach((key) => {
        let value = action.params[key];
        if (value instanceof Array) {
          params[key].push(value);
        } else {
          params[key] = value;
        }
      });
      return params;

    case 'REMOVE_PARAMS':
      params = {...state};
      Object.keys(action.params).forEach((key) => {
        let value = action.params[key];
        if (value) {
          if (value instanceof Array) {
            delete params[key][value];
          } else {
            delete params[key];
          }
        }
      });
      return params;

    case 'CLEAR_PARAMS':
      return {};

    default:
      return state

  }

}

export default searchParams
