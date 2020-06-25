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
            ${!responseCache.get(programName) ? 'policy' : ''}
            ${scopeStructureQueries}
          }
          ${!responseCache.get(programName) ? GET_ALL_REPORTS_QUERY : ''}
        }
      `
    )
  )(entitiesWithIds);


module.exports = programQueryBuilder;