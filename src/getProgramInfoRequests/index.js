const NodeCache = require('node-cache');

const { _P } = require('../dataTransformations');
const getAllCwes = require('./getAllCwes');
const getScopesRequest = require('./getScopesRequest');
const getReportsData = require('./getReportsData');

const getProgramInfoRequests = async (
  entities,
  program,
  options,
  requestWithDefaults,
  Logger,
  responseCache = new NodeCache({
    stdTTL: 59 * 60 * 12
  })
) => {
  const cwes = await getAllCwes(
    program,
    entities,
    responseCache,
    options,
    requestWithDefaults,
    Logger
  );

  const { scopes, reportsData } = await _P.parallel({
    scopes: getScopesRequest(
      program,
      entities,
      responseCache,
      options,
      requestWithDefaults,
      Logger
    ),
    reportsData: getReportsData(
      program,
      entities,
      responseCache,
      options,
      requestWithDefaults,
      Logger
    )
  });

  return {
    cwes,
    scopes,
    ...reportsData
  };
};

module.exports = getProgramInfoRequests;
