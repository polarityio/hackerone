const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });

const formatScopesResponse = (entities, body, Logger) =>
  fp.flow(
    fp.getOr({}, 'data.team'),
    fp.omit(['id', 'handle', 'policy']),
    reduce((agg, scopesForEntity, entityId) => {
      const entityForThisScope = fp.find(({ id }) => id === entityId, entities);
      return {
        ...agg,
        ...(entityForThisScope && {
          [entityForThisScope.value]: fp
            .getOr([], 'edges', scopesForEntity)
            .map(fp.get('node'))
        })
      };
    }, {})
    /** Return Structure
     * {
     *   [entityValue]: [scopesForThisEntity]
     *   ...
     * }
     */
  )(body);

module.exports = formatScopesResponse;