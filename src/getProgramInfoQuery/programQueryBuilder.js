const fp = require('lodash/fp');
const { STRUCTURED_SCOPES_EDGES, GET_ALL_REPORTS_QUERY } = require('../constants');

const programQueryBuilder = (entitiesWithIds, programName, responseCache) =>
  fp.flow(
    fp.reduce(
      (agg, entity) =>
        `${agg}
      ${entity.id}: structured_scopes(first: 500, archived: false, search: "${entity.value}") {
        ${STRUCTURED_SCOPES_EDGES}
      }
    `,
      ''
    ),
    fp.thru(
      (scopeStructureQueries) => `
        query ($handle: String!) {  
          team(handle: $handle) {
            id
            handle
            ${scopeStructureQueries}
          }
          ${!responseCache.get(programName) ? GET_ALL_REPORTS_QUERY : ''}
        }
      `
      //Used to get valuedVulnerabilities, which is not currently being used
      //handle
      //${!responseCache.get(programName) ? 'policy' : ''}
    )
  )(entitiesWithIds);


module.exports = programQueryBuilder;