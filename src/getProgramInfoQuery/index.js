const fp = require('lodash/fp');

const NodeCache = require('node-cache');
const programQueryBuilder = require('./programQueryBuilder');
const formatScopesResponse = require('./formatScopesResponse');
const formatCweResponse = require('./formatCweResponse');
const formatReportsResponse = require('./formatReportsResponse');

const getProgramInfoQuery = async (
  entities,
  programName,
  options,
  requestWithDefaults,
  Logger,
  responseCache = new NodeCache({
    stdTTL: 59 * 60 * 12
  })
) => {
  const entitiesWithIds = fp.map(
    (entity) => ({ ...entity, id: `a${Math.random().toString(36).slice(2)}` })
  )(entities);

  const query = programQueryBuilder(entitiesWithIds, programName, responseCache);
  
  const { body } = await requestWithDefaults({
    url: 'https://hackerone.com/graphql',
    method: 'POST',
    options,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { handle: programName }
    })
  });
  return {
    scopes: formatScopesResponse(entitiesWithIds, body, Logger),
    cwes: formatCweResponse(entitiesWithIds, programName, body, responseCache, Logger),
    ...formatReportsResponse(entitiesWithIds, programName, body, responseCache, Logger)
  };
};


module.exports = getProgramInfoQuery;
