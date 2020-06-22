const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });
const NodeCache = require('node-cache');

const { extractMarkdownTable } = require('../dataTransformations');
const { STRUCTURED_SCOPES_EDGES, GET_ALL_REPORTS_QUERY } = require('../constants');
const cache = new NodeCache({
  stdTTL: 59 * 60 * 12
});

const getTeamQuery = async (
  entities,
  programName,
  options,
  requestWithDefaults,
  Logger
) => {
  const entitiesWithIds = fp.map(
    fp.assign({ id: `a${Math.random().toString(36).slice(2)}` })
  )(entities);

  const query = teamQueryBuilder(entitiesWithIds, programName);

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
  
  return {
    scopes: formatScopesResponse(entitiesWithIds, body, Logger),
    cwes: formatCweResponse(entitiesWithIds, programName, body, Logger),
    ...formatReportsReponse(entitiesWithIds, programName, body, Logger)
  };
};

const teamQueryBuilder = (entitiesWithIds, programName) =>
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
            ${!cache.get(programName) ? 'policy' : ''}
            ${scopeStructureQueries}
          }
          ${!cache.get(programName) ? GET_ALL_REPORTS_QUERY : ''}
        }
      `
    )
  )(entitiesWithIds);

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
  )(body);

const formatCweResponse = (entities, programName, body, Logger) => {
  const cachedProgramData = cache.get(programName);
  if (!cachedProgramData || !cachedProgramData.cwes) {
    const policy = fp.getOr('', 'data.team.policy', body);
    const getIndex = (str) => {
      const index = policy.indexOf(str);
      return index > -1 && index;
    };

    const startTableIndex = getIndex(
      '|Severity (low)|Severity (high)|CWE-ID|Common Weakness Enumeration|Bug Examples|'
    );

    const endTableIndex = getIndex('### Borderline Out-of-Scope, No Bounty');

    if (!startTableIndex || !endTableIndex) return {};

    const cweTableString = policy
      .slice(startTableIndex, endTableIndex)
      .replace(/\r\n/g, '\n');

    const cweTable = extractMarkdownTable(cweTableString);

    const fromattedCWEs = cweTable.map((cwe) => ({
      id: cwe['CWE-ID'].replace(/<.+?>/g, ''),
      link: cwe['CWE-ID'],
      lowSeverity: cwe['Severity (low)'],
      highSeverity: cwe['Severity (high)'],
      commonWeaknessEnumeration: cwe['Common Weakness Enumeration'],
      bugExamples: cwe['Bug Examples']
    }));

    cache.set(programName, { ...cachedProgramData, cwes: fromattedCWEs });
  }

  const cweEntityValues = entities.reduce(
    (agg, entity) =>
      entity.type === 'custom' && entity.types.indexOf('custom.cwe') >= 0
        ? [...agg, entity.value]
        : agg,
    []
  );
  if (!cweEntityValues || !cweEntityValues.length) return {};

  return cache.get(programName).cwes.reduce((agg, cwe) => {
    const entityValueForCWE = fp.find((entityValue) => cwe.id.includes(entityValue))(
      cweEntityValues
    );

    return {
      ...agg,
      ...(entityValueForCWE && {
        [entityValueForCWE]: [...(agg.entityValueForCWE || []), cwe]
      })
    };
  }, {});
};

const formatReportsReponse = (entities, programName, body, Logger) =>
  fp.flow(
    fp.getOr({}, 'data.reports.nodes'),
    fp.thru((_reports) => {
      const cachedReports = fp.getOr(false, 'reports')(cache.get(programName));
      const reports = cachedReports || _reports;
      Logger.trace({ programName, reports }, 'Reports By Program');
      if (!cachedReports)
        cache.set(programName, {
          ...cache.get(programName),
          reports
        });

      const entityValues = entities.map(({ value }) => value.toLowerCase());

      const formattedReports = reduce((reportsAgg, report) => {
        const entitiesForThisReport = fp.flow(
          fp.filter((entityValue) => {
            const fieldIncludesEntity = (path) =>
              fp.flow(
                fp.getOr('', path),
                fp.method('toLowerCase'),
                fp.includes(entityValue)
              )(report);

            const listFieldIncludesEntity = (initialPath, fieldName) =>
              fp.flow(
                fp.getOr([], initialPath),
                fp.some(
                  fp.flow(
                    fp.getOr('', fieldName),
                    fp.method('toLowerCase'),
                    fp.includes(entityValue)
                  )
                )
              )(report);

            return (
              fieldIncludesEntity('title') ||
              fieldIncludesEntity('vulnerability_information') ||
              fieldIncludesEntity('reporter.website') ||
              listFieldIncludesEntity('weakness', 'external_id') ||
              listFieldIncludesEntity('triage_meta', 'url') ||
              listFieldIncludesEntity('summaries', 'content') ||
              listFieldIncludesEntity('structured_scope', 'asset_identifier') ||
              listFieldIncludesEntity('custom_field_values.nodes', 'value')
            );
          }),
          fp.map((entityValueForThisReport) =>
            fp.find(({ value }) => entityValueForThisReport === value.toLowerCase())(entities)
          )
        )(entityValues);
        
        return entitiesForThisReport.length
          ? {
              ...reportsAgg,
              reports: {
                ...reportsAgg.reports,
                ...reduce(
                  (entityAgg, { value: entityForThisReport }) => ({
                    ...entityAgg,
                    [entityForThisReport]: [
                      ...fp.getOr([], `reports["${entityForThisReport}"]`)(reportsAgg),
                      report
                    ]
                  }),
                  {}
                )(entitiesForThisReport)
              },
              reporters: {
                ...reportsAgg.reporters,
                ...reduce(
                  (entityAgg, { value: entityForThisReport }) => ({
                    ...entityAgg,
                    [entityForThisReport]: fp.uniqBy('id')([
                      ...fp.getOr([], `reporters["${entityForThisReport}"]`)(reportsAgg),
                      report.reporter
                    ])
                  }),
                  {}
                )(entitiesForThisReport)
              }
            }
          : reportsAgg;
      }, { reports: {}, reporters: {} })(reports)

      return formattedReports;
    })
  )(body);


module.exports = {
  getTeamQuery
};
