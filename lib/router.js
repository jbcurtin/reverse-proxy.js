'use strict';
const urlParse = require('url-parse');

exports.Router = class Router extends Object {
  constructor(options = {}) {
    super();
    this._routes = new Array;
    this._hosts = new Map;
    if ('routes' in options) {
        for (let [definition, route] of Object.entries(options.routes)) {
            if (definition.startsWith('re://')) {
                let expression = definition.replace('re://', '');
                let target = this._normalizeRoute(route);
                this._routes.push({
                    'test': new RegExp(expression),
                    'target': target
                })
            } else {
                this._hosts.set(host, this._normalizeRoute(route));
            }
        }
    } else if ('target' in options) {
        this._hosts.set('*', this._normalizeRoute(options.target));
    } else {
        throw Error("NotImplementedError");
    }
    debugger;
  }

  get(route) {
    for (let config in this._routes) {
        if (config['test'].test(route)) {
            return target;
        }
    }
    for (let [host, target] in Object.entries(this._hosts)) {
        if (host == route) {
            return target;
        }
    }
    throw Error("Target not found: ", path);
  }
  has(hostname) {
    debugger;
    return self._hosts.get('localhost');
  }
  _normalizeRoute(route) {
    if (typeof route != 'object' || !route) {
        route = {
            route: route,
            host: 'localhost',
            scheme: 'http'
        }
        if (typeof route.uri == 'number') {
            route.host = [route.host, route.route].join(':');
            route.route = '/';
            debugger;
        } else if (typeof route.uri == 'string') {
            if (route.route.startswith('https')) {
                route.scheme = 'https';
                let urlParts = urlParse(route.route);
                debugger;
                //route.route:q
            } else {
                console.log('pass');
            }
        }
    }

    //switch (typeof route.uri) {
    //  case 'number':
    //    route.uri = `http://127.0.0.1:${route.uri}`;
    //    break;

    //  case 'string':
    //    if (!/^https?:/i.test(route.uri)) route.uri = `http://${route.uri}`;
    //    break;

    //  default:
    //    throw new Error('The route has an invalid format.');
    //}

    //if (typeof route.headers != 'object' || !route.headers) route.headers = {};
    //else {
    //  let map = {};
    //  for (let [key, value] of Object.entries(route.headers)) map[key.toLowerCase()] = value;
    //  route.headers = map;
    //}

    //return route;
  }
};

