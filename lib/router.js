'use strict';
const urlParse = require('url-parse');

exports.Router = class Router extends Object {
  constructor(options = {}) {
    super();
    this._routes = new Array;
    this._hosts = new Map;
    if ('routes' in options) {
      for (let [idx, route] of Object.entries(options.routes)) {
        route = this._normalizeRoute(route);
        this._routes.push({
          'test': new RegExp(route.expression),
          'route': route,
        })
      }
    } else {
        throw Error("'routes' not found in configuration");
    }
  }
  get(route) {
    let idx = 0;
    let config = null;
    for (idx; idx < this._routes.length; idx++) {
      config = this._routes[idx];
      if (config['test'].test(route)) {
        return config.route;
      }
    }
    throw Error("'route:" + route + "' not found");
  }
  _polyfill(route, defaults) {
    if (typeof route === 'string') {
      route = {
        path: route
      }
    }
    for (let [key, value] of Object.entries(defaults)) {
      if (!Object.prototype.hasOwnProperty.call(route, key)) {
        route[key] = value;
      }
    }
    return route
  }
  _normalizeRoute(route) {
    route = this._polyfill(route, {
      expression: route,
      path: route,
      hostname: 'localhost',
      port: 80,
      scheme: 'http',
      host: null,
    })
    if (typeof route.path === 'string') {
      if (route.path.startsWith('http')) {
        var urlParts = urlParse(route.path);
        route.scheme = urlParts.protocol.substring(0, urlParts.protocol.length - 1);
        route.path = urlParts.pathname;
        route.hostname = urlParts.hostname;
        if (urlParts.port != '') {
          route.port = parseInt(urlParts.port);
        }
      } else {
        throw Error("Protocol Not Implemented");
      }
    } else if (typeof route.path === 'number') {
      route.port = route.path;
      route.path = '/';
    } else if (typeof route.path === 'object') {
      route.path = '/';
    } else {
      throw new Error('Awesome');
    }
    if (route.port != 80) {
      route.host = [route.hostname, route.port].join(':');
    } else {
      route.host = route.hostname;
    }
    if (route.expression.startsWith('re://')) {
      route.expression = route.expression.substring(5);
    } else {
      route.expression = [route.scheme, '://', route.host, route.path].join('');
    }
    return route;
  }
};

