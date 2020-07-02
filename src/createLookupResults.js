const fp = require('lodash/fp');

const createLookupResults = (
  options,
  entities,
  scopesMap,
  cweMap,
  reportsMap,
  reportersMap,
  programsToSearch
) =>
  fp.map((entity) => {
    const scopes = scopesMap[entity.value];
    const cwes = cweMap[entity.value];
    const reports = reportsMap[entity.value];
    const reporters = reportersMap[entity.value];

    const hasResults = fp.some(fp.size);

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
              programsToSearch: programsToSearch || options.programsToSearch,
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
      ? ''
      : fp.some(fp.some(fp.get('eligible_for_submission')))(scopes)
      ? 'In Scope'
      : 'Out of Scope'
  ];

  const cwesTags = [
    ...fp.flow(
      fp.flatMap(fp.map(fp.getOr('', 'commonWeaknessEnumeration'))),
      fp.uniq
    )(cwes)
  ];

  const reportsTags = getReportsTags(reports);

  return fp.flow(fp.flatten, fp.compact)([scopesTags, reportsTags, cwesTags]);
};

const getReportsTags = (reports) => {
  const valuedVulnerabilityFound = fp.some(fp.some(fp.get('valuedVulnerability')))(
    reports
  )
    ? 'Valued Vulnerability Found'
    : '';

  const h1Triaged = fp.some(
    fp.some(
      fp.flow(
        fp.getOr([], 'summaries'),
        fp.some(fp.flow(fp.getOr('', 'content'), fp.includes('[H1 Triage]')))
      )
    )
  )(reports)
    ? 'H1 Triaged'
    : '';

  const needsBountyReview = fp.some(
    fp.some(
      (report) =>
        fp.getOr('', 'assignee.username')(report) === 'Pending Final Bounty' ||
        fp.getOr('', 'assignee.name')(report) === 'Pending Final Bounty' ||
        fp.flow(
          fp.getOr('', 'custom_field_values.nodes'),
          fp.map(fp.get('value')),
          (customFieldValues) =>
            fp.includes('needs +1')(customFieldValues) ||
            fp.includes('needs +2')(customFieldValues)
        )(report) ||
        fp.flow(
          fp.getOr('', 'summaries'),
          fp.map(fp.get('content')),
          fp.includes(/suggested a .* bounty/g)
        )(report)
    )
  )(reports)
    ? 'Needs Bounty Review'
    : '';

  const duplicateBugs = fp.some((programReports) =>
    fp.some(
      (report) =>
        fp.filter((_report) => {
          const reportScopeId = fp.getOr('nope', 'structured_scope.id')(report);
          const _reportScopeId = fp.getOr('', 'structured_scope.id')(_report);
          const reportWeaknessId = fp.getOr('nope', 'weakness.id')(report);
          const _reportWeaknessId = fp.getOr('', 'weakness.id')(_report);
          return (
            reportScopeId === _reportScopeId || reportWeaknessId === _reportWeaknessId
          );
        }, programReports).length > 1,
      programReports
    )
  )(reports)
    ? 'Contains Possibly Duplicate Bugs'
    : '';

  return [valuedVulnerabilityFound, h1Triaged, needsBountyReview, duplicateBugs];
};

module.exports = createLookupResults;
