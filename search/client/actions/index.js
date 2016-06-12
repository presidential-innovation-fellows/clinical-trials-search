export const newParams = (params) => {
  return {
    type: 'NEW_PARAMS',
    params: params
  };
};

export const addParams = (params) => {
  return {
    type: 'ADD_PARAMS',
    params: params
  };
};

export const removeParams = (params) => {
  return {
    type: 'REMOVE_PARAMS',
    params: params
  };
};

export const clearParams = () => {
  return {
    type: 'CLEAR_PARAMS'
  };
};
