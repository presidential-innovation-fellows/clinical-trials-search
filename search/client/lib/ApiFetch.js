import fetch from 'isomorphic-fetch';

function ApiFetch(endpointQuery) {

  // const host = "https://clinicaltrialsapi.cancer.gov";
  const host = "http://localhost:3000";

  return fetch(`${host}/${endpointQuery}`);

};

export default ApiFetch
