const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });

const validateOptions = (options, callback) => {
  const stringOptionsErrorMessages = {
    ...(options.useGraphql.value
      ? {
          email: 'You must provide a valid Email from you HackerOne Account',
          password: 'You must provide a valid Password from you HackerOne Account'
        }
      : {
          apiUsername: 'You must provide a valid API Username from HackerOne',
          apiKey: 'You must provide a valid API Key from HackerOne'
        }),
    programsToSearch: 'You must provide at least one valid Program to Search in HackerOne'
  };

  const stringValidationErrors = _validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

  const commaSeparatedListError = fp.flow(
    fp.split(','),
    fp.map(fp.trim),
    fp.some(fp.includes(' '))
  )(options.programsToSearch.value)
    ? {
        key: 'programsToSearch',
        message: 'Program Names are not allowed to include spaces.'
      }
    : [];

  callback(null, stringValidationErrors.concat(commaSeparatedListError));
};

const _validateStringOptions = (stringOptionsErrorMessages, options, otherErrors = []) =>
  reduce((agg, message, optionName) => {
    const isString = typeof options[optionName].value === 'string';
    const isEmptyString = isString && fp.isEmpty(options[optionName].value);

    return !isString || isEmptyString
      ? agg.concat({
          key: optionName,
          message
        })
      : agg;
  }, otherErrors)(stringOptionsErrorMessages);

module.exports = validateOptions;
