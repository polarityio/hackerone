const {
  _P,
  partitionFlatMap,
  splitOutIgnoredIps,
  groupEntities
} = require('./dataTransformations');
const { getScopes } = require('./queries/scopes')
const createLookupResults = require('./createLookupResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );
      const entityGroups = groupEntities(entitiesPartition, options);
      
      const scopes = await getScopes(
        entities[0],
        options.programsToSearch[0],
        options,
        requestWithDefaults,
        Logger
      );

      Logger.trace({scopes}, "WORKING?")

      return [];
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
