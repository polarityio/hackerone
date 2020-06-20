const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });
const { extractMarkdownTable } = require('../dataTransformations');
const { STRUCTURED_SCOPES_EDGES, GET_ALL_REPORTS_QUERY } = require('../constants');


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

  const query = teamQueryBuilder(entitiesWithIds);

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
    cwes: formatCweResponse(entitiesWithIds, body, Logger),
    ...formatReportsReponse(entitiesWithIds, body, Logger)
  };
};

const teamQueryBuilder = fp.flow(
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
        policy
        ${scopeStructureQueries}
      }
      ${GET_ALL_REPORTS_QUERY}
    }
  `
  )
);

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

const formatCweResponse = (entities, body, Logger) => {
  const cweEntityValues = entities.reduce(
    (agg, entity) =>
      entity.type === 'custom' && entity.types.indexOf('custom.cwe') >= 0
        ? [...agg, entity.value]
        : agg,
    []
  );
  if (!cweEntityValues || !cweEntityValues.length) return {};

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

  return fromattedCWEs.reduce((agg, cwe) => {
      const entityValueForCWE = fp.find((entityValue) => cwe.id.includes(entityValue))(
        cweEntityValues
      );

      return {
        ...agg,
        ...(entityValueForCWE && {
          [entityValueForCWE]: [
            ...(agg.entityValueForCWE || []),
            cwe
          ]
        })
      };
    }, 
    {}
  );
};

const formatReportsReponse = (entities, body, Logger) =>
  fp.flow(
    fp.getOr({}, 'data.reports.nodes'),
    fp.thru(reports => {
      const entityValues = entities.map(({ value }) => value.toLowerCase());
      return reduce((reportsAgg, report) => {
        const entitiesForThisReport = fp.filter((entityValue) => {
          const fieldIncludesEntity = (path) =>
            fp.flow(fp.getOr('', path), fp.method('toLowerCase'), fp.includes(entityValue))(report);
  
          const listFieldIncludesEntity = (initialPath, fieldName) =>
            fp.flow(
              fp.getOr([], initialPath),
              fp.some(
                fp.flow(fp.getOr('', fieldName), fp.method('toLowerCase'), fp.includes(entityValue))
              )
            )(report);

          return fieldIncludesEntity('title') ||
            fieldIncludesEntity('reporter.website') ||
            listFieldIncludesEntity('weakness', 'external_id') ||
            listFieldIncludesEntity('triage_meta', 'url') ||
            listFieldIncludesEntity('summaries', 'content') ||
            listFieldIncludesEntity('structured_scope', 'asset_identifier') ||
            listFieldIncludesEntity('custom_field_values.nodes', 'value');
        }, entityValues);
        
        return entitiesForThisReport.length
          ? {
              ...reportsAgg,
              reports: {
                ...reportsAgg.reports,
                ...reduce(
                  (entityAgg, entityForThisReport) => ({
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
                  (entityAgg, entityForThisReport) => ({
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
    })
  )(body);


module.exports = {
  getTeamQuery
};
