import { canUseDOM } from 'fbjs/lib/ExecutionEnvironment';
import QueryString from 'query-string';
import Location from './Location';

// TODO: fix this, it's hacky
let loc = canUseDOM ? location : {};

const DEFAULT_PARAMS = {
  "current_trial_status": "Active"
}

const _getUrlObj = () => {
  let params = QueryString.parse(loc.search);
  // ensure each param value is an array
  Object.keys(params).forEach((key) => {
    if (!(params[key] instanceof Array)) {
      params[key] = [params[key]];
    }
  });
  let path = loc.pathname ? loc.pathname.toString() : "/";
  return { path, params };
};

const _addParams = (params, addParams) => {
  Object.keys(addParams).forEach((key) => {
    let values = addParams[key];
    if (!(values instanceof Array)) {
      values = [values];
    }
    if (!params[key]) {
      params[key] = [];
    }
    values.forEach((value) => {
      params[key].push(value);
    });
  });
  return params;
}

const _overwriteParams = (params, addParams) => {
  Object.keys(addParams).forEach((key) => {
    let values = addParams[key];
    if (!(values instanceof Array)) {
      values = [values];
    }
    if (!params[key]) {
      params[key] = [];
    }
    params[key] = values;
  });
  return params;
}

const _removeParams = (params, removeParams) => {
  Object.keys(removeParams).forEach((key) => {
    let values = removeParams[key];
    if (!(values instanceof Array)) {
      values = [values];
    }
    values.forEach((value) => {
      let i = params[key].findIndex((pValue) => {
        return pValue === value;
      });
      if (i >= 0) {
        params[key].splice(i, 1);
      }
    });
    if (!params[key].length) {
      delete params[key];
    }
  });
  return params;
}

const _updateUrl = (path, params) => {
  let url = path;
  let query = QueryString.stringify(params);
  if (query) { url += '?' + query; }
  Location.push(url);
}

class Url {

  static getParams() {
    return _getUrlObj()["params"];
  }

  static areParamsDiff(params) {
    // TODO: hacky
    return QueryString.stringify(params) !== QueryString.stringify(Url.getParams());
  }

  static stringifyParams(params) {
    return QueryString.stringify(params);
  }

  static newParams({ path, params }) {
    _updateUrl(path, _addParams({}, params));
  }

  static newParamsWithDefault({ path, params }) {
    _updateUrl(path, _addParams(DEFAULT_PARAMS, params));
  }

  static addParams({ path, params }) {
    let currentParams = _getUrlObj().params;
    _updateUrl(path, _addParams(currentParams, params));
  }

  static removeParams({ path, params }) {
    let currentParams = _getUrlObj().params;
    _updateUrl(path, _removeParams(currentParams, params));
  }

  static overwriteParams({ path, params }) {
    let currentParams = _getUrlObj().params;
    _updateUrl(path, _overwriteParams(currentParams, params));
  }

  static clearParams({ path }) {
    _updateUrl(path, {});
  }

  static clearParamsToDefault({ path }) {
    _updateUrl(path, DEFAULT_PARAMS);
  }

}

export default Url;
