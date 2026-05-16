const config = {};

config.pep_port = 1027;

config.https = {
  enabled: false,
  cert_file: 'cert/cert.crt',
  key_file: 'cert/key.key',
  port: 443,
};

config.idm = {
  host: 'keyrock',
  port: 3005,
  ssl: false,
};

config.app = {
  host: 'orion',
  port: '1026',
  ssl: false,
};

config.organizations = {
  enabled: false,
  header: 'fiware-service',
};

config.pep = {
  app_id: 'cf75e17c-20f3-4c10-8b3d-6007ae97c19d',
  username: 'pep_proxy_1320b177-8a61-4ad8-a2ea-92454d8fdf80',
  password: 'pep_proxy_f8a756da-447d-4ae9-b4b1-6da481c14622',
  token: {
    secret: 'irfane_token_secret_2024',
  },
  trusted_apps: [],
};

config.cache_time = 300;

config.authorization = {
  enabled: false,
  pdp: 'idm',
  header: undefined,
  location: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    path: '',
  },
  azf: {
    custom_policy: undefined,
  },
};

config.cors = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
};

config.cluster = {
  type: 'manual',
  number: 1,
};

config.public_paths = [];
config.magic_key = undefined;
config.auth_for_nginx = false;

config.error_template = `{
    "type": "{{type}}",
    "title": "{{title}}",
    "detail": "{{message}}"
  }`;
config.error_content_type = 'application/json';

module.exports = config;