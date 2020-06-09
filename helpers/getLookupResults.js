const {
  _P,
  partitionFlatMap,
  splitOutIgnoredIps,
  groupEntities
} = require('./dataTransformations');

const getIocDetails = require('./getIocDetails');
const getAssets = require('./getAssets');
const getEvents = require('./getEvents');
const createLookupResults = require('./createLookupResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );
      const entityGroups = groupEntities(entitiesPartition, options);

      try {
        const asdf = await requestWithDefaults({
          url: `https://jsonplaceholder.typicode.com/todos/1`,
          method: "GET",
          options,
          json: true
        });
        Logger.trace({ asdf}, "FFFFFFF")
      } catch (e) {
        Logger.trace({e}, "ASDKFJLSKDJF")
      } 

      return [];
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
