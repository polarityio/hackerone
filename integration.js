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
    programsToSearch: formatProgramsToSearch(_options.programsToSearch)
  };

  let lookupResults;
  try {
    lookupResults = await getLookupResults(entities, options, requestWithDefaults, Logger);
  } catch (error) {
    const err = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    Logger.error({ error, err }, 'Get Lookup Results Failed');
    return cb(handleError(error));
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const formatProgramsToSearch = fp.flow(
  fp.split(','),
  fp.map(
    fp.flow(
      fp.trim,
      fp.split('>'),
      fp.thru((program) =>
        program.length > 1
          ? {
              id: program[1],
              alias: program[0]
            }
          : {
              id: program[0],
              alias: program[0]
            }
      )
    )
  )
);
module.exports = {
  doLookup,
  startup,
  validateOptions
};
