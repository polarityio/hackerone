const fp = require('lodash/fp');
const moment = require('moment');
const aggregateEntityProgram = require('../aggregateEntityProgram');

const aggregateEntityProgramReports = (programName, responseCache) =>
  aggregateEntityProgram('reports', (reports) => {
    const allCwes = fp.getOr([], 'cwes')(responseCache.get(programName));

    const getValuedVulnerabilityCWE = (weakness) =>
      fp.find((cwe) => {
        const weaknessId = fp.getOr('', 'external_id')(weakness).toLowerCase();
        return cwe.label.toLowerCase() === weaknessId;
      }, allCwes);

    return formatReports(reports, getValuedVulnerabilityCWE);
  });

const formatReports = (reports, getValuedVulnerabilityCWE) =>
  reports.map(
    ({
      vulnerability_information,
      weakness,
      bug_reporter_agreed_on_going_public_at,
      latest_activity_at,
      latest_public_activity_at,
      closed_at,
      severity,
      summaries,
      ...report
    }) => {
      const valuedVulnerability = getValuedVulnerabilityCWE(weakness);

      return {
        ...report,
        severityIsSet: severity && severity.rating & severity.score,
        weakness: weakness && {
          ...weakness,
          valuedVulnerability: {
            ...valuedVulnerability,
            hasValue: !!valuedVulnerability
          },
          description:
            weakness.description &&
            weakness.description.replace(/(\r\n|\n|\r)/gm, '<br/>')
        },
        bug_reporter_agreed_on_going_public_at:
          bug_reporter_agreed_on_going_public_at &&
          moment(bug_reporter_agreed_on_going_public_at).format('MMM D, YY - h:mm A'),
        latest_activity_at:
          latest_activity_at && moment(latest_activity_at).format('MMM D, YY - h:mm A'),
        latest_public_activity_at:
          latest_public_activity_at &&
          moment(latest_public_activity_at).format('MMM D, YY - h:mm A'),
        closed_at: closed_at && moment(closed_at).format('MMM D, YY - h:mm A'),
        vulnerability_information:
          vulnerability_information &&
          vulnerability_information.replace(/(\r\n|\n|\r)/gm, '<br/>'),
        summaries: summaries.map(({ content, created_at, ...summary }) => ({
          ...summary,
          content: content.replace(/(\r\n|\n|\r)/gm, '<br/>'),
          created_at: created_at && moment(created_at).format('MMM D, YY - h:mm A')
        }))
      };
    }
  );
  
module.exports = aggregateEntityProgramReports;
