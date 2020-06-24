const fp = require('lodash/fp');
const moment = require('moment');
const { getTeamQuery } = require('./queries/team');
const { _P } = require('./dataTransformations');
const NodeCache = require('node-cache');
const responseCache = new NodeCache({
  stdTTL: 59 * 60 * 12
});

const getTeamData = (entities, options, requestWithDefaults, Logger) =>
  _P.reduce(
    options.programsToSearch,
    async (entityProgramAgg, programName) => {
      const { scopes, cwes, reports, reporters } = await getTeamQuery(
        entities,
        programName,
        options,
        requestWithDefaults,
        Logger,
        responseCache
      );

     

      return {
        /* Return Data Structure
         * {
         *   [entityValue]: {
         *     [programName]: [
         *       scopes
         *       cwes
         *       reports
         *       reporters
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
        cwes: aggregateEntityProgramCWEs(entities, programName, entityProgramAgg, cwes),
        reports: aggregateEntityProgramReports(allCweIds)(
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

const aggregateEntityProgramReports = (programName) =>
  aggregateEntityProgram('reports', (reports) => {
    const allCwes = fp.getOr([], 'cwes')(responseCache.get(programName));

    const allCweIds = fp.map(({ id }) => id.toLowerCase())(allCwes);

    const getValuedVulnerabilityCWE = (weakness) => fp.find((cwe) => {
      const weaknessId = fp.getOr('', 'external_id')(weakness).toLowerCase();
      return cwe.id.toLowerCase() === weaknessId
    }, allCwes);

    return reports.map(
      ({
        vulnerability_information,
        weakness,
        bug_reporter_agreed_on_going_public_at,
        latest_activity_at,
        latest_public_activity_at,
        closed_at,
        severity,
        summaries,
        ...report
      }) => ({
        ...report,
        severityIsSet: severity && severity.rating & severity.score,
        weakness: weakness && {
          ...weakness,
          valuedVulnerability: getValuedVulnerabilityCWE(weakness),
          description:
            weakness.description &&
            weakness.description.replace(/(\r\n|\n|\r)/gm, '<br/>')
        },
        bug_reporter_agreed_on_going_public_at:
          bug_reporter_agreed_on_going_public_at &&
          moment(bug_reporter_agreed_on_going_public_at).format('MMM D, YY - h:mm A'),
        latest_activity_at:
          latest_activity_at && moment(latest_activity_at).format('MMM D, YY - h:mm A'),
        latest_public_activity_at:
          latest_public_activity_at &&
          moment(latest_public_activity_at).format('MMM D, YY - h:mm A'),
        closed_at: closed_at && moment(closed_at).format('MMM D, YY - h:mm A'),
        vulnerability_information:
          vulnerability_information &&
          vulnerability_information.replace(/(\r\n|\n|\r)/gm, '<br/>'),
        summaries: summaries.map(({ content, created_at, ...summary }) => ({
          ...summary,
          content: content.replace(/(\r\n|\n|\r)/gm, '<br/>'),
          created_at: created_at && moment(created_at).format('MMM D, YY - h:mm A')
        }))
      })
    );
  });

const aggregateEntityProgramReporters = aggregateEntityProgram('reporters', (reporters) =>
  reporters.map(({ profile_picture, ...reporter }) => ({
    ...reporter,
    profile_picture: !profile_picture.startsWith("/assets") && profile_picture 
  }))
);


module.exports = getTeamData;
