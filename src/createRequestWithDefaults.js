const fs = require('fs');
const request = require('postman-request');
const { promisify } = require('util');
const fp = require('lodash/fp');
const config = require('../config/config');

const { getGraphqlAuthToken } = require('./getAuthToken');
const { checkForInternalServiceError } = require('./handleError');

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

const createRequestWithDefaults = (Logger) => {
  const {
    request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
  } = config;

  const defaults = {
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(_configFieldIsValid(proxy) && { proxy }),
    ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
    json: true
  };

  const requestWithDefaults = (
    preRequestFunction = () => ({}),
    postRequestSuccessFunction = (x) => x,
    postRequestFailureFunction = (e) => {
      throw e;
    }
  ) => {
    const _requestWithDefault = promisify(request.defaults(fp.omit('json')(defaults)));
    return async ({ json: bodyWillBeJSON, ...requestOptions }) => {
      const preRequestFunctionResults = await preRequestFunction(requestOptions);
      const _requestOptions = {
        ...requestOptions,
        ...preRequestFunctionResults
      };

      let postRequestFunctionResults;
      try {
        const { body, ...result } = await _requestWithDefault(_requestOptions);

        checkForStatusError(
          { body: bodyWillBeJSON || defaults.json ? JSON.parse(body) : body, ...result },
          requestOptions
        );

        postRequestFunctionResults = await postRequestSuccessFunction({
          ...result,
          body: bodyWillBeJSON || defaults.json ? JSON.parse(body) : body
        });
      } catch (error) {
        postRequestFunctionResults = await postRequestFailureFunction(
          error,
          _requestOptions
        );
      }
      return postRequestFunctionResults;
    };
  };

  const handleAuth = async (requestOptions) => {
    if (requestOptions.options.useGraphql) {
      const getAuthTokenPromise = promisify((cb) =>
        getGraphqlAuthToken(requestOptions.options, defaults, Logger, cb)
      ).bind(this);

      const { token, Cookie } = await getAuthTokenPromise().catch((error) => {
        Logger.error({ error }, 'Unable to retrieve Auth Token');
        throw error;
      });

      Logger.trace({ token, Cookie }, 'GrapQL Credentials');

      return {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'x-auth-token': token,
          Cookie
        }
      };
    } else {
      Logger.trace(
        {
          username: requestOptions.options.apiUsername,
          password: requestOptions.options.apiKey
        },
        'Rest Credentials'
      );

      return {
        ...requestOptions,
        auth: {
          username: requestOptions.options.apiUsername,
          password: requestOptions.options.apiKey
        }
      };
    }
  };

  const checkForStatusError = ({ statusCode, body }, requestOptions) => {
    checkForInternalServiceError(statusCode, body);
    if (Math.round(statusCode / 100) * 100 !== 200) {
      const requestError = Error('Request Error');
      requestError.status = statusCode;
      requestError.description = body;
      requestError.requestOptions = requestOptions;
      throw requestError;
    }
  };

  return requestWithDefaults(handleAuth);
};

module.exports = createRequestWithDefaults;
