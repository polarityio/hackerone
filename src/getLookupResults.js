const { partitionFlatMap, splitOutIgnoredIps } = require('./dataTransformations');
const getGrapqlQueryData = require('./getGrapqlQueryData/index');
const getRestQueryData = require('./getRestQueryData');
const createLookupResults = require('./createLookupResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );

      let lookupResults;
      if (options.useGraphql) {
        const { scopes, cwes, reports, reporters } = await getGrapqlQueryData(
          entitiesPartition,
          options,
          requestWithDefaults,
          Logger
        );

        lookupResults = createLookupResults(
          options,
          entitiesPartition,
          scopes,
          cwes,
          reports,
          reporters
        );
        Logger.trace(
          { scopes, cwes, reports, reporters, lookupResults },
          'Query Results'
        );
      } else {
        const {
          programsToSearch,
          scopes,
          cwes,
          reports,
          reporters
        } = await getRestQueryData(
          entitiesPartition,
          options,
          requestWithDefaults,
          Logger
        );

        lookupResults = createLookupResults(
          options,
          entitiesPartition,
          scopes,
          cwes,
          reports,
          reporters,
          programsToSearch
        );

        Logger.trace(
          { programsToSearch, scopes, cwes, reports, reporters, lookupResults },
          'Rest Requests Results'
        );
      }

      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
