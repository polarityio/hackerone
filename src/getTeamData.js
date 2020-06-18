const fp = require('lodash/fp');
const moment = require('moment');
const { getTeamQuery } = require('./queries/team');
const { _P } = require('./dataTransformations');


const getTeamData = (entities, options, requestWithDefaults, Logger) =>
  _P.reduce(
    options.programsToSearch,
    async (entityProgramAgg, programName) => {
      const { scopes, cwes, reports, reporters } = await getTeamQuery(
        entities,
        programName,
        options,
        requestWithDefaults,
        Logger
      );
      Logger.trace(
        {
          reporters,
          scopes,
          reports
        },
        'WORKED WITHOUT ERROR'
      );
      return {
        /* Return Scopes Data Structure
         * {
         *   [entityValue]: {
         *     [programName]: [
         *       scopes
         *     ]
         *   }
         * }
         */
        scopes: aggregateEntityProgramScopes(
          entities,
          programName,
          entityProgramAgg,
          scopes
        ),
        cwes: aggregateEntityProgramCWEs(
          entities,
          programName,
          entityProgramAgg,
          cwes
        ),
        reports: aggregateEntityProgramReports(
          entities,
          programName,
          entityProgramAgg,
          reports
        )
      };
    },
    {}
  );

const aggregateEntityProgram = (key, processResult = fp.identity) => (
  entities,
  programName,
  entityProgramAgg,
  queryResult,
  Logger
) =>
  fp.reduce((agg, entity) => {
    return {
      ...agg,
      ...fp.getOr({}, key)(entityProgramAgg),
      [entity.value]: {
        ...fp.getOr({}, `${key}["${entity.value}"]`)(entityProgramAgg),
        [programName]: processResult(queryResult[entity.value] || [])
      }
    };
  }, {})(entities);


const aggregateEntityProgramScopes = 
  aggregateEntityProgram('scopes', (scopes) =>
    scopes.map(({ created_at, ...scope }) => ({
      ...scope,
      created_at: moment(created_at).format('MMM D YY, h:mm A')
    }))
  );

const aggregateEntityProgramCWEs =  
  aggregateEntityProgram('cwes');

const aggregateEntityProgramReports =  
  aggregateEntityProgram('reports');


module.exports = getTeamData;
