const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });

const formatReportsResponse = (entities, programName, body, responseCache, Logger) =>
  fp.flow(
    fp.getOr({}, 'data.reports.nodes'),
    fp.thru((_reports) => {
      const cachedReports = fp.getOr(false, 'reports')(responseCache.get(programName));
      const reports = cachedReports || _reports;

      if (!cachedReports)
        responseCache.set(programName, {
          ...responseCache.get(programName),
          reports
        });

      const entityValues = entities.map(({ value }) => value.toLowerCase());

      return formatReports(entities, entityValues, reports, Logger);
    })
  )(body);

const formatReports = (entities, entityValues, reports, Logger) =>
  reduce(
    (reportsAgg, report) => {
      const entitiesForThisReport = getEntitiesForThisReport(
        report,
        entities,
        entityValues
      );

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
              ...reportsAgg.reports,
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
    },
    { reports: {}, reporters: {} }
  )(reports);


const getEntitiesForThisReport = (report, entities, entityValues) =>
  fp.flow(
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

module.exports = formatReportsResponse;
