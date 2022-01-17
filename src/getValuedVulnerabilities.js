const fp = require('lodash/fp');
const { extractMarkdownTable } = require('./dataTransformations');

const getValuedVulnerabilities = (entities, programName, body, responseCache, Logger) => {
  if (!programName || !body) return {};

  const cachedProgramData = responseCache.get(programName);
  if (!cachedProgramData || !fp.get('valuedVulnerabilities', cachedProgramData)) {
    const error = addValuedVulnerabilityResponseToCache(
      body,
      programName,
      cachedProgramData,
      responseCache,
      Logger
    );
    if (error) return {};
  }

  const cweEntityValues = fp.reduce(
    (agg, entity) =>
      entity.type === 'custom' && entity.types.indexOf('custom.cwe') >= 0
        ? [...agg, entity.value]
        : agg,
    []
  )(entities);
  if (!cweEntityValues || !cweEntityValues.length) return {};

  /** Return Structure
   * {
   *   [entityValue]: [cwesForThisEntity]
   *   ...
   * }
   */
  return formatValuedVulnerabilityTable(
    cweEntityValues,
    programName,
    responseCache,
    Logger
  );
};

const addValuedVulnerabilityResponseToCache = (
  body,
  programName,
  cachedProgramData,
  responseCache,
  Logger
) => {
  const policy = fp.getOr('', 'data.team.policy', body);

  const getIndex = (str) => {
    const index = policy.indexOf(str);
    return index > -1 && index;
  };

  const startTableIndex = getIndex(
    '|Severity (low)|Severity (high)|CWE-ID|Common Weakness Enumeration|Bug Examples|'
  );

  const endTableIndex = getIndex('### Border');

  if (!startTableIndex || !endTableIndex) return 'tableNotFound';

  const cweTableString = fp.flow(
    fp.thru((policy) => policy.slice(startTableIndex, endTableIndex)),
    fp.replace(/\r\n/g, '\n')
  )(policy);

  if (!cweTableString) return 'tableNotFound';

  const cweTable = extractMarkdownTable(cweTableString);

  const fromattedCWEs = cweTable.map((cwe) => ({
    label: fp.flow(fp.getOr('', 'CWE-ID'), fp.replace(/<.+?>/g, ''))(cwe),
    link: cwe['CWE-ID'],
    lowSeverity: cwe['Severity (low)'],
    highSeverity: cwe['Severity (high)'],
    commonWeaknessEnumeration: cwe['Common Weakness Enumeration'],
    bugExamples: cwe['Bug Examples'],
    valuedVulnerability: true
  }));

  responseCache.set(programName, {
    ...cachedProgramData,
    valuedVulnerabilities: fromattedCWEs
  });
};

const formatValuedVulnerabilityTable = (
  cweEntityValues,
  programName,
  responseCache,
  Logger
) =>
  fp.flow(
    fp.getOr([], 'valuedVulnerabilities'),
    fp.reduce((agg, valuedVulnerability) => {
      const entityValueForValuedVulnerability = fp.find(
        (entityValue) =>
          fp.flow(
            fp.get('label'),
            fp.toLower,
            fp.includes(fp.toLower(entityValue))
          )(valuedVulnerability),
        cweEntityValues
      );
      return {
        ...agg,
        ...(entityValueForValuedVulnerability && {
          [entityValueForValuedVulnerability]: [
            ...(agg.entityValueForValuedVulnerability || []),
            valuedVulnerability
          ]
        })
      };
    }, {})
  )(responseCache.get(programName));

module.exports = getValuedVulnerabilities;
