const fp = require('lodash/fp');
const moment = require('moment');

const getScopesRequest = async (
  { id: programId, attributes: { handle: programName } },
  entities,
  responseCache,
  options,
  requestWithDefaults,
  Logger
) => {
  const cachedProgramData = responseCache.get(programName);
  if (!cachedProgramData || !cachedProgramData.scopes) {
    const error = await addScopesResponseToCache(
      programId,
      programName,
      options,
      requestWithDefaults,
      cachedProgramData,
      responseCache,
      Logger
    );
    if (error) return {};
  }

  const entityValues = fp.map(fp.get('value'))(entities);

  /** Return Structure
   * {
   *   [entityValue]: [scopesForThisEntity]
   *   ...
   * }
   */
  return formatScopesResults(entityValues, programName, responseCache, Logger);
};

const addScopesResponseToCache = async (
  programId,
  programName,
  options,
  requestWithDefaults,
  cachedProgramData,
  responseCache,
  Logger
) => {
  const scopes = await getAllScopes(programId, options, requestWithDefaults, Logger);

  if (!scopes || !scopes.length) return 'No Results';

  const fromattedScopes = fp.map(({ attributes }) => ({
    ...attributes,
    created_at:
      attributes.created_at && moment(attributes.created_at).format('MMM D, YY - h:mm A')
  }))(scopes);

  responseCache.set(programName, {
    ...cachedProgramData,
    scopes: fromattedScopes
  });
};

const formatScopesResults = (entityValues, programName, responseCache) =>
  responseCache.get(programName).scopes.reduce((agg, scope) => {
    const entityValueForScope = fp.find(
      (entityValue) =>
        scope.asset_identifier.toLowerCase().includes(entityValue.toLowerCase()),
      entityValues
    );
    return {
      ...agg,
      ...(entityValueForScope && {
        [entityValueForScope]: [...(agg.entityValueForScope || []), scope]
      })
    };
  }, {});

const getAllScopes = async (
  programId,
  options,
  requestWithDefaults,
  Logger,
  pageNumber = 1,
  previousScopes = []
) => {
  const { body } = await requestWithDefaults({
    url:
      `https://api.hackerone.com/v1/programs/${programId}/structured_scopes?` +
      `page[size]=100&page[number]=${pageNumber}`,
    method: 'GET',
    options
  });
  const scopes = fp.get('data')(body);

  return scopes.length < 100
    ? previousScopes.concat(scopes)
    : await getAllScopes(
        programId,
        options,
        requestWithDefaults,
        Logger,
        pageNumber + 1,
        previousScopes.concat(scopes)
      );
};

module.exports = getScopesRequest;
