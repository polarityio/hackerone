const fp = require('lodash/fp');

const createLookupResults = (options, entities, scopesMap, cweMap, reportsMap, reportersMap) =>
  fp.map((entity) => {
    const scopes = scopesMap[entity.value];
    const cwes = cweMap[entity.value];
    const reports = reportsMap[entity.value];
    const reporters = reportersMap[entity.value];
    
    const hasResults = fp.some(fp.map(fp.size));

    const resultsFound =
      hasResults(scopes) ||
      hasResults(cwes) ||
      hasResults(reports) ||
      hasResults(reporters);

    return {
      entity,
      data: !resultsFound
        ? null
        : {
            summary: _createSummary(entity, scopes, cwes, reports, reporters),
            details: {
              programsToSearch: options.programsToSearch,
              scopes,
              cwes,
              reports,
              reporters
            }
          }
    };
  })(entities);

const _createSummary = (entity, scopes, cwes, reports, reporters) => {
  const scopesTags = [
    entity.type === 'custom' && entity.types.indexOf('custom.cwe') >= 0
      ? '' : 
    fp.flow(fp.values, fp.some(fp.get('eligible_for_submission')))(scopes)
      ? 'In Scope'
      : 'Out of Scope'
  ];
  
  const reportsTags = [
    fp.some(fp.some(fp.get('valuedVulnerability')))(reports)
      ? 'Valued Vulnerability Found'
      : '',
    fp.some((programReports) =>
      fp.some(
        (report) =>
          fp.filter((_report) => {
            const reportScopeId = fp.getOr('', 'structured_scope.id')(report);
            const _reportScopeId = fp.getOr('', 'structured_scope.id')(_report);
            const reportWeaknessId = fp.getOr('', 'weakness.id')(report);
            const _reportWeaknessId = fp.getOr('', 'weakness.id')(_report);
            return (
              reportScopeId === _reportScopeId || reportWeaknessId === _reportWeaknessId
            );
          }, programReports).length > 1,
        programReports
      )
    )
      ? 'Contains Possibly Duplicate Bugs'
      : ''
  ];

  return fp.flow(fp.flatten, fp.compact)([scopesTags, reportsTags]);
};

module.exports = createLookupResults;