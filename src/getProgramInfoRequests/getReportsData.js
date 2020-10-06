const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });
const moment = require('moment');
const { _P } = require('../dataTransformations');

const getReportsData = async (
  { attributes: { handle: programName } },
  entities,
  responseCache,
  options,
  requestWithDefaults,
  Logger
) => {
  const cwes = responseCache.get(programName).cwes || [];
  const reportsRequests = fp.reduce(
    (agg, entity) => ({
      ...agg,
      [entity.value]: getReports(
        programName,
        entity,
        cwes,
        options,
        requestWithDefaults,
        Logger
      )
    }),
    {}
  )(entities);

  const reportsRequestData = await _P.parallel(reportsRequests);

  const reportsData = reduce(
    (agg, entityData, entityValue) => ({
      reports: {
        ...agg.reports,
        [entityValue]: entityData.reports
      },
      reporters: {
        ...agg.reporters,
        [entityValue]: entityData.reporters
      }
    }),
    { reports: {}, reporters: {} }
  )(reportsRequestData);

  /** Return Structure
   * {
   *   reports: {
   *     [entityValue]: [reportsForThisEntity]
   *     ...
   *   }
   *   reporters: {
   *     [entityValue]: [reportersForThisEntity]
   *     ...
   *   }
   * }
   */
  return reportsData;
};

const getReports = async (
  programName,
  entity,
  cwes,
  options,
  requestWithDefaults,
  Logger
) => {
  const isCwe = entity.type === 'custom' && entity.types.indexOf('custom.cwe') >= 0;
  const weaknessIds =
    isCwe &&
    fp.flow(
      fp.filter(({ label }) => fp.toLower(label) === fp.toLower(entity.value)),
      fp.map(fp.get('id')),
      fp.compact,
      fp.uniq
    )(cwes);

  const getValuedVulnerabilityCWE = (weakness) =>
    fp.find((cwe) => {
      const weaknessId = fp.getOr('', 'external_id')(weakness).toLowerCase();
      return cwe.label.toLowerCase() === weaknessId;
    }, cwes);

  let reports;
  if (!isCwe || !weaknessIds || !weaknessIds.length) {
    const { body } = await requestWithDefaults({
      url:
        'https://api.hackerone.com/v1/reports?' +
        `filter[program][]=${programName}&sort=-reports.created_at&` +
        `filter[keyword]=${entity.value}`,
      method: 'GET',
      options
    });

    if (!body) return { reports: [], reporters: [] };

    reports =
      (body.data &&
        body.data.length &&
        fp.map(formatReport(getValuedVulnerabilityCWE))(body.data)) ||
      [];
  } else if (isCwe && weaknessIds && weaknessIds.length) {
    const weaknessReportsRequestResults = await _P.parallel(
      fp.map((weaknessId) =>
        requestWithDefaults({
          url:
            'https://api.hackerone.com/v1/reports?' +
            `filter[program][]=${programName}&sort=-reports.created_at&` +
            `filter[weakness_id][]=${weaknessId}`,
          method: 'GET',
          options
        })
      )(weaknessIds)
    );

    const weaknessReports = fp.flow(
      fp.map(fp.get('body.data')),
      fp.compact,
      fp.flatten,
      fp.uniqBy(['id', 'title'])
    )(weaknessReportsRequestResults);
    
    reports =
      (weaknessReports &&
        weaknessReports.length &&
        fp.map(formatReport(getValuedVulnerabilityCWE))(weaknessReports)) ||
      [];
  } else {
    return { reports: [], reporters: [] };
  }

  const reporters = fp.flow(fp.map(fp.get('reporter')), fp.uniqBy('username'))(reports);

  return {
    reports,
    reporters
  };
};


const getBounty = fp.flow(
  fp.getOr([], 'data'),
  fp.flatMap(
    fp.flow(
      fp.get('attributes'),
      fp.pick(['amount', 'bonus_amount']),
      fp.values,
      fp.map(fp.toNumber),
      fp.compact
    )
  ),
  fp.sum
);

const formatReport = (getValuedVulnerabilityCWE) => ({
  id,
  attributes: {
    title,
    vulnerability_information,
    issue_tracker_reference_id,
    state,
    created_at,
    closed_at,
    reporter_agreed_on_going_public_at,
    latest_activity_at,
    latest_public_activity_at
  },
  relationships: {
    reporter,
    custom_field_values,
    weakness,
    structured_scope,
    severity,
    assignee,
    bounties
  }
}) => {
  const reporterData = fp.getOr({}, 'data.attributes')(reporter);
  const weaknessData = fp.getOr({}, 'data.attributes')(weakness);
  const structuredScope = fp.getOr({}, 'data.attributes')(structured_scope);
  const severityData = fp.getOr({}, 'data.attributes')(severity);
  const customNodes = fp.getOr({}, 'data')(custom_field_values);
  const valuedVulnerability = getValuedVulnerabilityCWE(weaknessData);
  const assignedTo = fp.get('data.attributes.username')(assignee);
  const bounty = getBounty(bounties);

  return {
    id,
    title,
    state,
    assignedTo,
    bounty,
    vulnerability_information:
      vulnerability_information &&
      vulnerability_information.replace(/(\r\n|\n|\r)/gm, '<br/>'),
    reference: issue_tracker_reference_id,
    created_at: created_at && moment(created_at).format('MMM D, YY'),
    closed_at: closed_at && moment(closed_at).format('MMM D, YY - h:mm A'),
    url: `https://hackerone.com/reports/${id}`,
    bug_reporter_agreed_on_going_public_at:
      reporter_agreed_on_going_public_at &&
      moment(reporter_agreed_on_going_public_at).format('MMM D, YY - h:mm A'),
    latest_activity_at:
      latest_activity_at && moment(latest_activity_at).format('MMM D, YY - h:mm A'),
    latest_public_activity_at:
      latest_public_activity_at &&
      moment(latest_public_activity_at).format('MMM D, YY - h:mm A'),
    reporter: {
      ...reporterData,
      profile_picture:
        !reporterData.profile_picture['110x110'].startsWith('/assets') &&
        reporterData.profile_picture['110x110']
    },
    weakness: {
      ...weaknessData,
      valuedVulnerability: {
        ...valuedVulnerability,
        hasValue: !!valuedVulnerability
      }
    },
    custom_field_values: { nodes: customNodes },
    structured_scope: {
      ...structuredScope,
      created_at:
        structuredScope.created_at &&
        moment(structuredScope.created_at).format('MMM D, YY - h:mm A')
    },
    severity: severityData
  };
};

module.exports = getReportsData;
