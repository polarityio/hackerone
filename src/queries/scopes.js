const getScopes = async (entity, programName, options, requestWithDefaults, Logger) => {
  const query = `
    query ($handle: String!) {  
      team(handle: $handle) {
        id
        handle
        structured_scopes(first: 500, archived: false, search: "${entity.value}") {
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
      }
    }
  `;

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
  Logger.trace({ test: body }, 'KSJLFS');
  return body &&
    body.data && 
    body.data.team && 
    body.data.team.structured_scopes;
};


module.exports = {
  getScopes
}