module.exports = {
  name: 'HackerOne',
  acronym: 'H1',
  description: 'TODO',
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
  styles: ['./styles/styles.less'],
  onDemandOnly: true,
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  request: {
    cert: '',
    key: '',
    passphrase: '',
    ca: '',
    proxy: '',
    rejectUnauthorized: false
  },
  logging: {
    level: 'trace' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'email',
      name: 'Email',
      description: 'The email associated with your HackerOne account',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'password',
      name: 'Password',
      description: 'The password  associated with your HackerOne account',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'programsToSearch',
      name: 'Programs to Search',
      description:
        'A comma separated list of program IDs you would like to search on. These IDs can be found in the Program Page URL on the HackerOne Dashboard (https://hackerone.com/<program-id>...).',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
