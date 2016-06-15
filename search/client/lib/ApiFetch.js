import fetch from 'isomorphic-fetch';
import ApiServer from './ApiServer';

function ApiFetch(endpointQuery) {

  var opt;
  
  if(ApiServer.username && ApiServer.password) {
    const token = btoa(`${ApiServer.username}:${ApiServer.password}`);
    opt = {
      "headers": {
        "Authorization": `Basic ${token}`
      }
    };
  }

  return fetch(`http://${ApiServer.host}/${endpointQuery}`, opt);

};

export default ApiFetch
