const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });

const getScopesQuery = async (entities, programName, options, requestWithDefaults, Logger) => {
  const entitiesWithIds = fp.map(fp.assign({ id: `a${Math.random().toString(36).slice(2)}` }))(
    entities
  );

  const query = scopesQueryBuilder(entitiesWithIds);

  const { body } = await requestWithDefaults({
    url: 'https://hackerone.com/graphql',
    method: 'POST',
    options,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { handle: programName }
    })
  });
  

  Logger.trace(
    {
      entitiesWithIds,
      query,
      body
    },
    'TESTING'
  );
  return formatScopesResponse(entitiesWithIds, body, Logger);
};

const scopesQueryBuilder = fp.flow(
  fp.reduce(
    (agg, entity) =>
      `${agg}
      ${entity.id}: structured_scopes(first: 500, archived: false, search: "${entity.value}") {
        edges {
          node {
            id
            asset_identifier
            asset_type
            created_at
            eligible_for_bounty
            eligible_for_submission
            instruction
            max_severity
          }
        }
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
    }
  `
  )
);

const formatScopesResponse = (entities, body, Logger) =>
  fp.flow(
    fp.getOr({}, 'data.team'),
    fp.omit(['id', 'handle']),
    fp.tap((x) => Logger.trace({test:x}, "SLDKFJL")),
    reduce(
      (agg, scopesForEntity, entityId) => ({
        ...agg,
        [fp.find(({ id }) => id === entityId)(entities).value]: (
          scopesForEntity.edges || []
        ).map(fp.get('node'))
      }),
      {}
    )
  )(body);

module.exports = {
  getScopesQuery
};
