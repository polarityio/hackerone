const { partitionFlatMap, splitOutIgnoredIps } = require('./dataTransformations');
const getQueryData = require('./getQueryData/index')
const createLookupResults = require('./createLookupResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );

      const { scopes, cwes, reports, reporters } = await getQueryData(
        entitiesPartition,
        options,
        requestWithDefaults,
        Logger
      );

      const lookupResults = createLookupResults(
        options,
        entitiesPartition,
        scopes,
        cwes,
        reports,
        reporters
      );

      Logger.trace({ scopes, cwes, reports, reporters, lookupResults }, 'Query Results');

      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
