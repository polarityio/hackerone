const {
  _P,
  partitionFlatMap,
  splitOutIgnoredIps
} = require('./dataTransformations');
const getScopes = require('./getScopes')
const createLookupResults = require('./createLookupResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );

      const { scopes } = await _P.parallel({
        scopes: getScopes(entitiesPartition, options, requestWithDefaults, Logger)
      });

      const lookupResults = createLookupResults(options, entitiesPartition, scopes);

      Logger.trace({ scopes, lookupResults }, 'Query Results');

      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
