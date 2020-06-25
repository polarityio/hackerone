const fp = require('lodash/fp');
const { extractMarkdownTable } = require('../dataTransformations');

const formatCweResponse = (entities, programName, body, responseCache, Logger) => {
  const cachedProgramData = responseCache.get(programName);
  if (!cachedProgramData || !cachedProgramData.cwes) {
    const error = addCwesResponseToCache(
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
  return formatCweTable(cweEntityValues, programName, responseCache, Logger);
};

const addCwesResponseToCache = (
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
    id: fp.flow(fp.getOr('', 'CWE-ID'), fp.replace(/<.+?>/g, ''))(cwe),
    link: cwe['CWE-ID'],
    lowSeverity: cwe['Severity (low)'],
    highSeverity: cwe['Severity (high)'],
    commonWeaknessEnumeration: cwe['Common Weakness Enumeration'],
    bugExamples: cwe['Bug Examples'],
    valuedVulnerability: true
  }));

  responseCache.set(programName, { ...cachedProgramData, cwes: fromattedCWEs });
};

const formatCweTable = (cweEntityValues, programName, responseCache) =>
  responseCache.get(programName).cwes.reduce((agg, cwe) => {
    const entityValueForCWE = fp.find(
      (entityValue) => cwe.id.toLowerCase().includes(entityValue.toLowerCase()),
      cweEntityValues
    );
    return {
      ...agg,
      ...(entityValueForCWE && {
        [entityValueForCWE]: [...(agg.entityValueForCWE || []), cwe]
      })
    };
  }, {});

module.exports = formatCweResponse;
