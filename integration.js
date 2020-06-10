'use strict';
const fp = require('lodash/fp');

const validateOptions = require('./src/validateOptions');
const createRequestWithDefaults = require('./src/createRequestWithDefaults');

const { handleError } = require('./src/handleError');
const { getLookupResults } = require('./src/getLookupResults');

let Logger;
let requestWithDefaults;
const startup = (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, _options, cb) => {
  Logger.debug({ entities }, 'Entities');

  const options = {
    ..._options,
    programsToSearch: fp.flow(
      fp.split(','),
      fp.map(fp.trim)
    )(_options.programsToSearch)
  };

  let lookupResults;
  try {
    lookupResults = await getLookupResults(entities, options, requestWithDefaults, Logger);
  } catch (error) {
    Logger.error({ error }, 'Get Lookup Results Failed');
    return cb(handleError(error));
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};


module.exports = {
  doLookup,
  startup,
  validateOptions
};
