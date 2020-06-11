const fp = require('lodash/fp');

const createLookupResults = (options, entities, scopesMap) =>
  fp.map((entity) => {
    const scopes = scopesMap[entity.value];

    const scopesResultsFound = fp.some(fp.map(fp.size))(scopes);

    const resultsFound = scopesResultsFound;

    return {
      entity,
      data: !resultsFound
        ? null
        : {
            summary: _createSummary(scopes),
            details: {
              programsToSearch: options.programsToSearch,
              scopes
            }
          }
    };
  })(entities);

const _createSummary = (scopes) => {
  const scopesTags = [
    fp.flow(
      fp.values,
      fp.some(fp.get('eligible_for_submission'))
    )(scopes)
      ? 'In Scope'
      : 'Out of Scope'
  ];

  return fp.flow(fp.flatten, fp.compact)([scopesTags]);
};

module.exports = createLookupResults;