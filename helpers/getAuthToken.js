const fp = require('lodash/fp');
const NodeCache = require('node-cache');
const request = require('request');
const config = require('../config/config');

const cache = new NodeCache({
  stdTTL: 59 * 60
});

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

const getSetCookies = fp.flow(
  fp.get('set-cookie'),
  fp.map(fp.flow(fp.split('; '), fp.first)),
  fp.join('; ')
);

const getAuthToken = async (options, requestWithDefaults, Logger, cb) => {
  const {
    request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
  } = config;

  const defaults = {
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(_configFieldIsValid(proxy) && { proxy }),
    ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized })
  };

  const requestDefaults = request.defaults(defaults);

  requestDefaults(
    {
      uri: 'https://hackerone.com/current_user',
      method: 'GET',
      headers: {
        Host: 'hackerone.com',
        Accept: '*/*'
      },
      json: true
    },
    (error, { body: { csrf_token }, headers: currentUserHeaders }) => {
      if (error) cb(error);

      requestDefaults(
        {
          method: 'POST',
          url: 'https://hackerone.com/users/sign_in',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: getSetCookies(currentUserHeaders)
          },
          form: {
            authenticity_token: csrf_token,
            'user[email]': options.email,
            'user[password]': options.password
          }
        },
        (error, response) => {
          if (error) cb(error);

          requestDefaults(
            {
              url: 'https://hackerone.com/current_user/graphql_token.json',
              method: 'GET',
              headers: {
                Cookie: getSetCookies(response.headers),
                Host: 'hackerone.com',
                Accept: '*/*'
              },
              json: true
            },
            (error, response) => {
              Logger.trace({ response, error }, 'HERHER DOES THIS WORK');
              if (error) cb(error);

              if (
                response &&
                response.body &&
                response.body.graphql_token &&
                response.body.graphql_token !== '----'
              ) {
                cb(null, response.body.graphql_token);
              }
            }
          );
        }
      );
    }
  );
};

module.exports = getAuthToken;
