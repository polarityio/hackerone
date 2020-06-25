const moment = require('moment');
const getProgramInfoQuery = require('../getProgramInfoQuery/index');
const aggregateEntityProgram = require('./aggregateEntityProgram');
const aggregateEntityProgramReports = require('./aggregateEntityProgramReports');
const { _P } = require('../dataTransformations');
const NodeCache = require('node-cache');
const responseCache = new NodeCache({
  stdTTL: 59 * 60 * 12
});

const getQueryData = (entities, options, requestWithDefaults, Logger) =>
  _P.reduce(
    options.programsToSearch,
    async (entityProgramAgg, programName) => {
      const { scopes, cwes, reports, reporters } = await getProgramInfoQuery(
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
         *   [dataType]: { //(e.g. scopes)
         *     [entityValue]: {
         *       [programName]: [
         *         dataTypeValuesForThisEntityInThisProgram
         *       ]
         *       ...
         *     }
         *     ...
         *   }
         *   ...
         * }
         */
        scopes: aggregateEntityProgramScopes(
          entities,
          programName,
          entityProgramAgg,
          scopes
        ),
        cwes: aggregateEntityProgramCWEs(entities, programName, entityProgramAgg, cwes),
        reports: aggregateEntityProgramReports(programName, responseCache)(
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


const aggregateEntityProgramScopes = aggregateEntityProgram('scopes', (scopes) =>
  scopes.map(({ created_at, ...scope }) => ({
    ...scope,
    created_at: moment(created_at).format('MMM D, YY - h:mm A')
  }))
);

const aggregateEntityProgramCWEs = aggregateEntityProgram('cwes');

const aggregateEntityProgramReporters = aggregateEntityProgram('reporters', (reporters) =>
  reporters.map(({ profile_picture, ...reporter }) => ({
    ...reporter,
    profile_picture: !profile_picture.startsWith('/assets') && profile_picture
  }))
);

module.exports = getQueryData;
