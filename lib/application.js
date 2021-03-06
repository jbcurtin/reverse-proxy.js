'use strict';

const program = require('commander');
const {readFile} = require('fs');
const {safeLoadAll: loadYAML} = require('js-yaml');
const morgan = require('morgan');
const {promisify} = require('util');
const {version: pkgVersion} = require('../package.json');
const {Server} = require('./server');

/**
 * Represents an application providing functionalities specific to console requests.
 */
exports.Application = class Application {

  /**
   * The format used for logging the requests.
   * @type {string}
   */
  static get logFormat() {
    return ':req[host] :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
  }

  /**
   * Initializes a new instance of the class.
   */
  constructor() {

    /**
     * The proxy servers managed by this application.
     * @type {Server[]}
     */
    this.servers = [];
  }

  /**
   * The class name.
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return 'Application';
  }

  /**
   * Value indicating whether the application runs in debug mode.
   * @type {boolean}
   */
  get debug() {
    return ['development', 'test'].includes(this.environment);
  }

  /**
   * The application environment.
   * @type {string}
   */
  get environment() {
    return 'NODE_ENV' in process.env ? process.env.NODE_ENV : 'development';
  }

  /**
   * Initializes the application.
   * @param {object} [args] The command line arguments.
   */
  async init(args = {}) {
    if (typeof args.config == 'string') {
      const loadConfig = promisify(readFile);
      this.servers = await this._parseConfig(await loadConfig(args.config, 'utf8'));
    }
    else this.servers = [new Server({
      address: args.address,
      port: args.port,
      target: args.target
    })];
  }

  /**
   * Runs the application.
   */
  async run() {
    // Parse the command line arguments.
    const format = {
      asInteger: value => Number.parseInt(value, 10),
      asIntegerIfNumeric: value => /^\d+$/.test(value) ? Number.parseInt(value, 10) : value
    };

    program.name('reverse-proxy')
      .description('Simple reverse proxy server supporting WebSockets.')
      .version(pkgVersion, '-v, --version')
      .option('-a, --address <address>', `address that the reverse proxy should run on [${Server.defaultAddress}]`, Server.defaultAddress)
      .option('-p, --port <port>', `port that the reverse proxy should run on [${Server.defaultPort}]`, format.asInteger, Server.defaultPort)
      .option('-t, --target <target>', 'location of the server the proxy will target', format.asIntegerIfNumeric)
      .option('-c, --config <path>', 'location of the configuration file for the reverse proxy')
      .option('-u, --user <user>', 'user to drop privileges to once server socket is bound', format.asIntegerIfNumeric)
      .option('--silent', 'silence the log output from the reverse proxy')
      .parse(process.argv);

    if (!program.config && !program.target) program.help();

    // Start the proxy server.
    await this.init(program);
    if (!this.servers.length) throw new Error('Unable to find any configuration for the reverse proxy.');

    await this._startServers();
    if (program.user) this._setUser(program.user);
  }

  /**
   * Parses the specified configuration.
   * @param {string} data A string specifying the application configuration.
   * @return {Promise<Server[]>} The server instances corresponding to the parsed configuration.
   */
  async _parseConfig(data) {
    data = data.trim();
    if (!data.length) throw new Error('Invalid configuration data.');

    /* eslint-disable no-extra-parens */
    let config;
    let firstChar = data[0];
    let lastChar = data[data.length - 1];
    let isJson = (firstChar == '[' && lastChar == ']') || (firstChar == '{' && lastChar == '}');
    /* eslint-enable no-extra-parens */

    if (!isJson) {
      config = [];
      loadYAML(data, options => config.push(options));
    }
    else {
      config = JSON.parse(data);
      if (!Array.isArray(config)) config = [config];
    }

    if (!config.every(value => typeof value == 'object' && value)) throw new Error('Invalid configuration format.');

    const loadCert = promisify(readFile);
    for (let options of config) {
      if (!('routes' in options) && !('target' in options)) throw new Error('You must provide at least a target or a routing table.');
      if (!('address' in options)) options.address = program.address;
      if (!('port' in options)) options.port = program.port;

      if ('ssl' in options) {
        let keys = ['ca', 'cert', 'key', 'pfx'].filter(key => key in options.ssl);
        for (let key of keys) options.ssl[key] = await loadCert(options.ssl[key]);
      }
    }

    return config.map(options => new Server(options));
  }

  /**
   * Sets the user identity of the application process.
   * @param {number|string} userId The user identifier.
   */
  _setUser(userId) {
    if (typeof process.setuid != 'function')
      console.error('Changing the process user is not supported on this platform.');
    else {
      console.log(`Drop user privileges to "${userId}"`);
      process.setuid(userId);
    }
  }

  /**
   * Starts the reverse proxy instances.
   * @return {Promise} Completes when all servers have been started.
   */
  async _startServers() {
    let done = () => {};
    let logger = morgan(this.debug ? 'dev' : Application.logFormat);

    return Promise.all(this.servers.map(server => {
      server.on('close', () => console.log(`Reverse proxy instance on ${server.address}:${server.port} closed`));
      server.on('error', err => console.error(this.debug ? err : err.message));
      server.on('listening', () => console.log(`Reverse proxy instance listening on ${server.address}:${server.port}`));
      if (!program.silent) server.on('request', (request, response) => logger(request, response, done));

      return server.listen();
    }));
  }
};
