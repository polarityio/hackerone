const fp = require('lodash/fp');

const aggregateEntityProgram = (key, processResult = fp.identity) => (
  entities,
  programName,
  entityProgramAgg,
  queryResult,
  Logger = { trace: () => {} }
) =>
  /* Return Data Structure
   * {
   *   [entityValue]: {
   *     [programName]: [
   *       parsedResult
   *     ]
   *     ...
   *   }
   *   ...
   * }
   */
  fp.reduce(
    (agg, entity) => ({
      ...fp.getOr({}, key)(entityProgramAgg),
      ...agg,
      [entity.value]: {
        ...fp.getOr({}, `${key}["${entity.value}"]`)(entityProgramAgg),
        [programName]: processResult(queryResult[entity.value] || [])
      }
    }),
    {}
  )(entities);

module.exports = aggregateEntityProgram;
