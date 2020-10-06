const fp = require('lodash/fp');
const NodeCache = require('node-cache');
const request = require('request');

const cache = new NodeCache({
  stdTTL: 59 * 60
});

const getSetCookies = fp.flow(
  fp.get('set-cookie'),
  fp.map(fp.flow(fp.split('; '), fp.first)),
  fp.join('; ')
);

const getGraphqlAuthToken = async (options, defaults, Logger, cb) => {
  const credentials = cache.get(`${options.email}${options.password}`);
  if (credentials) return cb(null, credentials);

  const requestDefaults = request.defaults(fp.omit('json')(defaults));

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
    (error, result) => {
      if (error) cb(error);

      const { body: { csrf_token }, headers: currentUserHeaders } = result;
      
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
              if (error) cb(error);

              if (
                response &&
                response.body &&
                response.body.graphql_token &&
                response.body.graphql_token !== '----'
              ) {
                const credentials = {
                  token: response.body.graphql_token,
                  Cookie: getSetCookies(response.headers)
                };
                cache.set(`${options.email}${options.password}`, credentials);
                cb(null, credentials);
              }
            }
          );
        }
      );
    }
  );
};

module.exports = {
  getGraphqlAuthToken
};
