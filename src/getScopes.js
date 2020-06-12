const fp = require('lodash/fp');
const moment = require('moment');
const { getScopesQuery } = require('./queries/scopes');
const { _P } = require('./dataTransformations');


const getScopes = (entities, options, requestWithDefaults, Logger) =>
  _P.reduce(
    options.programsToSearch,
    async (entityProgramAgg, programName) => {
      const scopes = await getScopesQuery(
        entities,
        programName,
        options,
        requestWithDefaults,
        Logger
      );

      /* Return Data Structure
       * {
       *   [entityValue]: {
       *     [programName]: [
       *       scopes
       *     ]
       *   }
       * }
       */
      return aggregateEntityProgramScopes(entities, programName, entityProgramAgg, scopes);
    },
    {}
  );

const aggregateEntityProgramScopes = (entities, programName, entityProgramAgg, scopes) =>
  fp.reduce(
    (agg, entity) => ({
      ...agg,
      [entity.value]: {
        ...fp.getOr({}, entity.value)(entityProgramAgg),
        [programName]: (scopes[entity.value] || []).map(({ created_at, ...scopes }) => ({
          ...scopes,
          created_at: moment(created_at).format('MMM D YY, h:mm A')
        }))
      }
    }),
    {}
  )(entities);

module.exports = getScopes;
