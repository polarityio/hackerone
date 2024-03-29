module.exports = {
  name: 'HackerOne',
  acronym: 'H1',
  description:
    'HackerOne is a hacker-powered security platform that provides unmatched cybersecurity speed, depth and breadth of coverage at a greater value.',
  entityTypes: ['IPv4', 'IPv6', 'domain'],
  customTypes: [
    {
      key: 'cwe',
      regex: /CWE-[0-9]{1,}/
    }
  ],
  styles: ['./styles/styles.less'],
  defaultColor: 'dark-orange',
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
    proxy: ""
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'apiUsername',
      name: 'API Username',
      description:
        'The username associated with your API HackerOne account. (This is not neccisarily the same as the username for your normal HackerOne account)',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'apiKey',
      name: 'API Key',
      description: 'The your API Key for HackerOne.',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'useGraphql',
      name: 'Use Standard Login',
      description:
        'Allows you to use your normal dashboard login email and password to access the integration, including controlling what programs to search with aliasing.',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    },
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
      description: 'The password associated with your HackerOne account',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'programsToSearch',
      name: 'Programs to Search',
      description:
        'A comma separated list of program IDs you would like to search on. These IDs can be found in the Program Page URL on the HackerOne Dashboard (https://hackerone.com/<program-id>...).  You also have the ability to optionally add an alias for each of your program IDs using the structure "ProgramAlias>programId".',
      default: 'HackerOneExample>security',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    }
  ]
};
