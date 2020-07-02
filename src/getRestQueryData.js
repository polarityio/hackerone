const fp = require('lodash/fp');
const { _P } = require('./dataTransformations');
const NodeCache = require('node-cache');
const aggregateEntityProgram = require('./aggregateEntityProgram');
const getProgramInfoRequests = require('./getProgramInfoRequests');

const responseCache = new NodeCache({
  stdTTL: 59 * 60 * 12
});

const getRestQueryData = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const { body } = await requestWithDefaults({
    url: 'https://api.hackerone.com/v1/me/programs',
    method: 'GET',
    options
  });

  const programs = fp.get('data')(body);
  if (!programs || !programs.length) return {};

  const programsToSearch = programs.map(({ attributes }) => ({
    id: attributes.handle,
    alias: attributes.handle
  }));

  return getProgramsData(
    programs,
    programsToSearch,
    entitiesPartition,
    options,
    requestWithDefaults,
    Logger
  );
};

const getProgramsData = (
  programs,
  programsToSearch,
  entities,
  options,
  requestWithDefaults,
  Logger
) =>
  _P.reduce(
    programs,
    async (entityProgramAgg, program) => {
      const { scopes, cwes, reports, reporters } = await getProgramInfoRequests(
        entities,
        program,
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
        programsToSearch,
        scopes: aggregateEntityProgram('scopes')(
          entities,
          program.attributes.handle,
          entityProgramAgg,
          scopes
        ),
        cwes: aggregateEntityProgram('cwes')(
          entities,
          program.attributes.handle,
          entityProgramAgg,
          cwes
        ),
        reports: aggregateEntityProgram('reports')(
          entities,
          program.attributes.handle,
          entityProgramAgg,
          reports
        ),
        reporters: aggregateEntityProgram('reporters')(
          entities,
          program.attributes.handle,
          entityProgramAgg,
          reporters
        )
      };
    },
    {}
  );

module.exports = getRestQueryData;
