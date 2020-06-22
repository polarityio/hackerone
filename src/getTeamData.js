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
        ),
        reporters: aggregateEntityProgramReporters(
          entities,
          programName,
          entityProgramAgg,
          reporters
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
      created_at: moment(created_at).format('MMM D, YY - h:mm A')
    }))
  );

const aggregateEntityProgramCWEs =  
  aggregateEntityProgram('cwes');

const aggregateEntityProgramReports = aggregateEntityProgram('reports', (reports) =>
  reports.map(({ vulnerability_information, weakness, summaries, ...report }) => ({
    ...report,
    vulnerability_information:
      vulnerability_information &&
      vulnerability_information.replace(/(\r\n|\n|\r)/gm, '<br/>'),
    weakness: weakness && {
      ...weakness,
      description:
        weakness.description && weakness.description.replace(/(\r\n|\n|\r)/gm, '<br/>')
    },
    summaries: summaries.map(({ content, created_at, ...summary }) => ({
      ...summary,
      content: content.replace(/(\r\n|\n|\r)/gm, '<br/>'),
      created_at: moment(created_at).format('MMM D, YY - h:mm A')
    }))
  }))
);

const aggregateEntityProgramReporters = aggregateEntityProgram('reporters', (reporters) =>
  reporters.map(({ profile_picture, ...reporter }) => ({
    ...reporter,
    profile_picture: !profile_picture.startsWith("/assets") && profile_picture 
  }))
);


module.exports = getTeamData;
