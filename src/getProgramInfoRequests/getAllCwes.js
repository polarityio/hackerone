const fp = require('lodash/fp');
const getValuedVulnerabilities = require('../getValuedVulnerabilities');

const getAllCwes = async (
  program,
  entities,
  responseCache,
  options,
  requestWithDefaults,
  Logger
) => {
  const policy = fp.get('attributes.policy')(program);
  const programName = fp.get('attributes.handle')(program);
  const valuedVulnerabilities = await getValuedVulnerabilities(
    entities,
    programName,
    policy && { data: { team: { policy } } },
    responseCache,
    Logger
  );
  const allCwes = await getCwesRequest(
    program.id,
    programName,
    entities,
    responseCache,
    options,
    requestWithDefaults,
    Logger
  );

  return allCwes;
};

const getCwesRequest = async (
  programId,
  programName,
  entities,
  responseCache,
  options,
  requestWithDefaults,
  Logger
) => {
  const cachedProgramData = responseCache.get(programName);

  if (!cachedProgramData || !cachedProgramData.cwes) {
    const error = await addCwesResponseToCache(
      programId,
      programName,
      options,
      requestWithDefaults,
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
  return formatCwesResults(cweEntityValues, responseCache.get(programName), Logger);
};

const addCwesResponseToCache = async (
  programId,
  programName,
  options,
  requestWithDefaults,
  cachedProgramData,
  responseCache,
  Logger
) => {
  const { body } = await requestWithDefaults({
    url: `https://api.hackerone.com/v1/programs/${programId}/weaknesses`,
    method: 'GET',
    options
  });
  const cwes = fp.get('data')(body);
  if (!cwes || !cwes.length) return;

  const valuedVulnerabilities = responseCache.get(programName).valuedVulnerabilities;

  const fromattedCWEs = cwes.map(({ id, attributes }) => ({
    id,
    label: fp.toUpper(attributes.external_id),
    link: `<a href="http://cwe.mitre.org/data/definitions/${fp.replace(
      /\D/g,
      ''
    )(attributes.external_id)}.html">${fp.toUpper(attributes.external_id)}</a>`,
    commonWeaknessEnumeration: attributes.name,
    description: attributes.description,
    valuedVulnerability:
      valuedVulnerabilities &&
      fp.some(({ label }) => fp.toLower(label) === fp.toLower(attributes.external_id))(
        valuedVulnerabilities
      )
  }));

  responseCache.set(programName, {
    ...cachedProgramData,
    cwes: fromattedCWEs
  });
};

const formatCwesResults = (cweEntityValues, responseCacheValues) => {
  const cweResponse = responseCacheValues.cwes;
  const valuedVulnerabilities = responseCacheValues.valuedVulnerabilities;
  const allCwes = cweResponse.concat(valuedVulnerabilities);

  const formattedCweResults = fp.reduce((agg, cweEntityValue) => {
    const cwesForThisEntity = fp.filter(
      (cwe) => cwe.label.toLowerCase() === cweEntityValue.toLowerCase(),
      allCwes
    );

    return {
      ...agg,
      ...(cwesForThisEntity &&
        cwesForThisEntity.length && {
          [cweEntityValue]: fp.sortBy('label')(cwesForThisEntity)
        })
    };
  }, {})(cweEntityValues);

  return formattedCweResults;
};

module.exports = getAllCwes;
