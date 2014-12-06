(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/evan/Personal/vue-hackernews/node_modules/director/build/director.js":[function(require,module,exports){


//
// Generated on Sat Dec 06 2014 16:08:09 GMT-0500 (EST) by Charlie Robbins, Paolo Fragomeni & the Contributors (Using Codesurgeon).
// Version 1.2.4
//

(function (exports) {

/*
 * browser.js: Browser specific functionality for director.
 *
 * (C) 2011, Charlie Robbins, Paolo Fragomeni, & the Contributors.
 * MIT LICENSE
 *
 */

var dloc = document.location;

function dlocHashEmpty() {
  // Non-IE browsers return '' when the address bar shows '#'; Director's logic
  // assumes both mean empty.
  return dloc.hash === '' || dloc.hash === '#';
}

var listener = {
  mode: 'modern',
  hash: dloc.hash,
  history: false,

  check: function () {
    var h = dloc.hash;
    if (h != this.hash) {
      this.hash = h;
      this.onHashChanged();
    }
  },

  fire: function () {
    if (this.mode === 'modern') {
      this.history === true ? window.onpopstate() : window.onhashchange();
    }
    else {
      this.onHashChanged();
    }
  },

  init: function (fn, history) {
    var self = this;
    this.history = history;

    if (!Router.listeners) {
      Router.listeners = [];
    }

    function onchange(onChangeEvent) {
      for (var i = 0, l = Router.listeners.length; i < l; i++) {
        Router.listeners[i](onChangeEvent);
      }
    }

    //note IE8 is being counted as 'modern' because it has the hashchange event
    if ('onhashchange' in window && (document.documentMode === undefined
      || document.documentMode > 7)) {
      // At least for now HTML5 history is available for 'modern' browsers only
      if (this.history === true) {
        // There is an old bug in Chrome that causes onpopstate to fire even
        // upon initial page load. Since the handler is run manually in init(),
        // this would cause Chrome to run it twise. Currently the only
        // workaround seems to be to set the handler after the initial page load
        // http://code.google.com/p/chromium/issues/detail?id=63040
        setTimeout(function() {
          window.onpopstate = onchange;
        }, 500);
      }
      else {
        window.onhashchange = onchange;
      }
      this.mode = 'modern';
    }
    else {
      //
      // IE support, based on a concept by Erik Arvidson ...
      //
      var frame = document.createElement('iframe');
      frame.id = 'state-frame';
      frame.style.display = 'none';
      document.body.appendChild(frame);
      this.writeFrame('');

      if ('onpropertychange' in document && 'attachEvent' in document) {
        document.attachEvent('onpropertychange', function () {
          if (event.propertyName === 'location') {
            self.check();
          }
        });
      }

      window.setInterval(function () { self.check(); }, 50);

      this.onHashChanged = onchange;
      this.mode = 'legacy';
    }

    Router.listeners.push(fn);

    return this.mode;
  },

  destroy: function (fn) {
    if (!Router || !Router.listeners) {
      return;
    }

    var listeners = Router.listeners;

    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  },

  setHash: function (s) {
    // Mozilla always adds an entry to the history
    if (this.mode === 'legacy') {
      this.writeFrame(s);
    }

    if (this.history === true) {
      window.history.pushState({}, document.title, s);
      // Fire an onpopstate event manually since pushing does not obviously
      // trigger the pop event.
      this.fire();
    } else {
      dloc.hash = (s[0] === '/') ? s : '/' + s;
    }
    return this;
  },

  writeFrame: function (s) {
    // IE support...
    var f = document.getElementById('state-frame');
    var d = f.contentDocument || f.contentWindow.document;
    d.open();
    d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
    d.close();
  },

  syncHash: function () {
    // IE support...
    var s = this._hash;
    if (s != dloc.hash) {
      dloc.hash = s;
    }
    return this;
  },

  onHashChanged: function () {}
};

var Router = exports.Router = function (routes) {
  if (!(this instanceof Router)) return new Router(routes);

  this.params   = {};
  this.routes   = {};
  this.methods  = ['on', 'once', 'after', 'before'];
  this.scope    = [];
  this._methods = {};

  this._insert = this.insert;
  this.insert = this.insertEx;

  this.historySupport = (window.history != null ? window.history.pushState : null) != null

  this.configure();
  this.mount(routes || {});
};

Router.prototype.init = function (r) {
  var self = this
    , routeTo;
  this.handler = function(onChangeEvent) {
    var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
    var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
    self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
  };

  listener.init(this.handler, this.history);

  if (this.history === false) {
    if (dlocHashEmpty() && r) {
      dloc.hash = r;
    } else if (!dlocHashEmpty()) {
      self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
    }
  }
  else {
    if (this.convert_hash_in_init) {
      // Use hash as route
      routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
      if (routeTo) {
        window.history.replaceState({}, document.title, routeTo);
      }
    }
    else {
      // Use canonical url
      routeTo = this.getPath();
    }

    // Router has been initialized, but due to the chrome bug it will not
    // yet actually route HTML5 history state changes. Thus, decide if should route.
    if (routeTo || this.run_in_init === true) {
      this.handler();
    }
  }

  return this;
};

Router.prototype.explode = function () {
  var v = this.history === true ? this.getPath() : dloc.hash;
  if (v.charAt(1) === '/') { v=v.slice(1) }
  return v.slice(1, v.length).split("/");
};

Router.prototype.setRoute = function (i, v, val) {
  var url = this.explode();

  if (typeof i === 'number' && typeof v === 'string') {
    url[i] = v;
  }
  else if (typeof val === 'string') {
    url.splice(i, v, s);
  }
  else {
    url = [i];
  }

  listener.setHash(url.join('/'));
  return url;
};

//
// ### function insertEx(method, path, route, parent)
// #### @method {string} Method to insert the specific `route`.
// #### @path {Array} Parsed path to insert the `route` at.
// #### @route {Array|function} Route handlers to insert.
// #### @parent {Object} **Optional** Parent "routes" to insert into.
// insert a callback that will only occur once per the matched route.
//
Router.prototype.insertEx = function(method, path, route, parent) {
  if (method === "once") {
    method = "on";
    route = function(route) {
      var once = false;
      return function() {
        if (once) return;
        once = true;
        return route.apply(this, arguments);
      };
    }(route);
  }
  return this._insert(method, path, route, parent);
};

Router.prototype.getRoute = function (v) {
  var ret = v;

  if (typeof v === "number") {
    ret = this.explode()[v];
  }
  else if (typeof v === "string"){
    var h = this.explode();
    ret = h.indexOf(v);
  }
  else {
    ret = this.explode();
  }

  return ret;
};

Router.prototype.destroy = function () {
  listener.destroy(this.handler);
  return this;
};

Router.prototype.getPath = function () {
  var path = window.location.pathname;
  if (path.substr(0, 1) !== '/') {
    path = '/' + path;
  }
  return path;
};
function _every(arr, iterator) {
  for (var i = 0; i < arr.length; i += 1) {
    if (iterator(arr[i], i, arr) === false) {
      return;
    }
  }
}

function _flatten(arr) {
  var flat = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    flat = flat.concat(arr[i]);
  }
  return flat;
}

function _asyncEverySeries(arr, iterator, callback) {
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  (function iterate() {
    iterator(arr[completed], function(err) {
      if (err || err === false) {
        callback(err);
        callback = function() {};
      } else {
        completed += 1;
        if (completed === arr.length) {
          callback();
        } else {
          iterate();
        }
      }
    });
  })();
}

function paramifyString(str, params, mod) {
  mod = str;
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      mod = params[param](str);
      if (mod !== str) {
        break;
      }
    }
  }
  return mod === str ? "([._a-zA-Z0-9-]+)" : mod;
}

function regifyString(str, params) {
  var matches, last = 0, out = "";
  while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
    last = matches.index + matches[0].length;
    matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
    out += str.substr(0, matches.index) + matches[0];
  }
  str = out += str.substr(last);
  var captures = str.match(/:([^\/]+)/ig), capture, length;
  if (captures) {
    length = captures.length;
    for (var i = 0; i < length; i++) {
      capture = captures[i];
      if (capture.slice(0, 2) === "::") {
        str = capture.slice(1);
      } else {
        str = str.replace(capture, paramifyString(capture, params));
      }
    }
  }
  return str;
}

function terminator(routes, delimiter, start, stop) {
  var last = 0, left = 0, right = 0, start = (start || "(").toString(), stop = (stop || ")").toString(), i;
  for (i = 0; i < routes.length; i++) {
    var chunk = routes[i];
    if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
      left = chunk.indexOf(start, last);
      right = chunk.indexOf(stop, last);
      if (~left && !~right || !~left && ~right) {
        var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
        routes = [ tmp ].concat(routes.slice((i || 1) + 1));
      }
      last = (right > left ? right : left) + 1;
      i = 0;
    } else {
      last = 0;
    }
  }
  return routes;
}

var QUERY_SEPARATOR = /\?.*/;

Router.prototype.configure = function(options) {
  options = options || {};
  for (var i = 0; i < this.methods.length; i++) {
    this._methods[this.methods[i]] = true;
  }
  this.recurse = options.recurse || this.recurse || false;
  this.async = options.async || false;
  this.delimiter = options.delimiter || "/";
  this.strict = typeof options.strict === "undefined" ? true : options.strict;
  this.notfound = options.notfound;
  this.resource = options.resource;
  this.history = options.html5history && this.historySupport || false;
  this.run_in_init = this.history === true && options.run_handler_in_init !== false;
  this.convert_hash_in_init = this.history === true && options.convert_hash_in_init !== false;
  this.every = {
    after: options.after || null,
    before: options.before || null,
    on: options.on || null
  };
  return this;
};

Router.prototype.param = function(token, matcher) {
  if (token[0] !== ":") {
    token = ":" + token;
  }
  var compiled = new RegExp(token, "g");
  this.params[token] = function(str) {
    return str.replace(compiled, matcher.source || matcher);
  };
  return this;
};

Router.prototype.on = Router.prototype.route = function(method, path, route) {
  var self = this;
  if (!route && typeof path == "function") {
    route = path;
    path = method;
    method = "on";
  }
  if (Array.isArray(path)) {
    return path.forEach(function(p) {
      self.on(method, p, route);
    });
  }
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  if (Array.isArray(method)) {
    return method.forEach(function(m) {
      self.on(m.toLowerCase(), path, route);
    });
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.insert(method, this.scope.concat(path), route);
};

Router.prototype.path = function(path, routesFn) {
  var self = this, length = this.scope.length;
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.scope = this.scope.concat(path);
  routesFn.call(this, this);
  this.scope.splice(length, path.length);
};

Router.prototype.dispatch = function(method, path, callback) {
  var self = this, fns = this.traverse(method, path.replace(QUERY_SEPARATOR, ""), this.routes, ""), invoked = this._invoked, after;
  this._invoked = true;
  if (!fns || fns.length === 0) {
    this.last = [];
    if (typeof this.notfound === "function") {
      this.invoke([ this.notfound ], {
        method: method,
        path: path
      }, callback);
    }
    return false;
  }
  if (this.recurse === "forward") {
    fns = fns.reverse();
  }
  function updateAndInvoke() {
    self.last = fns.after;
    self.invoke(self.runlist(fns), self, callback);
  }
  after = this.every && this.every.after ? [ this.every.after ].concat(this.last) : [ this.last ];
  if (after && after.length > 0 && invoked) {
    if (this.async) {
      this.invoke(after, this, updateAndInvoke);
    } else {
      this.invoke(after, this);
      updateAndInvoke();
    }
    return true;
  }
  updateAndInvoke();
  return true;
};

Router.prototype.invoke = function(fns, thisArg, callback) {
  var self = this;
  var apply;
  if (this.async) {
    apply = function(fn, next) {
      if (Array.isArray(fn)) {
        return _asyncEverySeries(fn, apply, next);
      } else if (typeof fn == "function") {
        fn.apply(thisArg, (fns.captures || []).concat(next));
      }
    };
    _asyncEverySeries(fns, apply, function() {
      if (callback) {
        callback.apply(thisArg, arguments);
      }
    });
  } else {
    apply = function(fn) {
      if (Array.isArray(fn)) {
        return _every(fn, apply);
      } else if (typeof fn === "function") {
        return fn.apply(thisArg, fns.captures || []);
      } else if (typeof fn === "string" && self.resource) {
        self.resource[fn].apply(thisArg, fns.captures || []);
      }
    };
    _every(fns, apply);
  }
};

Router.prototype.traverse = function(method, path, routes, regexp, filter) {
  var fns = [], current, exact, match, next, that;
  function filterRoutes(routes) {
    if (!filter) {
      return routes;
    }
    function deepCopy(source) {
      var result = [];
      for (var i = 0; i < source.length; i++) {
        result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
      }
      return result;
    }
    function applyFilter(fns) {
      for (var i = fns.length - 1; i >= 0; i--) {
        if (Array.isArray(fns[i])) {
          applyFilter(fns[i]);
          if (fns[i].length === 0) {
            fns.splice(i, 1);
          }
        } else {
          if (!filter(fns[i])) {
            fns.splice(i, 1);
          }
        }
      }
    }
    var newRoutes = deepCopy(routes);
    newRoutes.matched = routes.matched;
    newRoutes.captures = routes.captures;
    newRoutes.after = routes.after.filter(filter);
    applyFilter(newRoutes);
    return newRoutes;
  }
  if (path === this.delimiter && routes[method]) {
    next = [ [ routes.before, routes[method] ].filter(Boolean) ];
    next.after = [ routes.after ].filter(Boolean);
    next.matched = true;
    next.captures = [];
    return filterRoutes(next);
  }
  for (var r in routes) {
    if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
      current = exact = regexp + this.delimiter + r;
      if (!this.strict) {
        exact += "[" + this.delimiter + "]?";
      }
      match = path.match(new RegExp("^" + exact));
      if (!match) {
        continue;
      }
      if (match[0] && match[0] == path && routes[r][method]) {
        next = [ [ routes[r].before, routes[r][method] ].filter(Boolean) ];
        next.after = [ routes[r].after ].filter(Boolean);
        next.matched = true;
        next.captures = match.slice(1);
        if (this.recurse && routes === this.routes) {
          next.push([ routes.before, routes.on ].filter(Boolean));
          next.after = next.after.concat([ routes.after ].filter(Boolean));
        }
        return filterRoutes(next);
      }
      next = this.traverse(method, path, routes[r], current);
      if (next.matched) {
        if (next.length > 0) {
          fns = fns.concat(next);
        }
        if (this.recurse) {
          fns.push([ routes[r].before, routes[r].on ].filter(Boolean));
          next.after = next.after.concat([ routes[r].after ].filter(Boolean));
          if (routes === this.routes) {
            fns.push([ routes["before"], routes["on"] ].filter(Boolean));
            next.after = next.after.concat([ routes["after"] ].filter(Boolean));
          }
        }
        fns.matched = true;
        fns.captures = next.captures;
        fns.after = next.after;
        return filterRoutes(fns);
      }
    }
  }
  return false;
};

Router.prototype.insert = function(method, path, route, parent) {
  var methodType, parentType, isArray, nested, part;
  path = path.filter(function(p) {
    return p && p.length > 0;
  });
  parent = parent || this.routes;
  part = path.shift();
  if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
    part = regifyString(part, this.params);
  }
  if (path.length > 0) {
    parent[part] = parent[part] || {};
    return this.insert(method, path, route, parent[part]);
  }
  if (!part && !path.length && parent === this.routes) {
    methodType = typeof parent[method];
    switch (methodType) {
     case "function":
      parent[method] = [ parent[method], route ];
      return;
     case "object":
      parent[method].push(route);
      return;
     case "undefined":
      parent[method] = route;
      return;
    }
    return;
  }
  parentType = typeof parent[part];
  isArray = Array.isArray(parent[part]);
  if (parent[part] && !isArray && parentType == "object") {
    methodType = typeof parent[part][method];
    switch (methodType) {
     case "function":
      parent[part][method] = [ parent[part][method], route ];
      return;
     case "object":
      parent[part][method].push(route);
      return;
     case "undefined":
      parent[part][method] = route;
      return;
    }
  } else if (parentType == "undefined") {
    nested = {};
    nested[method] = route;
    parent[part] = nested;
    return;
  }
  throw new Error("Invalid route context: " + parentType);
};



Router.prototype.extend = function(methods) {
  var self = this, len = methods.length, i;
  function extend(method) {
    self._methods[method] = true;
    self[method] = function() {
      var extra = arguments.length === 1 ? [ method, "" ] : [ method ];
      self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
    };
  }
  for (i = 0; i < len; i++) {
    extend(methods[i]);
  }
};

Router.prototype.runlist = function(fns) {
  var runlist = this.every && this.every.before ? [ this.every.before ].concat(_flatten(fns)) : _flatten(fns);
  if (this.every && this.every.on) {
    runlist.push(this.every.on);
  }
  runlist.captures = fns.captures;
  runlist.source = fns.source;
  return runlist;
};

Router.prototype.mount = function(routes, path) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    return;
  }
  var self = this;
  path = path || [];
  if (!Array.isArray(path)) {
    path = path.split(self.delimiter);
  }
  function insertOrMount(route, local) {
    var rename = route, parts = route.split(self.delimiter), routeType = typeof routes[route], isRoute = parts[0] === "" || !self._methods[parts[0]], event = isRoute ? "on" : rename;
    if (isRoute) {
      rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [ "" ])[0].length);
      parts.shift();
    }
    if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
      local = local.concat(parts);
      self.mount(routes[route], local);
      return;
    }
    if (isRoute) {
      local = local.concat(rename.split(self.delimiter));
      local = terminator(local, self.delimiter);
    }
    self.insert(event, local, routes[route]);
  }
  for (var route in routes) {
    if (routes.hasOwnProperty(route)) {
      insertOrMount(route, path.slice(0));
    }
  }
};



}(typeof exports === "object" ? exports : window));
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/firebase/lib/firebase-web.js":[function(require,module,exports){
/*! @license Firebase v1.2.0-beta.1 - License: https://www.firebase.com/terms/terms-of-service.html */ (function() {var h,aa=this;function m(a){return void 0!==a}function ba(){}function ca(a){a.Mb=function(){return a.ff?a.ff:a.ff=new a}}
function da(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ea(a){return"array"==da(a)}function fa(a){var b=da(a);return"array"==b||"object"==b&&"number"==typeof a.length}function p(a){return"string"==typeof a}function ga(a){return"number"==typeof a}function ha(a){return"function"==da(a)}function ia(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ja(a,b,c){return a.call.apply(a.bind,arguments)}
function ka(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function q(a,b,c){q=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ja:ka;return q.apply(null,arguments)}
function la(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}}var ma=Date.now||function(){return+new Date};function na(a,b){var c=a.split("."),d=aa;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)!c.length&&m(b)?d[e]=b:d=d[e]?d[e]:d[e]={}}
function oa(a,b){function c(){}c.prototype=b.prototype;a.Ne=b.prototype;a.prototype=new c;a.zg=function(a,c,f){return b.prototype[c].apply(a,Array.prototype.slice.call(arguments,2))}};function t(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function u(a,b){if(Object.prototype.hasOwnProperty.call(a,b))return a[b]}function pa(a,b){for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&b(c,a[c])}function qa(a){var b={};pa(a,function(a,d){b[a]=d});return b};function ra(a){this.sc=a;this.Dd="firebase:"}h=ra.prototype;h.set=function(a,b){null==b?this.sc.removeItem(this.Dd+a):this.sc.setItem(this.Dd+a,v(b))};h.get=function(a){a=this.sc.getItem(this.Dd+a);return null==a?null:sa(a)};h.remove=function(a){this.sc.removeItem(this.Dd+a)};h.gf=!1;h.toString=function(){return this.sc.toString()};function ta(){this.la={}}ta.prototype.set=function(a,b){null==b?delete this.la[a]:this.la[a]=b};ta.prototype.get=function(a){return t(this.la,a)?this.la[a]:null};ta.prototype.remove=function(a){delete this.la[a]};ta.prototype.gf=!0;function ua(a){try{if("undefined"!==typeof window&&"undefined"!==typeof window[a]){var b=window[a];b.setItem("firebase:sentinel","cache");b.removeItem("firebase:sentinel");return new ra(b)}}catch(c){}return new ta}var va=ua("localStorage"),wa=ua("sessionStorage");function xa(a,b,c,d,e){this.host=a.toLowerCase();this.domain=this.host.substr(this.host.indexOf(".")+1);this.Cb=b;this.zb=c;this.xg=d;this.Cd=e||"";this.Ma=va.get("host:"+a)||this.host}function ya(a,b){b!==a.Ma&&(a.Ma=b,"s-"===a.Ma.substr(0,2)&&va.set("host:"+a.host,a.Ma))}xa.prototype.toString=function(){var a=(this.Cb?"https://":"http://")+this.host;this.Cd&&(a+="<"+this.Cd+">");return a};function za(){this.Sa=-1};function Aa(){this.Sa=-1;this.Sa=64;this.T=[];this.Zd=[];this.Af=[];this.zd=[];this.zd[0]=128;for(var a=1;a<this.Sa;++a)this.zd[a]=0;this.Pd=this.Pb=0;this.reset()}oa(Aa,za);Aa.prototype.reset=function(){this.T[0]=1732584193;this.T[1]=4023233417;this.T[2]=2562383102;this.T[3]=271733878;this.T[4]=3285377520;this.Pd=this.Pb=0};
function Ba(a,b,c){c||(c=0);var d=a.Af;if(p(b))for(var e=0;16>e;e++)d[e]=b.charCodeAt(c)<<24|b.charCodeAt(c+1)<<16|b.charCodeAt(c+2)<<8|b.charCodeAt(c+3),c+=4;else for(e=0;16>e;e++)d[e]=b[c]<<24|b[c+1]<<16|b[c+2]<<8|b[c+3],c+=4;for(e=16;80>e;e++){var f=d[e-3]^d[e-8]^d[e-14]^d[e-16];d[e]=(f<<1|f>>>31)&4294967295}b=a.T[0];c=a.T[1];for(var g=a.T[2],k=a.T[3],l=a.T[4],n,e=0;80>e;e++)40>e?20>e?(f=k^c&(g^k),n=1518500249):(f=c^g^k,n=1859775393):60>e?(f=c&g|k&(c|g),n=2400959708):(f=c^g^k,n=3395469782),f=(b<<
5|b>>>27)+f+l+n+d[e]&4294967295,l=k,k=g,g=(c<<30|c>>>2)&4294967295,c=b,b=f;a.T[0]=a.T[0]+b&4294967295;a.T[1]=a.T[1]+c&4294967295;a.T[2]=a.T[2]+g&4294967295;a.T[3]=a.T[3]+k&4294967295;a.T[4]=a.T[4]+l&4294967295}
Aa.prototype.update=function(a,b){m(b)||(b=a.length);for(var c=b-this.Sa,d=0,e=this.Zd,f=this.Pb;d<b;){if(0==f)for(;d<=c;)Ba(this,a,d),d+=this.Sa;if(p(a))for(;d<b;){if(e[f]=a.charCodeAt(d),++f,++d,f==this.Sa){Ba(this,e);f=0;break}}else for(;d<b;)if(e[f]=a[d],++f,++d,f==this.Sa){Ba(this,e);f=0;break}}this.Pb=f;this.Pd+=b};function Ca(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);}function Da(){this.Ed=void 0}
function Ea(a,b,c){switch(typeof b){case "string":Fa(b,c);break;case "number":c.push(isFinite(b)&&!isNaN(b)?b:"null");break;case "boolean":c.push(b);break;case "undefined":c.push("null");break;case "object":if(null==b){c.push("null");break}if(ea(b)){var d=b.length;c.push("[");for(var e="",f=0;f<d;f++)c.push(e),e=b[f],Ea(a,a.Ed?a.Ed.call(b,String(f),e):e,c),e=",";c.push("]");break}c.push("{");d="";for(f in b)Object.prototype.hasOwnProperty.call(b,f)&&(e=b[f],"function"!=typeof e&&(c.push(d),Fa(f,c),
c.push(":"),Ea(a,a.Ed?a.Ed.call(b,f,e):e,c),d=","));c.push("}");break;case "function":break;default:throw Error("Unknown type: "+typeof b);}}var Ga={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"},Ha=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
function Fa(a,b){b.push('"',a.replace(Ha,function(a){if(a in Ga)return Ga[a];var b=a.charCodeAt(0),e="\\u";16>b?e+="000":256>b?e+="00":4096>b&&(e+="0");return Ga[a]=e+b.toString(16)}),'"')};function sa(a){return"undefined"!==typeof JSON&&m(JSON.parse)?JSON.parse(a):Ca(a)}function v(a){if("undefined"!==typeof JSON&&m(JSON.stringify))a=JSON.stringify(a);else{var b=[];Ea(new Da,a,b);a=b.join("")}return a};function Ia(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^ma()).toString(36)};var w=Array.prototype,Ja=w.indexOf?function(a,b,c){return w.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(p(a))return p(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},Ka=w.forEach?function(a,b,c){w.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=p(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},La=w.filter?function(a,b,c){return w.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=p(a)?
a.split(""):a,k=0;k<d;k++)if(k in g){var l=g[k];b.call(c,l,k,a)&&(e[f++]=l)}return e},Ma=w.map?function(a,b,c){return w.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=p(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e},Na=w.reduce?function(a,b,c,d){d&&(b=q(b,d));return w.reduce.call(a,b,c)}:function(a,b,c,d){var e=c;Ka(a,function(c,g){e=b.call(d,e,c,g,a)});return e},Oa=w.every?function(a,b,c){return w.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=
p(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};function Pa(a,b){var c=Qa(a,b,void 0);return 0>c?null:p(a)?a.charAt(c):a[c]}function Qa(a,b,c){for(var d=a.length,e=p(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1}function Ra(a,b){var c=Ja(a,b);0<=c&&w.splice.call(a,c,1)}function Sa(a,b,c,d){return w.splice.apply(a,Ta(arguments,1))}function Ta(a,b,c){return 2>=arguments.length?w.slice.call(a,b):w.slice.call(a,b,c)}
function Ua(a,b){a.sort(b||Va)}function Va(a,b){return a>b?1:a<b?-1:0};var Wa;a:{var Xa=aa.navigator;if(Xa){var Ya=Xa.userAgent;if(Ya){Wa=Ya;break a}}Wa=""}function Za(a){return-1!=Wa.indexOf(a)};var $a=Za("Opera")||Za("OPR"),ab=Za("Trident")||Za("MSIE"),bb=Za("Gecko")&&-1==Wa.toLowerCase().indexOf("webkit")&&!(Za("Trident")||Za("MSIE")),cb=-1!=Wa.toLowerCase().indexOf("webkit");(function(){var a="",b;if($a&&aa.opera)return a=aa.opera.version,ha(a)?a():a;bb?b=/rv\:([^\);]+)(\)|;)/:ab?b=/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/:cb&&(b=/WebKit\/(\S+)/);b&&(a=(a=b.exec(Wa))?a[1]:"");return ab&&(b=(b=aa.document)?b.documentMode:void 0,b>parseFloat(a))?String(b):a})();var db=null,eb=null;
function gb(a,b){if(!fa(a))throw Error("encodeByteArray takes an array as a parameter");if(!db){db={};eb={};for(var c=0;65>c;c++)db[c]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(c),eb[c]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(c)}for(var c=b?eb:db,d=[],e=0;e<a.length;e+=3){var f=a[e],g=e+1<a.length,k=g?a[e+1]:0,l=e+2<a.length,n=l?a[e+2]:0,r=f>>2,f=(f&3)<<4|k>>4,k=(k&15)<<2|n>>6,n=n&63;l||(n=64,g||(k=64));d.push(c[r],c[f],c[k],c[n])}return d.join("")}
;var hb=function(){var a=1;return function(){return a++}}();function x(a,b){if(!a)throw ib(b);}function ib(a){return Error("Firebase INTERNAL ASSERT FAILED:"+a)}function jb(a){try{if("undefined"!==typeof atob)return atob(a)}catch(b){kb("base64DecodeIfNativeSupport failed: ",b)}return null}
function lb(a){var b=mb(a);a=new Aa;a.update(b);var b=[],c=8*a.Pd;56>a.Pb?a.update(a.zd,56-a.Pb):a.update(a.zd,a.Sa-(a.Pb-56));for(var d=a.Sa-1;56<=d;d--)a.Zd[d]=c&255,c/=256;Ba(a,a.Zd);for(d=c=0;5>d;d++)for(var e=24;0<=e;e-=8)b[c]=a.T[d]>>e&255,++c;return gb(b)}function nb(a){for(var b="",c=0;c<arguments.length;c++)b=fa(arguments[c])?b+nb.apply(null,arguments[c]):"object"===typeof arguments[c]?b+v(arguments[c]):b+arguments[c],b+=" ";return b}var ob=null,pb=!0;
function kb(a){!0===pb&&(pb=!1,null===ob&&!0===wa.get("logging_enabled")&&qb(!0));if(ob){var b=nb.apply(null,arguments);ob(b)}}function rb(a){return function(){kb(a,arguments)}}function sb(a){if("undefined"!==typeof console){var b="FIREBASE INTERNAL ERROR: "+nb.apply(null,arguments);"undefined"!==typeof console.error?console.error(b):console.log(b)}}function tb(a){var b=nb.apply(null,arguments);throw Error("FIREBASE FATAL ERROR: "+b);}
function z(a){if("undefined"!==typeof console){var b="FIREBASE WARNING: "+nb.apply(null,arguments);"undefined"!==typeof console.warn?console.warn(b):console.log(b)}}
function ub(a){var b="",c="",d="",e=!0,f="https",g="";if(p(a)){var k=a.indexOf("//");0<=k&&(f=a.substring(0,k-1),a=a.substring(k+2));k=a.indexOf("/");-1===k&&(k=a.length);b=a.substring(0,k);a=a.substring(k+1);var l=b.split(".");if(3===l.length){k=l[2].indexOf(":");e=0<=k?"https"===f||"wss"===f:!0;c=l[1];d=l[0];g="";a=("/"+a).split("/");for(k=0;k<a.length;k++)if(0<a[k].length){l=a[k];try{l=decodeURIComponent(l.replace(/\+/g," "))}catch(n){}g+="/"+l}d=d.toLowerCase()}else 2===l.length&&(c=l[0])}return{host:b,
domain:c,ug:d,Cb:e,scheme:f,Kc:g}}function vb(a){return ga(a)&&(a!=a||a==Number.POSITIVE_INFINITY||a==Number.NEGATIVE_INFINITY)}
function wb(a){if("complete"===document.readyState)a();else{var b=!1,c=function(){document.body?b||(b=!0,a()):setTimeout(c,Math.floor(10))};document.addEventListener?(document.addEventListener("DOMContentLoaded",c,!1),window.addEventListener("load",c,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",function(){"complete"===document.readyState&&c()}),window.attachEvent("onload",c))}}
function xb(a,b){if(a===b)return 0;if("[MIN_NAME]"===a||"[MAX_NAME]"===b)return-1;if("[MIN_NAME]"===b||"[MAX_NAME]"===a)return 1;var c=yb(a),d=yb(b);return null!==c?null!==d?0==c-d?a.length-b.length:c-d:-1:null!==d?1:a<b?-1:1}function zb(a,b){if(b&&a in b)return b[a];throw Error("Missing required key ("+a+") in object: "+v(b));}
function Ab(a){if("object"!==typeof a||null===a)return v(a);var b=[],c;for(c in a)b.push(c);b.sort();c="{";for(var d=0;d<b.length;d++)0!==d&&(c+=","),c+=v(b[d]),c+=":",c+=Ab(a[b[d]]);return c+"}"}function Bb(a,b){if(a.length<=b)return[a];for(var c=[],d=0;d<a.length;d+=b)d+b>a?c.push(a.substring(d,a.length)):c.push(a.substring(d,d+b));return c}function Cb(a,b){if(ea(a))for(var c=0;c<a.length;++c)b(c,a[c]);else A(a,b)}
function Db(a){x(!vb(a),"Invalid JSON number");var b,c,d,e;0===a?(d=c=0,b=-Infinity===1/a?1:0):(b=0>a,a=Math.abs(a),a>=Math.pow(2,-1022)?(d=Math.min(Math.floor(Math.log(a)/Math.LN2),1023),c=d+1023,d=Math.round(a*Math.pow(2,52-d)-Math.pow(2,52))):(c=0,d=Math.round(a/Math.pow(2,-1074))));e=[];for(a=52;a;a-=1)e.push(d%2?1:0),d=Math.floor(d/2);for(a=11;a;a-=1)e.push(c%2?1:0),c=Math.floor(c/2);e.push(b?1:0);e.reverse();b=e.join("");c="";for(a=0;64>a;a+=8)d=parseInt(b.substr(a,8),2).toString(16),1===d.length&&
(d="0"+d),c+=d;return c.toLowerCase()}var Eb=/^-?\d{1,10}$/;function yb(a){return Eb.test(a)&&(a=Number(a),-2147483648<=a&&2147483647>=a)?a:null}function Fb(a){try{a()}catch(b){setTimeout(function(){throw b;},Math.floor(0))}}function B(a,b){if(ha(a)){var c=Array.prototype.slice.call(arguments,1).slice();Fb(function(){a.apply(null,c)})}};function Gb(a,b){return xb(a.name,b.name)}function Hb(a,b){return xb(a,b)};function Ib(){}var Jb=Object.create(null);function Kb(a){return a.compare.bind(a)}Ib.prototype.ef=function(a,b){return 0!==this.compare(new C("[MIN_NAME]",a),new C("[MIN_NAME]",b))};Ib.prototype.ye=function(){return Lb};function Mb(a){this.Rb=a}oa(Mb,Ib);h=Mb.prototype;h.qe=function(a){return!a.I(this.Rb).e()};h.compare=function(a,b){var c=a.L.I(this.Rb),d=b.L.I(this.Rb),c=c.fe(d);return 0===c?xb(a.name,b.name):c};h.we=function(a,b){var c=D(a),c=E.w(this.Rb,c);return new C(b,c)};
h.xe=function(){var a=E.w(this.Rb,Nb);return new C("[MAX_NAME]",a)};h.toString=function(){return this.Rb};var F=new Mb(".priority");function Ob(){}oa(Ob,Ib);h=Ob.prototype;h.compare=function(a,b){return xb(a.name,b.name)};h.qe=function(){throw ib("KeyIndex.isDefinedOn not expected to be called.");};h.ef=function(){return!1};h.ye=function(){return Lb};h.xe=function(){return new C("[MAX_NAME]",E)};h.we=function(a){x(p(a),"KeyIndex indexValue must always be a string.");return new C(a,E)};
h.toString=function(){return".key"};var Pb=new Ob;function Qb(){this.tc=this.Ja=this.hc=this.wa=this.sa=!1;this.yb=0;this.Yc="";this.wc=null;this.Tb="";this.vc=null;this.Qb="";this.G=F}var Rb=new Qb;function Sb(a){x(a.wa,"Only valid if start has been set");return a.wc}function Tb(a){x(a.Ja,"Only valid if end has been set");return a.vc}function Ub(a){return a.sa&&""!==a.Yc}function Vb(a){x(a.sa,"Only valid if limit has been set");return a.yb}
function Wb(a){var b=new Qb;b.sa=a.sa;b.yb=a.yb;b.wa=a.wa;b.wc=a.wc;b.hc=a.hc;b.Tb=a.Tb;b.Ja=a.Ja;b.vc=a.vc;b.tc=a.tc;b.Qb=a.Qb;b.G=a.G;return b}h=Qb.prototype;h.te=function(a){var b=Wb(this);b.sa=!0;b.yb=a;b.Yc="";return b};h.ue=function(a){var b=Wb(this);b.sa=!0;b.yb=a;b.Yc="l";return b};h.ve=function(a){var b=Wb(this);b.sa=!0;b.yb=a;b.Yc="r";return b};h.Id=function(a,b){var c=Wb(this);c.wa=!0;c.wc=a;null!=b?(c.hc=!0,c.Tb=b):(c.hc=!1,c.Tb="");return c};
h.fd=function(a,b){var c=Wb(this);c.Ja=!0;c.vc=a;m(b)?(c.tc=!0,c.Qb=b):(c.Dg=!1,c.Qb="");return c};h.Hc=function(a){var b=Wb(this);b.G=a;return b};function Xb(a){return!(a.wa||a.Ja||a.sa)};function mb(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);55296<=e&&56319>=e&&(e-=55296,d++,x(d<a.length,"Surrogate pair missing trail surrogate."),e=65536+(e<<10)+(a.charCodeAt(d)-56320));128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(65536>e?b[c++]=e>>12|224:(b[c++]=e>>18|240,b[c++]=e>>12&63|128),b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b};function G(a,b,c,d){var e;d<b?e="at least "+b:d>c&&(e=0===c?"none":"no more than "+c);if(e)throw Error(a+" failed: Was called with "+d+(1===d?" argument.":" arguments.")+" Expects "+e+".");}function H(a,b,c){var d="";switch(b){case 1:d=c?"first":"First";break;case 2:d=c?"second":"Second";break;case 3:d=c?"third":"Third";break;case 4:d=c?"fourth":"Fourth";break;default:throw Error("errorPrefix called with argumentNumber > 4.  Need to update it?");}return a=a+" failed: "+(d+" argument ")}
function I(a,b,c,d){if((!d||m(c))&&!ha(c))throw Error(H(a,b,d)+"must be a valid function.");}function Yb(a,b,c){if(m(c)&&(!ia(c)||null===c))throw Error(H(a,b,!0)+"must be a valid context object.");};var Zb=/[\[\].#$\/\u0000-\u001F\u007F]/,$b=/[\[\].#$\u0000-\u001F\u007F]/;function ac(a){return p(a)&&0!==a.length&&!Zb.test(a)}function bc(a,b,c){c&&!m(b)||cc(H(a,1,c),b)}
function cc(a,b,c,d){c||(c=0);d=d||[];if(!m(b))throw Error(a+"contains undefined"+dc(d));if(ha(b))throw Error(a+"contains a function"+dc(d)+" with contents: "+b.toString());if(vb(b))throw Error(a+"contains "+b.toString()+dc(d));if(1E3<c)throw new TypeError(a+"contains a cyclic object value ("+d.slice(0,100).join(".")+"...)");if(p(b)&&b.length>10485760/3&&10485760<mb(b).length)throw Error(a+"contains a string greater than 10485760 utf8 bytes"+dc(d)+" ('"+b.substring(0,50)+"...')");if(ia(b))for(var e in b)if(t(b,
e)){var f=b[e];if(".priority"!==e&&".value"!==e&&".sv"!==e&&!ac(e))throw Error(a+" contains an invalid key ("+e+")"+dc(d)+'.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');d.push(e);cc(a,f,c+1,d);d.pop()}}function dc(a){return 0==a.length?"":" in property '"+a.join(".")+"'"}function ec(a,b){if(!ia(b)||ea(b))throw Error(H(a,1,!1)+" must be an Object containing the children to replace.");bc(a,b,!1)}
function fc(a,b,c,d){if(!d||m(c)){if(vb(c))throw Error(H(a,b,d)+"is "+c.toString()+", but must be a valid Firebase priority (a string, finite number, or null).");if(!(null===c||ga(c)||p(c)||ia(c)&&t(c,".sv")))throw Error(H(a,b,d)+"must be a valid Firebase priority (a string, finite number, or null).");}}
function gc(a,b,c){if(!c||m(b))switch(b){case "value":case "child_added":case "child_removed":case "child_changed":case "child_moved":break;default:throw Error(H(a,1,c)+'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');}}function hc(a,b,c,d){if((!d||m(c))&&!ac(c))throw Error(H(a,b,d)+'was an invalid key: "'+c+'".  Firebase keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]").');}
function ic(a,b){if(!p(b)||0===b.length||$b.test(b))throw Error(H(a,1,!1)+'was an invalid path: "'+b+'". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"');}function jc(a,b){if(".info"===J(b))throw Error(a+" failed: Can't modify data under /.info/");}function kc(a,b){if(!p(b))throw Error(H(a,1,!1)+"must be a valid credential (a string).");}function lc(a,b,c){if(!p(c))throw Error(H(a,b,!1)+"must be a valid string.");}
function mc(a,b,c,d){if(!d||m(c))if(!ia(c)||null===c)throw Error(H(a,b,d)+"must be a valid object.");}function nc(a,b,c){if(!ia(b)||null===b||!t(b,c))throw Error(H(a,1,!1)+'must contain the key "'+c+'"');if(!p(u(b,c)))throw Error(H(a,1,!1)+'must contain the key "'+c+'" with type "string"');};function oc(a,b,c,d){this.je=b;this.Hd=c;this.Mc=d;this.hd=a}oc.prototype.Nb=function(){var a=this.Hd.bc();return"value"===this.hd?a.path:a.parent().path};oc.prototype.me=function(){return this.hd};oc.prototype.Lb=function(){return this.je.Lb(this)};oc.prototype.toString=function(){return this.Nb().toString()+":"+this.hd+":"+v(this.Hd.Ze())};function pc(a,b,c){this.je=a;this.error=b;this.path=c}pc.prototype.Nb=function(){return this.path};pc.prototype.me=function(){return"cancel"};
pc.prototype.Lb=function(){return this.je.Lb(this)};pc.prototype.toString=function(){return this.path.toString()+":cancel"};function qc(a,b,c){this.Gb=a;this.nb=b;this.pc=c||null}h=qc.prototype;h.qf=function(a){return"value"===a};h.createEvent=function(a,b){var c=b.C.G;return new oc("value",this,new K(a.Va,b.bc(),c))};h.Lb=function(a){var b=this.pc;if("cancel"===a.me()){x(this.nb,"Raising a cancel event on a listener with no cancel callback");var c=this.nb;return function(){c.call(b,a.error)}}var d=this.Gb;return function(){d.call(b,a.Hd)}};h.Ue=function(a,b){return this.nb?new pc(this,a,b):null};
h.matches=function(a){return a instanceof qc&&(!a.Gb||!this.Gb||a.Gb===this.Gb)&&a.pc===this.pc};h.df=function(){return null!==this.Gb};function rc(a,b,c){this.ea=a;this.nb=b;this.pc=c}h=rc.prototype;h.qf=function(a){a="children_added"===a?"child_added":a;return("children_removed"===a?"child_removed":a)in this.ea};h.Ue=function(a,b){return this.nb?new pc(this,a,b):null};h.createEvent=function(a,b){var c=b.bc().B(a.ob);return new oc(a.type,this,new K(a.Va,c,b.C.G),a.Mc)};
h.Lb=function(a){var b=this.pc;if("cancel"===a.me()){x(this.nb,"Raising a cancel event on a listener with no cancel callback");var c=this.nb;return function(){c.call(b,a.error)}}var d=this.ea[a.hd];return function(){d.call(b,a.Hd,a.Mc)}};h.matches=function(a){if(a instanceof rc){if(this.ea&&a.ea){var b=sc(a.ea);if(b===sc(this.ea)){if(1===b){var b=tc(a.ea),c=tc(this.ea);return c===b&&(!a.ea[b]||!this.ea[c]||a.ea[b]===this.ea[c])}return uc(this.ea,function(b,c){return a.ea[c]===b})}return!1}return!0}return!1};
h.df=function(){return null!==this.ea};function L(a,b,c){this.j=a;this.path=b;this.C=c}L.prototype.bc=function(){G("Query.ref",0,0,arguments.length);return new M(this.j,this.path)};L.prototype.ref=L.prototype.bc;L.prototype.Ab=function(a,b,c,d){G("Query.on",2,4,arguments.length);gc("Query.on",a,!1);I("Query.on",2,b,!1);var e=vc("Query.on",c,d);if("value"===a)wc(this.j,this,new qc(b,e.cancel||null,e.Ia||null));else{var f={};f[a]=b;wc(this.j,this,new rc(f,e.cancel,e.Ia))}return b};L.prototype.on=L.prototype.Ab;
L.prototype.Yb=function(a,b,c){G("Query.off",0,3,arguments.length);gc("Query.off",a,!0);I("Query.off",2,b,!0);Yb("Query.off",3,c);var d=null,e=null;"value"===a?d=new qc(b||null,null,c||null):a&&(b&&(e={},e[a]=b),d=new rc(e,null,c||null));e=this.j;d=".info"===J(this.path)?e.pd.eb(this,d):e.N.eb(this,d);xc(e.ba,this.path,d)};L.prototype.off=L.prototype.Yb;
L.prototype.fg=function(a,b){function c(g){f&&(f=!1,e.Yb(a,c),b.call(d.Ia,g))}G("Query.once",2,4,arguments.length);gc("Query.once",a,!1);I("Query.once",2,b,!1);var d=vc("Query.once",arguments[2],arguments[3]),e=this,f=!0;this.Ab(a,c,function(b){e.Yb(a,c);d.cancel&&d.cancel.call(d.Ia,b)})};L.prototype.once=L.prototype.fg;
L.prototype.te=function(a){G("Query.limit",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limit: First argument must be a positive integer.");if(this.C.Ja&&this.C.wa)throw Error("Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead.");return new L(this.j,this.path,this.C.te(a))};L.prototype.limit=L.prototype.te;
L.prototype.ue=function(a){G("Query.limitToFirst",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToFirst: First argument must be a positive integer.");return new L(this.j,this.path,this.C.ue(a))};L.prototype.limitToFirst=L.prototype.ue;L.prototype.ve=function(a){G("Query.limitToLast",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToLast: First argument must be a positive integer.");return new L(this.j,this.path,this.C.ve(a))};
L.prototype.limitToLast=L.prototype.ve;L.prototype.Hc=function(a){G("Query.orderBy",1,1,arguments.length);if("$key"===a)throw Error('Query.orderBy: "$key" is invalid.  Use Query.orderByKey() instead.');if("$priority"===a)throw Error('Query.orderBy: "$priority" is invalid.  Use Query.orderByPriority() instead.');hc("Query.orderBy",1,a,!1);return new L(this.j,this.path,this.C.Hc(new Mb(a)))};L.prototype.orderBy=L.prototype.Hc;
L.prototype.gg=function(){G("Query.orderByKey",0,0,arguments.length);return new L(this.j,this.path,this.C.Hc(Pb))};L.prototype.orderByKey=L.prototype.gg;L.prototype.hg=function(){G("Query.orderByPriority",0,0,arguments.length);return new L(this.j,this.path,this.C.Hc(F))};L.prototype.orderByPriority=L.prototype.hg;
L.prototype.Id=function(a,b){G("Query.startAt",0,2,arguments.length);fc("Query.startAt",1,a,!0);hc("Query.startAt",2,b,!0);if(this.C.Ja&&this.C.sa&&!Ub(this.C))throw Error("Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead.");m(a)||(b=a=null);return new L(this.j,this.path,this.C.Id(a,b))};L.prototype.startAt=L.prototype.Id;
L.prototype.fd=function(a,b){G("Query.endAt",0,2,arguments.length);fc("Query.endAt",1,a,!0);hc("Query.endAt",2,b,!0);if(this.C.wa&&this.C.sa&&!Ub(this.C))throw Error("Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead.");return new L(this.j,this.path,this.C.fd(a,b))};L.prototype.endAt=L.prototype.fd;L.prototype.Of=function(a,b){G("Query.equalTo",1,2,arguments.length);fc("Query.equalTo",1,a,!1);hc("Query.equalTo",2,b,!0);return this.Id(a,b).fd(a,b)};
L.prototype.equalTo=L.prototype.Of;function yc(a){a=a.C;var b={};a.wa&&(b.sp=a.wc,a.hc&&(b.sn=a.Tb));a.Ja&&(b.ep=a.vc,a.tc&&(b.en=a.Qb));if(a.sa){b.l=a.yb;var c=a.Yc;""===c&&(c=a.wa?"l":"r");b.vf=c}a.G!==F&&(b.i=a.G.toString());return b}L.prototype.Da=function(){var a=Ab(yc(this));return"{}"===a?"default":a};
function vc(a,b,c){var d={cancel:null,Ia:null};if(b&&c)d.cancel=b,I(a,3,d.cancel,!0),d.Ia=c,Yb(a,4,d.Ia);else if(b)if("object"===typeof b&&null!==b)d.Ia=b;else if("function"===typeof b)d.cancel=b;else throw Error(H(a,3,!0)+" must either be a cancel callback or a context object.");return d};function N(a,b){if(1==arguments.length){this.A=a.split("/");for(var c=0,d=0;d<this.A.length;d++)0<this.A[d].length&&(this.A[c]=this.A[d],c++);this.A.length=c;this.da=0}else this.A=a,this.da=b}function J(a){return a.da>=a.A.length?null:a.A[a.da]}function O(a){return a.A.length-a.da}function Q(a){var b=a.da;b<a.A.length&&b++;return new N(a.A,b)}N.prototype.toString=function(){for(var a="",b=this.da;b<this.A.length;b++)""!==this.A[b]&&(a+="/"+this.A[b]);return a||"/"};
N.prototype.parent=function(){if(this.da>=this.A.length)return null;for(var a=[],b=this.da;b<this.A.length-1;b++)a.push(this.A[b]);return new N(a,0)};N.prototype.B=function(a){for(var b=[],c=this.da;c<this.A.length;c++)b.push(this.A[c]);if(a instanceof N)for(c=a.da;c<a.A.length;c++)b.push(a.A[c]);else for(a=a.split("/"),c=0;c<a.length;c++)0<a[c].length&&b.push(a[c]);return new N(b,0)};N.prototype.e=function(){return this.da>=this.A.length};var R=new N("");
function S(a,b){var c=J(a);if(null===c)return b;if(c===J(b))return S(Q(a),Q(b));throw Error("INTERNAL ERROR: innerPath ("+b+") is not within outerPath ("+a+")");}N.prototype.aa=function(a){if(O(this)!==O(a))return!1;for(var b=this.da,c=a.da;b<=this.A.length;b++,c++)if(this.A[b]!==a.A[c])return!1;return!0};N.prototype.contains=function(a){var b=this.da,c=a.da;if(O(this)>O(a))return!1;for(;b<this.A.length;){if(this.A[b]!==a.A[c])return!1;++b;++c}return!0};function zc(){this.children={};this.$c=0;this.value=null}function Ac(a,b,c){this.td=a?a:"";this.Jc=b?b:null;this.J=c?c:new zc}function Bc(a,b){for(var c=b instanceof N?b:new N(b),d=a,e;null!==(e=J(c));)d=new Ac(e,d,u(d.J.children,e)||new zc),c=Q(c);return d}h=Ac.prototype;h.ra=function(){return this.J.value};function Cc(a,b){x("undefined"!==typeof b,"Cannot set value to undefined");a.J.value=b;Dc(a)}h.clear=function(){this.J.value=null;this.J.children={};this.J.$c=0;Dc(this)};
h.kd=function(){return 0<this.J.$c};h.e=function(){return null===this.ra()&&!this.kd()};h.ga=function(a){var b=this;A(this.J.children,function(c,d){a(new Ac(d,b,c))})};function Ec(a,b,c,d){c&&!d&&b(a);a.ga(function(a){Ec(a,b,!0,d)});c&&d&&b(a)}function Fc(a,b){for(var c=a.parent();null!==c&&!b(c);)c=c.parent()}h.path=function(){return new N(null===this.Jc?this.td:this.Jc.path()+"/"+this.td)};h.name=function(){return this.td};h.parent=function(){return this.Jc};
function Dc(a){if(null!==a.Jc){var b=a.Jc,c=a.td,d=a.e(),e=t(b.J.children,c);d&&e?(delete b.J.children[c],b.J.$c--,Dc(b)):d||e||(b.J.children[c]=a.J,b.J.$c++,Dc(b))}};function Gc(a,b){this.Ha=a;this.oa=b?b:Hc}h=Gc.prototype;h.La=function(a,b){return new Gc(this.Ha,this.oa.La(a,b,this.Ha).Z(null,null,!1,null,null))};h.remove=function(a){return new Gc(this.Ha,this.oa.remove(a,this.Ha).Z(null,null,!1,null,null))};h.get=function(a){for(var b,c=this.oa;!c.e();){b=this.Ha(a,c.key);if(0===b)return c.value;0>b?c=c.left:0<b&&(c=c.right)}return null};
function Ic(a,b){for(var c,d=a.oa,e=null;!d.e();){c=a.Ha(b,d.key);if(0===c){if(d.left.e())return e?e.key:null;for(d=d.left;!d.right.e();)d=d.right;return d.key}0>c?d=d.left:0<c&&(e=d,d=d.right)}throw Error("Attempted to find predecessor key for a nonexistent key.  What gives?");}h.e=function(){return this.oa.e()};h.count=function(){return this.oa.count()};h.Dc=function(){return this.oa.Dc()};h.Vb=function(){return this.oa.Vb()};h.Ba=function(a){return this.oa.Ba(a)};
h.Aa=function(a){return new Jc(this.oa,null,this.Ha,!1,a)};h.rb=function(a,b){return new Jc(this.oa,a,this.Ha,!1,b)};h.Ob=function(a,b){return new Jc(this.oa,a,this.Ha,!0,b)};h.cf=function(a){return new Jc(this.oa,null,this.Ha,!0,a)};function Jc(a,b,c,d,e){this.rf=e||null;this.re=d;this.Xb=[];for(e=1;!a.e();)if(e=b?c(a.key,b):1,d&&(e*=-1),0>e)a=this.re?a.left:a.right;else if(0===e){this.Xb.push(a);break}else this.Xb.push(a),a=this.re?a.right:a.left}
function T(a){if(0===a.Xb.length)return null;var b=a.Xb.pop(),c;c=a.rf?a.rf(b.key,b.value):{key:b.key,value:b.value};if(a.re)for(b=b.left;!b.e();)a.Xb.push(b),b=b.right;else for(b=b.right;!b.e();)a.Xb.push(b),b=b.left;return c}function Kc(a,b,c,d,e){this.key=a;this.value=b;this.color=null!=c?c:!0;this.left=null!=d?d:Hc;this.right=null!=e?e:Hc}h=Kc.prototype;h.Z=function(a,b,c,d,e){return new Kc(null!=a?a:this.key,null!=b?b:this.value,null!=c?c:this.color,null!=d?d:this.left,null!=e?e:this.right)};
h.count=function(){return this.left.count()+1+this.right.count()};h.e=function(){return!1};h.Ba=function(a){return this.left.Ba(a)||a(this.key,this.value)||this.right.Ba(a)};function Lc(a){return a.left.e()?a:Lc(a.left)}h.Dc=function(){return Lc(this).key};h.Vb=function(){return this.right.e()?this.key:this.right.Vb()};h.La=function(a,b,c){var d,e;e=this;d=c(a,e.key);e=0>d?e.Z(null,null,null,e.left.La(a,b,c),null):0===d?e.Z(null,b,null,null,null):e.Z(null,null,null,null,e.right.La(a,b,c));return Mc(e)};
function Nc(a){if(a.left.e())return Hc;a.left.ca()||a.left.left.ca()||(a=Oc(a));a=a.Z(null,null,null,Nc(a.left),null);return Mc(a)}
h.remove=function(a,b){var c,d;c=this;if(0>b(a,c.key))c.left.e()||c.left.ca()||c.left.left.ca()||(c=Oc(c)),c=c.Z(null,null,null,c.left.remove(a,b),null);else{c.left.ca()&&(c=Pc(c));c.right.e()||c.right.ca()||c.right.left.ca()||(c=Qc(c),c.left.left.ca()&&(c=Pc(c),c=Qc(c)));if(0===b(a,c.key)){if(c.right.e())return Hc;d=Lc(c.right);c=c.Z(d.key,d.value,null,null,Nc(c.right))}c=c.Z(null,null,null,null,c.right.remove(a,b))}return Mc(c)};h.ca=function(){return this.color};
function Mc(a){a.right.ca()&&!a.left.ca()&&(a=Rc(a));a.left.ca()&&a.left.left.ca()&&(a=Pc(a));a.left.ca()&&a.right.ca()&&(a=Qc(a));return a}function Oc(a){a=Qc(a);a.right.left.ca()&&(a=a.Z(null,null,null,null,Pc(a.right)),a=Rc(a),a=Qc(a));return a}function Rc(a){return a.right.Z(null,null,a.color,a.Z(null,null,!0,null,a.right.left),null)}function Pc(a){return a.left.Z(null,null,a.color,null,a.Z(null,null,!0,a.left.right,null))}
function Qc(a){return a.Z(null,null,!a.color,a.left.Z(null,null,!a.left.color,null,null),a.right.Z(null,null,!a.right.color,null,null))}function Sc(){}h=Sc.prototype;h.Z=function(){return this};h.La=function(a,b){return new Kc(a,b,null)};h.remove=function(){return this};h.count=function(){return 0};h.e=function(){return!0};h.Ba=function(){return!1};h.Dc=function(){return null};h.Vb=function(){return null};h.ca=function(){return!1};var Hc=new Sc;function C(a,b){this.name=a;this.L=b}function Tc(a,b){return new C(a,b)};function Uc(a,b){this.D=a;x(null!==this.D,"LeafNode shouldn't be created with null value.");this.ia=b||E;Vc(this.ia);this.xb=null}h=Uc.prototype;h.R=function(){return!0};h.Q=function(){return this.ia};h.gb=function(a){return new Uc(this.D,a)};h.I=function(a){return".priority"===a?this.ia:E};h.P=function(a){return a.e()?this:".priority"===J(a)?this.ia:E};h.$=function(){return!1};h.bf=function(){return null};h.w=function(a,b){return".priority"===a?this.gb(b):E.w(a,b).gb(this.ia)};
h.u=function(a,b){var c=J(a);if(null===c)return b;x(".priority"!==c||1===O(a),".priority must be the last token in a path");return this.w(c,E.u(Q(a),b))};h.e=function(){return!1};h.Za=function(){return 0};h.O=function(a){return a&&!this.Q().e()?{".value":this.ra(),".priority":this.Q().O()}:this.ra()};h.hash=function(){if(null===this.xb){var a="";this.ia.e()||(a+="priority:"+Wc(this.ia.O())+":");var b=typeof this.D,a=a+(b+":"),a="number"===b?a+Db(this.D):a+this.D;this.xb=lb(a)}return this.xb};
h.ra=function(){return this.D};h.fe=function(a){if(a===E)return 1;if(a instanceof Xc)return-1;x(a.R(),"Unknown node type");var b=typeof a.D,c=typeof this.D,d=Ja(Yc,b),e=Ja(Yc,c);x(0<=d,"Unknown leaf type: "+b);x(0<=e,"Unknown leaf type: "+c);return d===e?"object"===c?0:this.D<a.D?-1:this.D===a.D?0:1:e-d};var Yc=["object","boolean","number","string"];Uc.prototype.hb=function(){return this};Uc.prototype.Ub=function(){return!0};
Uc.prototype.aa=function(a){return a===this?!0:a.R()?this.D===a.D&&this.ia.aa(a.ia):!1};Uc.prototype.toString=function(){return"string"===typeof this.D?this.D:'"'+this.D+'"'};function Zc(a,b){this.od=a;this.Sb=b}Zc.prototype.get=function(a){var b=u(this.od,a);if(!b)throw Error("No index defined for "+a);return b===Jb?null:b};function $c(a,b,c){var d=ad(a.od,function(d,f){var g=u(a.Sb,f);x(g,"Missing index implementation for "+f);if(d===Jb){if(g.qe(b.L)){for(var k=[],l=c.Aa(Tc),n=T(l);n;)n.name!=b.name&&k.push(n),n=T(l);k.push(b);return bd(k,Kb(g))}return Jb}g=c.get(b.name);k=d;g&&(k=k.remove(new C(b.name,g)));return k.La(b,b.L)});return new Zc(d,a.Sb)}
function cd(a,b,c){var d=ad(a.od,function(a){if(a===Jb)return a;var d=c.get(b.name);return d?a.remove(new C(b.name,d)):a});return new Zc(d,a.Sb)}var dd=new Zc({".priority":Jb},{".priority":F});function Xc(a,b,c){this.m=a;(this.ia=b)&&Vc(this.ia);this.sb=c;this.xb=null}h=Xc.prototype;h.R=function(){return!1};h.Q=function(){return this.ia||E};h.gb=function(a){return new Xc(this.m,a,this.sb)};h.I=function(a){if(".priority"===a)return this.Q();a=this.m.get(a);return null===a?E:a};h.P=function(a){var b=J(a);return null===b?this:this.I(b).P(Q(a))};h.$=function(a){return null!==this.m.get(a)};
h.w=function(a,b){x(b,"We should always be passing snapshot nodes");if(".priority"===a)return this.gb(b);var c=new C(a,b),d;b.e()?(d=this.m.remove(a),c=cd(this.sb,c,this.m)):(d=this.m.La(a,b),c=$c(this.sb,c,this.m));return new Xc(d,this.ia,c)};h.u=function(a,b){var c=J(a);if(null===c)return b;x(".priority"!==J(a)||1===O(a),".priority must be the last token in a path");var d=this.I(c).u(Q(a),b);return this.w(c,d)};h.e=function(){return this.m.e()};h.Za=function(){return this.m.count()};var ed=/^(0|[1-9]\d*)$/;
h=Xc.prototype;h.O=function(a){if(this.e())return null;var b={},c=0,d=0,e=!0;this.ga(F,function(f,g){b[f]=g.O(a);c++;e&&ed.test(f)?d=Math.max(d,Number(f)):e=!1});if(!a&&e&&d<2*c){var f=[],g;for(g in b)f[g]=b[g];return f}a&&!this.Q().e()&&(b[".priority"]=this.Q().O());return b};h.hash=function(){if(null===this.xb){var a="";this.Q().e()||(a+="priority:"+Wc(this.Q().O())+":");this.ga(F,function(b,c){var d=c.hash();""!==d&&(a+=":"+b+":"+d)});this.xb=""===a?"":lb(a)}return this.xb};
h.bf=function(a,b,c){return(c=fd(this,c))?(a=Ic(c,new C(a,b)))?a.name:null:Ic(this.m,a)};function gd(a,b){var c;c=(c=fd(a,b))?(c=c.Dc())&&c.name:a.m.Dc();return c?new C(c,a.m.get(c)):null}function hd(a,b){var c;c=(c=fd(a,b))?(c=c.Vb())&&c.name:a.m.Vb();return c?new C(c,a.m.get(c)):null}h.ga=function(a,b){var c=fd(this,a);return c?c.Ba(function(a){return b(a.name,a.L)}):this.m.Ba(b)};h.Aa=function(a){return this.rb(a.ye(),a)};
h.rb=function(a,b){var c=fd(this,b);return c?c.rb(a,function(a){return a}):this.m.rb(a.name,Tc)};h.cf=function(a){return this.Ob(a.xe(),a)};h.Ob=function(a,b){var c=fd(this,b);return c?c.Ob(a,function(a){return a}):this.m.Ob(a.name,Tc)};h.fe=function(a){return this.e()?a.e()?0:-1:a.R()||a.e()?1:a===Nb?-1:0};
h.hb=function(a){if(a===Pb||id(this.sb.Sb,a.toString()))return this;var b=this.sb,c=this.m;x(a!==Pb,"KeyIndex always exists and isn't meant to be added to the IndexMap.");for(var d=[],e=!1,c=c.Aa(Tc),f=T(c);f;)e=e||a.qe(f.L),d.push(f),f=T(c);d=e?bd(d,Kb(a)):Jb;e=a.toString();c=jd(b.Sb);c[e]=a;a=jd(b.od);a[e]=d;return new Xc(this.m,this.ia,new Zc(a,c))};h.Ub=function(a){return a===Pb||id(this.sb.Sb,a.toString())};
h.aa=function(a){if(a===this)return!0;if(a.R())return!1;if(this.Q().aa(a.Q())&&this.m.count()===a.m.count()){var b=this.Aa(F);a=a.Aa(F);for(var c=T(b),d=T(a);c&&d;){if(c.name!==d.name||!c.L.aa(d.L))return!1;c=T(b);d=T(a)}return null===c&&null===d}return!1};function fd(a,b){return b===Pb?null:a.sb.get(b.toString())}h.toString=function(){var a="{",b=!0;this.ga(F,function(c,d){b?b=!1:a+=", ";a+='"'+c+'" : '+d.toString()});return a+="}"};function D(a,b){if(null===a)return E;var c=null;"object"===typeof a&&".priority"in a?c=a[".priority"]:"undefined"!==typeof b&&(c=b);x(null===c||"string"===typeof c||"number"===typeof c||"object"===typeof c&&".sv"in c,"Invalid priority type found: "+typeof c);"object"===typeof a&&".value"in a&&null!==a[".value"]&&(a=a[".value"]);if("object"!==typeof a||".sv"in a)return new Uc(a,D(c));if(a instanceof Array){var d=E,e=a;A(e,function(a,b){if(t(e,b)&&"."!==b.substring(0,1)){var c=D(a);if(c.R()||!c.e())d=
d.w(b,c)}});return d.gb(D(c))}var f=[],g=!1,k=a;Cb(k,function(a,b){if("string"!==typeof b||"."!==b.substring(0,1)){var c=D(k[b]);c.e()||(g=g||!c.Q().e(),f.push(new C(b,c)))}});var l=bd(f,Gb,function(a){return a.name},Hb);if(g){var n=bd(f,Kb(F));return new Xc(l,D(c),new Zc({".priority":n},{".priority":F}))}return new Xc(l,D(c),dd)}var kd=Math.log(2);function ld(a){this.count=parseInt(Math.log(a+1)/kd,10);this.We=this.count-1;this.Jf=a+1&parseInt(Array(this.count+1).join("1"),2)}
function md(a){var b=!(a.Jf&1<<a.We);a.We--;return b}
function bd(a,b,c,d){function e(b,d){var f=d-b;if(0==f)return null;if(1==f){var n=a[b],r=c?c(n):n;return new Kc(r,n.L,!1,null,null)}var n=parseInt(f/2,10)+b,f=e(b,n),s=e(n+1,d),n=a[n],r=c?c(n):n;return new Kc(r,n.L,!1,f,s)}a.sort(b);var f=function(b){function d(b,g){var k=r-b,s=r;r-=b;var s=e(k+1,s),k=a[k],y=c?c(k):k,s=new Kc(y,k.L,g,null,s);f?f.left=s:n=s;f=s}for(var f=null,n=null,r=a.length,s=0;s<b.count;++s){var y=md(b),P=Math.pow(2,b.count-(s+1));y?d(P,!1):(d(P,!1),d(P,!0))}return n}(new ld(a.length));
return null!==f?new Gc(d||b,f):new Gc(d||b)}function Wc(a){return"number"===typeof a?"number:"+Db(a):"string:"+a}function Vc(a){if(a.R()){var b=a.O();x("string"===typeof b||"number"===typeof b||"object"===typeof b&&t(b,".sv"),"Priority must be a string or number.")}else x(a===Nb||a.e(),"priority of unexpected type.");x(a===Nb||a.Q().e(),"Priority nodes can't have a priority of their own.")}var E=new Xc(new Gc(Hb),null,dd);function nd(){Xc.call(this,new Gc(Hb),E,dd)}oa(nd,Xc);h=nd.prototype;
h.fe=function(a){return a===this?0:1};h.aa=function(a){return a===this};h.Q=function(){throw ib("Why is this called?");};h.I=function(){return E};h.e=function(){return!1};var Nb=new nd,Lb=new C("[MIN_NAME]",E);function K(a,b,c){this.J=a;this.Y=b;this.G=c}K.prototype.O=function(){G("Firebase.DataSnapshot.val",0,0,arguments.length);return this.J.O()};K.prototype.val=K.prototype.O;K.prototype.Ze=function(){G("Firebase.DataSnapshot.exportVal",0,0,arguments.length);return this.J.O(!0)};K.prototype.exportVal=K.prototype.Ze;
K.prototype.B=function(a){G("Firebase.DataSnapshot.child",0,1,arguments.length);ga(a)&&(a=String(a));ic("Firebase.DataSnapshot.child",a);var b=new N(a),c=this.Y.B(b);return new K(this.J.P(b),c,F)};K.prototype.child=K.prototype.B;K.prototype.$=function(a){G("Firebase.DataSnapshot.hasChild",1,1,arguments.length);ic("Firebase.DataSnapshot.hasChild",a);var b=new N(a);return!this.J.P(b).e()};K.prototype.hasChild=K.prototype.$;
K.prototype.Q=function(){G("Firebase.DataSnapshot.getPriority",0,0,arguments.length);return this.J.Q().O()};K.prototype.getPriority=K.prototype.Q;K.prototype.forEach=function(a){G("Firebase.DataSnapshot.forEach",1,1,arguments.length);I("Firebase.DataSnapshot.forEach",1,a,!1);if(this.J.R())return!1;var b=this;return!!this.J.ga(this.G,function(c,d){return a(new K(d,b.Y.B(c),F))})};K.prototype.forEach=K.prototype.forEach;
K.prototype.kd=function(){G("Firebase.DataSnapshot.hasChildren",0,0,arguments.length);return this.J.R()?!1:!this.J.e()};K.prototype.hasChildren=K.prototype.kd;K.prototype.name=function(){G("Firebase.DataSnapshot.name",0,0,arguments.length);return this.Y.name()};K.prototype.name=K.prototype.name;K.prototype.Za=function(){G("Firebase.DataSnapshot.numChildren",0,0,arguments.length);return this.J.Za()};K.prototype.numChildren=K.prototype.Za;
K.prototype.bc=function(){G("Firebase.DataSnapshot.ref",0,0,arguments.length);return this.Y};K.prototype.ref=K.prototype.bc;function od(a){x(ea(a)&&0<a.length,"Requires a non-empty array");this.Bf=a;this.Bc={}}od.prototype.Rd=function(a,b){for(var c=this.Bc[a]||[],d=0;d<c.length;d++)c[d].mc.apply(c[d].Ia,Array.prototype.slice.call(arguments,1))};od.prototype.Ab=function(a,b,c){pd(this,a);this.Bc[a]=this.Bc[a]||[];this.Bc[a].push({mc:b,Ia:c});(a=this.ne(a))&&b.apply(c,a)};od.prototype.Yb=function(a,b,c){pd(this,a);a=this.Bc[a]||[];for(var d=0;d<a.length;d++)if(a[d].mc===b&&(!c||c===a[d].Ia)){a.splice(d,1);break}};
function pd(a,b){x(Pa(a.Bf,function(a){return a===b}),"Unknown event: "+b)};function qd(){od.call(this,["visible"]);var a,b;"undefined"!==typeof document&&"undefined"!==typeof document.addEventListener&&("undefined"!==typeof document.hidden?(b="visibilitychange",a="hidden"):"undefined"!==typeof document.mozHidden?(b="mozvisibilitychange",a="mozHidden"):"undefined"!==typeof document.msHidden?(b="msvisibilitychange",a="msHidden"):"undefined"!==typeof document.webkitHidden&&(b="webkitvisibilitychange",a="webkitHidden"));this.jc=!0;if(b){var c=this;document.addEventListener(b,
function(){var b=!document[a];b!==c.jc&&(c.jc=b,c.Rd("visible",b))},!1)}}oa(qd,od);ca(qd);qd.prototype.ne=function(a){x("visible"===a,"Unknown event type: "+a);return[this.jc]};function rd(){od.call(this,["online"]);this.Gc=!0;if("undefined"!==typeof window&&"undefined"!==typeof window.addEventListener){var a=this;window.addEventListener("online",function(){a.Gc||a.Rd("online",!0);a.Gc=!0},!1);window.addEventListener("offline",function(){a.Gc&&a.Rd("online",!1);a.Gc=!1},!1)}}oa(rd,od);ca(rd);rd.prototype.ne=function(a){x("online"===a,"Unknown event type: "+a);return[this.Gc]};function A(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function ad(a,b){var c={},d;for(d in a)c[d]=b.call(void 0,a[d],d,a);return c}function uc(a,b){for(var c in a)if(!b.call(void 0,a[c],c,a))return!1;return!0}function sc(a){var b=0,c;for(c in a)b++;return b}function tc(a){for(var b in a)return b}function sd(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function td(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}function id(a,b){for(var c in a)if(a[c]==b)return!0;return!1}
function ud(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d}function vd(a,b){var c=ud(a,b,void 0);return c&&a[c]}function wd(a){for(var b in a)return!1;return!0}function xd(a,b){return b in a?a[b]:void 0}function jd(a){var b={},c;for(c in a)b[c]=a[c];return b}var yd="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function zd(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<yd.length;f++)c=yd[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};function Ad(){this.qc={}}function Bd(a,b,c){m(c)||(c=1);t(a.qc,b)||(a.qc[b]=0);a.qc[b]+=c}Ad.prototype.get=function(){return jd(this.qc)};function Cd(a){this.Kf=a;this.qd=null}Cd.prototype.get=function(){var a=this.Kf.get(),b=jd(a);if(this.qd)for(var c in this.qd)b[c]-=this.qd[c];this.qd=a;return b};function Dd(a,b){this.Me={};this.Kd=new Cd(a);this.U=b;var c=1E4+2E4*Math.random();setTimeout(q(this.of,this),Math.floor(c))}Dd.prototype.of=function(){var a=this.Kd.get(),b={},c=!1,d;for(d in a)0<a[d]&&t(this.Me,d)&&(b[d]=a[d],c=!0);c&&(a=this.U,a.fa&&(b={c:b},a.f("reportStats",b),a.va("s",b)));setTimeout(q(this.of,this),Math.floor(6E5*Math.random()))};var Ed={},Fd={};function Gd(a){a=a.toString();Ed[a]||(Ed[a]=new Ad);return Ed[a]}function Hd(a,b){var c=a.toString();Fd[c]||(Fd[c]=b());return Fd[c]};var Id=null;"undefined"!==typeof MozWebSocket?Id=MozWebSocket:"undefined"!==typeof WebSocket&&(Id=WebSocket);function Jd(a,b,c){this.ge=a;this.f=rb(this.ge);this.frames=this.xc=null;this.lb=this.mb=this.Oe=0;this.Ea=Gd(b);this.Xa=(b.Cb?"wss://":"ws://")+b.Ma+"/.ws?v=5";"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(this.Xa+="&r=f");b.host!==b.Ma&&(this.Xa=this.Xa+"&ns="+b.zb);c&&(this.Xa=this.Xa+"&s="+c)}var Kd;
Jd.prototype.open=function(a,b){this.Na=b;this.bg=a;this.f("Websocket connecting to "+this.Xa);this.uc=!1;va.set("previous_websocket_failure",!0);try{this.na=new Id(this.Xa)}catch(c){this.f("Error instantiating WebSocket.");var d=c.message||c.data;d&&this.f(d);this.$a();return}var e=this;this.na.onopen=function(){e.f("Websocket connected.");e.uc=!0};this.na.onclose=function(){e.f("Websocket connection was disconnected.");e.na=null;e.$a()};this.na.onmessage=function(a){if(null!==e.na)if(a=a.data,e.lb+=
a.length,Bd(e.Ea,"bytes_received",a.length),Ld(e),null!==e.frames)Md(e,a);else{a:{x(null===e.frames,"We already have a frame buffer");if(6>=a.length){var b=Number(a);if(!isNaN(b)){e.Oe=b;e.frames=[];a=null;break a}}e.Oe=1;e.frames=[]}null!==a&&Md(e,a)}};this.na.onerror=function(a){e.f("WebSocket error.  Closing connection.");(a=a.message||a.data)&&e.f(a);e.$a()}};Jd.prototype.start=function(){};
Jd.isAvailable=function(){var a=!1;if("undefined"!==typeof navigator&&navigator.userAgent){var b=navigator.userAgent.match(/Android ([0-9]{0,}\.[0-9]{0,})/);b&&1<b.length&&4.4>parseFloat(b[1])&&(a=!0)}return!a&&null!==Id&&!Kd};Jd.responsesRequiredToBeHealthy=2;Jd.healthyTimeout=3E4;h=Jd.prototype;h.rd=function(){va.remove("previous_websocket_failure")};function Md(a,b){a.frames.push(b);if(a.frames.length==a.Oe){var c=a.frames.join("");a.frames=null;c=sa(c);a.bg(c)}}
h.send=function(a){Ld(this);a=v(a);this.mb+=a.length;Bd(this.Ea,"bytes_sent",a.length);a=Bb(a,16384);1<a.length&&this.na.send(String(a.length));for(var b=0;b<a.length;b++)this.na.send(a[b])};h.Uc=function(){this.ub=!0;this.xc&&(clearInterval(this.xc),this.xc=null);this.na&&(this.na.close(),this.na=null)};h.$a=function(){this.ub||(this.f("WebSocket is closing itself"),this.Uc(),this.Na&&(this.Na(this.uc),this.Na=null))};h.close=function(){this.ub||(this.f("WebSocket is being closed"),this.Uc())};
function Ld(a){clearInterval(a.xc);a.xc=setInterval(function(){a.na&&a.na.send("0");Ld(a)},Math.floor(45E3))};function Nd(a){this.Zb=a;this.Bd=[];this.Ib=0;this.ee=-1;this.Bb=null}function Od(a,b,c){a.ee=b;a.Bb=c;a.ee<a.Ib&&(a.Bb(),a.Bb=null)}function Pd(a,b,c){for(a.Bd[b]=c;a.Bd[a.Ib];){var d=a.Bd[a.Ib];delete a.Bd[a.Ib];for(var e=0;e<d.length;++e)if(d[e]){var f=a;Fb(function(){f.Zb(d[e])})}if(a.Ib===a.ee){a.Bb&&(clearTimeout(a.Bb),a.Bb(),a.Bb=null);break}a.Ib++}};function Qd(){this.set={}}h=Qd.prototype;h.add=function(a,b){this.set[a]=null!==b?b:!0};h.contains=function(a){return t(this.set,a)};h.get=function(a){return this.contains(a)?this.set[a]:void 0};h.remove=function(a){delete this.set[a]};h.clear=function(){this.set={}};h.e=function(){return wd(this.set)};h.count=function(){return sc(this.set)};function Rd(a,b){A(a.set,function(a,d){b(d,a)})};function Sd(a,b,c){this.ge=a;this.f=rb(a);this.lb=this.mb=0;this.Ea=Gd(b);this.Gd=c;this.uc=!1;this.Xc=function(a){b.host!==b.Ma&&(a.ns=b.zb);var c=[],f;for(f in a)a.hasOwnProperty(f)&&c.push(f+"="+a[f]);return(b.Cb?"https://":"http://")+b.Ma+"/.lp?"+c.join("&")}}var Td,Ud;
Sd.prototype.open=function(a,b){this.Ve=0;this.ha=b;this.hf=new Nd(a);this.ub=!1;var c=this;this.pb=setTimeout(function(){c.f("Timed out trying to connect.");c.$a();c.pb=null},Math.floor(3E4));wb(function(){if(!c.ub){c.Pa=new Vd(function(a,b,d,k,l){Wd(c,arguments);if(c.Pa)if(c.pb&&(clearTimeout(c.pb),c.pb=null),c.uc=!0,"start"==a)c.id=b,c.nf=d;else if("close"===a)b?(c.Pa.Fd=!1,Od(c.hf,b,function(){c.$a()})):c.$a();else throw Error("Unrecognized command received: "+a);},function(a,b){Wd(c,arguments);
Pd(c.hf,a,b)},function(){c.$a()},c.Xc);var a={start:"t"};a.ser=Math.floor(1E8*Math.random());c.Pa.Sd&&(a.cb=c.Pa.Sd);a.v="5";c.Gd&&(a.s=c.Gd);"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(a.r="f");a=c.Xc(a);c.f("Connecting via long-poll to "+a);Xd(c.Pa,a,function(){})}})};
Sd.prototype.start=function(){var a=this.Pa,b=this.nf;a.Wf=this.id;a.Xf=b;for(a.Wd=!0;Yd(a););a=this.id;b=this.nf;this.Wb=document.createElement("iframe");var c={dframe:"t"};c.id=a;c.pw=b;this.Wb.src=this.Xc(c);this.Wb.style.display="none";document.body.appendChild(this.Wb)};Sd.isAvailable=function(){return!Ud&&!("object"===typeof window&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))&&!("object"===typeof Windows&&"object"===typeof Windows.yg)&&(Td||!0)};h=Sd.prototype;
h.rd=function(){};h.Uc=function(){this.ub=!0;this.Pa&&(this.Pa.close(),this.Pa=null);this.Wb&&(document.body.removeChild(this.Wb),this.Wb=null);this.pb&&(clearTimeout(this.pb),this.pb=null)};h.$a=function(){this.ub||(this.f("Longpoll is closing itself"),this.Uc(),this.ha&&(this.ha(this.uc),this.ha=null))};h.close=function(){this.ub||(this.f("Longpoll is being closed."),this.Uc())};
h.send=function(a){a=v(a);this.mb+=a.length;Bd(this.Ea,"bytes_sent",a.length);a=mb(a);a=gb(a,!0);a=Bb(a,1840);for(var b=0;b<a.length;b++){var c=this.Pa;c.Lc.push({ng:this.Ve,vg:a.length,Xe:a[b]});c.Wd&&Yd(c);this.Ve++}};function Wd(a,b){var c=v(b).length;a.lb+=c;Bd(a.Ea,"bytes_received",c)}
function Vd(a,b,c,d){this.Xc=d;this.Na=c;this.De=new Qd;this.Lc=[];this.ie=Math.floor(1E8*Math.random());this.Fd=!0;this.Sd=hb();window["pLPCommand"+this.Sd]=a;window["pRTLPCB"+this.Sd]=b;a=document.createElement("iframe");a.style.display="none";if(document.body){document.body.appendChild(a);try{a.contentWindow.document||kb("No IE domain setting required")}catch(e){a.src="javascript:void((function(){document.open();document.domain='"+document.domain+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
a.contentDocument?a.Ya=a.contentDocument:a.contentWindow?a.Ya=a.contentWindow.document:a.document&&(a.Ya=a.document);this.ua=a;a="";this.ua.src&&"javascript:"===this.ua.src.substr(0,11)&&(a='<script>document.domain="'+document.domain+'";\x3c/script>');a="<html><body>"+a+"</body></html>";try{this.ua.Ya.open(),this.ua.Ya.write(a),this.ua.Ya.close()}catch(f){kb("frame writing exception"),f.stack&&kb(f.stack),kb(f)}}
Vd.prototype.close=function(){this.Wd=!1;if(this.ua){this.ua.Ya.body.innerHTML="";var a=this;setTimeout(function(){null!==a.ua&&(document.body.removeChild(a.ua),a.ua=null)},Math.floor(0))}var b=this.Na;b&&(this.Na=null,b())};
function Yd(a){if(a.Wd&&a.Fd&&a.De.count()<(0<a.Lc.length?2:1)){a.ie++;var b={};b.id=a.Wf;b.pw=a.Xf;b.ser=a.ie;for(var b=a.Xc(b),c="",d=0;0<a.Lc.length;)if(1870>=a.Lc[0].Xe.length+30+c.length){var e=a.Lc.shift(),c=c+"&seg"+d+"="+e.ng+"&ts"+d+"="+e.vg+"&d"+d+"="+e.Xe;d++}else break;Zd(a,b+c,a.ie);return!0}return!1}function Zd(a,b,c){function d(){a.De.remove(c);Yd(a)}a.De.add(c);var e=setTimeout(d,Math.floor(25E3));Xd(a,b,function(){clearTimeout(e);d()})}
function Xd(a,b,c){setTimeout(function(){try{if(a.Fd){var d=a.ua.Ya.createElement("script");d.type="text/javascript";d.async=!0;d.src=b;d.onload=d.onreadystatechange=function(){var a=d.readyState;a&&"loaded"!==a&&"complete"!==a||(d.onload=d.onreadystatechange=null,d.parentNode&&d.parentNode.removeChild(d),c())};d.onerror=function(){kb("Long-poll script failed to load: "+b);a.Fd=!1;a.close()};a.ua.Ya.body.appendChild(d)}}catch(e){}},Math.floor(1))};function $d(a){ae(this,a)}var be=[Sd,Jd];function ae(a,b){var c=Jd&&Jd.isAvailable(),d=c&&!(va.gf||!0===va.get("previous_websocket_failure"));b.xg&&(c||z("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),d=!0);if(d)a.Vc=[Jd];else{var e=a.Vc=[];Cb(be,function(a,b){b&&b.isAvailable()&&e.push(b)})}}function ce(a){if(0<a.Vc.length)return a.Vc[0];throw Error("No transports available");};function de(a,b,c,d,e,f){this.id=a;this.f=rb("c:"+this.id+":");this.Zb=c;this.Fc=d;this.ha=e;this.Be=f;this.S=b;this.Ad=[];this.Se=0;this.xf=new $d(b);this.Ra=0;this.f("Connection created");ee(this)}
function ee(a){var b=ce(a.xf);a.K=new b("c:"+a.id+":"+a.Se++,a.S);a.Fe=b.responsesRequiredToBeHealthy||0;var c=fe(a,a.K),d=ge(a,a.K);a.Wc=a.K;a.Tc=a.K;a.H=null;a.vb=!1;setTimeout(function(){a.K&&a.K.open(c,d)},Math.floor(0));b=b.healthyTimeout||0;0<b&&(a.md=setTimeout(function(){a.md=null;a.vb||(a.K&&102400<a.K.lb?(a.f("Connection exceeded healthy timeout but has received "+a.K.lb+" bytes.  Marking connection healthy."),a.vb=!0,a.K.rd()):a.K&&10240<a.K.mb?a.f("Connection exceeded healthy timeout but has sent "+
a.K.mb+" bytes.  Leaving connection alive."):(a.f("Closing unhealthy connection after timeout."),a.close()))},Math.floor(b)))}function ge(a,b){return function(c){b===a.K?(a.K=null,c||0!==a.Ra?1===a.Ra&&a.f("Realtime connection lost."):(a.f("Realtime connection failed."),"s-"===a.S.Ma.substr(0,2)&&(va.remove("host:"+a.S.host),a.S.Ma=a.S.host)),a.close()):b===a.H?(a.f("Secondary connection lost."),c=a.H,a.H=null,a.Wc!==c&&a.Tc!==c||a.close()):a.f("closing an old connection")}}
function fe(a,b){return function(c){if(2!=a.Ra)if(b===a.Tc){var d=zb("t",c);c=zb("d",c);if("c"==d){if(d=zb("t",c),"d"in c)if(c=c.d,"h"===d){var d=c.ts,e=c.v,f=c.h;a.Gd=c.s;ya(a.S,f);0==a.Ra&&(a.K.start(),he(a,a.K,d),"5"!==e&&z("Protocol version mismatch detected"),c=a.xf,(c=1<c.Vc.length?c.Vc[1]:null)&&ie(a,c))}else if("n"===d){a.f("recvd end transmission on primary");a.Tc=a.H;for(c=0;c<a.Ad.length;++c)a.wd(a.Ad[c]);a.Ad=[];je(a)}else"s"===d?(a.f("Connection shutdown command received. Shutting down..."),
a.Be&&(a.Be(c),a.Be=null),a.ha=null,a.close()):"r"===d?(a.f("Reset packet received.  New host: "+c),ya(a.S,c),1===a.Ra?a.close():(ke(a),ee(a))):"e"===d?sb("Server Error: "+c):"o"===d?(a.f("got pong on primary."),le(a),me(a)):sb("Unknown control packet command: "+d)}else"d"==d&&a.wd(c)}else if(b===a.H)if(d=zb("t",c),c=zb("d",c),"c"==d)"t"in c&&(c=c.t,"a"===c?ne(a):"r"===c?(a.f("Got a reset on secondary, closing it"),a.H.close(),a.Wc!==a.H&&a.Tc!==a.H||a.close()):"o"===c&&(a.f("got pong on secondary."),
a.uf--,ne(a)));else if("d"==d)a.Ad.push(c);else throw Error("Unknown protocol layer: "+d);else a.f("message on old connection")}}de.prototype.va=function(a){oe(this,{t:"d",d:a})};function je(a){a.Wc===a.H&&a.Tc===a.H&&(a.f("cleaning up and promoting a connection: "+a.H.ge),a.K=a.H,a.H=null)}
function ne(a){0>=a.uf?(a.f("Secondary connection is healthy."),a.vb=!0,a.H.rd(),a.H.start(),a.f("sending client ack on secondary"),a.H.send({t:"c",d:{t:"a",d:{}}}),a.f("Ending transmission on primary"),a.K.send({t:"c",d:{t:"n",d:{}}}),a.Wc=a.H,je(a)):(a.f("sending ping on secondary."),a.H.send({t:"c",d:{t:"p",d:{}}}))}de.prototype.wd=function(a){le(this);this.Zb(a)};function le(a){a.vb||(a.Fe--,0>=a.Fe&&(a.f("Primary connection is healthy."),a.vb=!0,a.K.rd()))}
function ie(a,b){a.H=new b("c:"+a.id+":"+a.Se++,a.S,a.Gd);a.uf=b.responsesRequiredToBeHealthy||0;a.H.open(fe(a,a.H),ge(a,a.H));setTimeout(function(){a.H&&(a.f("Timed out trying to upgrade."),a.H.close())},Math.floor(6E4))}function he(a,b,c){a.f("Realtime connection established.");a.K=b;a.Ra=1;a.Fc&&(a.Fc(c),a.Fc=null);0===a.Fe?(a.f("Primary connection is healthy."),a.vb=!0):setTimeout(function(){me(a)},Math.floor(5E3))}
function me(a){a.vb||1!==a.Ra||(a.f("sending ping on primary."),oe(a,{t:"c",d:{t:"p",d:{}}}))}function oe(a,b){if(1!==a.Ra)throw"Connection is not connected";a.Wc.send(b)}de.prototype.close=function(){2!==this.Ra&&(this.f("Closing realtime connection."),this.Ra=2,ke(this),this.ha&&(this.ha(),this.ha=null))};function ke(a){a.f("Shutting down all connections");a.K&&(a.K.close(),a.K=null);a.H&&(a.H.close(),a.H=null);a.md&&(clearTimeout(a.md),a.md=null)};function pe(a){var b={},c={},d={},e="";try{var f=a.split("."),b=sa(jb(f[0])||""),c=sa(jb(f[1])||""),e=f[2],d=c.d||{};delete c.d}catch(g){}return{Bg:b,de:c,data:d,sg:e}}function qe(a){a=pe(a).de;return"object"===typeof a&&a.hasOwnProperty("iat")?u(a,"iat"):null}function re(a){a=pe(a);var b=a.de;return!!a.sg&&!!b&&"object"===typeof b&&b.hasOwnProperty("iat")};function te(a,b,c,d){this.id=ue++;this.f=rb("p:"+this.id+":");this.Eb=!0;this.ta={};this.ka=[];this.Ic=0;this.Ec=[];this.fa=!1;this.Ua=1E3;this.sd=3E5;this.xd=b;this.vd=c;this.Ce=d;this.S=a;this.Ie=null;this.Pc={};this.mg=0;this.yc=this.se=null;ve(this,0);qd.Mb().Ab("visible",this.eg,this);-1===a.host.indexOf("fblocal")&&rd.Mb().Ab("online",this.cg,this)}var ue=0,we=0;h=te.prototype;
h.va=function(a,b,c){var d=++this.mg;a={r:d,a:a,b:b};this.f(v(a));x(this.fa,"sendRequest call when we're not connected not allowed.");this.Ta.va(a);c&&(this.Pc[d]=c)};function xe(a,b,c,d,e){var f=b.Da(),g=b.path.toString();a.f("Listen called for "+g+" "+f);a.ta[g]=a.ta[g]||{};x(!a.ta[g][f],"listen() called twice for same path/queryId.");a.ta[g][f]={M:e,ld:c,ig:yc(b),tag:d};a.fa&&ye(a,g,f)}
function ye(a,b,c){a.f("Listen on "+b+" for "+c);var d={p:b},e=a.ta[b][c];e.tag&&(d.q=e.ig,d.t=e.tag);e=a.ta[b][c];d.h=e.ld();var f=e.M;a.va("q",d,function(d){a.f("listen response",d);var e=d.s;"ok"!==e&&ze(a,b,c);f&&f(e,d.d)})}h.W=function(a,b,c){this.Hb={Mf:a,$e:!1,mc:b,Zc:c};this.f("Authenticating using credential: "+a);Ae(this);(b=40==a.length)||(a=pe(a).de,b="object"===typeof a&&!0===u(a,"admin"));b&&(this.f("Admin auth credential detected.  Reducing max reconnect time."),this.sd=3E4)};
h.Pe=function(a){delete this.Hb;this.fa&&this.va("unauth",{},function(b){a(b.s,b.d)})};function Ae(a){var b=a.Hb;a.fa&&b&&a.va("auth",{cred:b.Mf},function(c){var d=c.s;c=c.d||"error";"ok"!==d&&a.Hb===b&&delete a.Hb;b.$e?"ok"!==d&&b.Zc&&b.Zc(d,c):(b.$e=!0,b.mc&&b.mc(d,c))})}function Be(a,b,c,d){a.fa?Ce(a,"o",b,c,d):a.Ec.push({Kc:b,action:"o",data:c,M:d})}function De(a,b,c,d){a.fa?Ce(a,"om",b,c,d):a.Ec.push({Kc:b,action:"om",data:c,M:d})}
h.Ae=function(a,b){this.fa?Ce(this,"oc",a,null,b):this.Ec.push({Kc:a,action:"oc",data:null,M:b})};function Ce(a,b,c,d,e){c={p:c,d:d};a.f("onDisconnect "+b,c);a.va(b,c,function(a){e&&setTimeout(function(){e(a.s,a.d)},Math.floor(0))})}h.put=function(a,b,c,d){Ee(this,"p",a,b,c,d)};function Fe(a,b,c,d){Ee(a,"m",b,c,d,void 0)}function Ee(a,b,c,d,e,f){d={p:c,d:d};m(f)&&(d.h=f);a.ka.push({action:b,pf:d,M:e});a.Ic++;b=a.ka.length-1;a.fa?Ge(a,b):a.f("Buffering put: "+c)}
function Ge(a,b){var c=a.ka[b].action,d=a.ka[b].pf,e=a.ka[b].M;a.ka[b].jg=a.fa;a.va(c,d,function(d){a.f(c+" response",d);delete a.ka[b];a.Ic--;0===a.Ic&&(a.ka=[]);e&&e(d.s,d.d)})}
h.wd=function(a){if("r"in a){this.f("from server: "+v(a));var b=a.r,c=this.Pc[b];c&&(delete this.Pc[b],c(a.b))}else{if("error"in a)throw"A server-side error has occurred: "+a.error;"a"in a&&(b=a.a,c=a.b,this.f("handleServerMessage",b,c),"d"===b?this.xd(c.p,c.d,!1,c.t):"m"===b?this.xd(c.p,c.d,!0,c.t):"c"===b?He(this,c.p,c.q):"ac"===b?(a=c.s,b=c.d,c=this.Hb,delete this.Hb,c&&c.Zc&&c.Zc(a,b)):"sd"===b?this.Ie?this.Ie(c):"msg"in c&&"undefined"!==typeof console&&console.log("FIREBASE: "+c.msg.replace("\n",
"\nFIREBASE: ")):sb("Unrecognized action received from server: "+v(b)+"\nAre you using the latest client?"))}};h.Fc=function(a){this.f("connection ready");this.fa=!0;this.yc=(new Date).getTime();this.Ce({serverTimeOffset:a-(new Date).getTime()});Ie(this);this.vd(!0)};function ve(a,b){x(!a.Ta,"Scheduling a connect when we're already connected/ing?");a.Jb&&clearTimeout(a.Jb);a.Jb=setTimeout(function(){a.Jb=null;Je(a)},Math.floor(b))}
h.eg=function(a){a&&!this.jc&&this.Ua===this.sd&&(this.f("Window became visible.  Reducing delay."),this.Ua=1E3,this.Ta||ve(this,0));this.jc=a};h.cg=function(a){a?(this.f("Browser went online.  Reconnecting."),this.Ua=1E3,this.Eb=!0,this.Ta||ve(this,0)):(this.f("Browser went offline.  Killing connection; don't reconnect."),this.Eb=!1,this.Ta&&this.Ta.close())};
h.kf=function(){this.f("data client disconnected");this.fa=!1;this.Ta=null;for(var a=0;a<this.ka.length;a++){var b=this.ka[a];b&&"h"in b.pf&&b.jg&&(b.M&&b.M("disconnect"),delete this.ka[a],this.Ic--)}0===this.Ic&&(this.ka=[]);if(this.Eb)this.jc?this.yc&&(3E4<(new Date).getTime()-this.yc&&(this.Ua=1E3),this.yc=null):(this.f("Window isn't visible.  Delaying reconnect."),this.Ua=this.sd,this.se=(new Date).getTime()),a=Math.max(0,this.Ua-((new Date).getTime()-this.se)),a*=Math.random(),this.f("Trying to reconnect in "+
a+"ms"),ve(this,a),this.Ua=Math.min(this.sd,1.3*this.Ua);else for(var c in this.Pc)delete this.Pc[c];this.vd(!1)};function Je(a){if(a.Eb){a.f("Making a connection attempt");a.se=(new Date).getTime();a.yc=null;var b=q(a.wd,a),c=q(a.Fc,a),d=q(a.kf,a),e=a.id+":"+we++;a.Ta=new de(e,a.S,b,c,d,function(b){z(b+" ("+a.S.toString()+")");a.Eb=!1})}}h.tb=function(){this.Eb=!1;this.Ta?this.Ta.close():(this.Jb&&(clearTimeout(this.Jb),this.Jb=null),this.fa&&this.kf())};
h.ec=function(){this.Eb=!0;this.Ua=1E3;this.fa||ve(this,0)};function He(a,b,c){c=c?Ma(c,function(a){return Ab(a)}).join("$"):"default";(a=ze(a,b,c))&&a.M&&a.M("permission_denied")}function ze(a,b,c){b=(new N(b)).toString();var d=a.ta[b][c];delete a.ta[b][c];0===sc(a.ta[b])&&delete a.ta[b];return d}function Ie(a){Ae(a);A(a.ta,function(b,d){A(b,function(b,c){ye(a,d,c)})});for(var b=0;b<a.ka.length;b++)a.ka[b]&&Ge(a,b);for(;a.Ec.length;)b=a.Ec.shift(),Ce(a,b.action,b.Kc,b.data,b.M)};function Ke(){this.m=this.D=null}Ke.prototype.cc=function(a,b){if(a.e())this.D=b,this.m=null;else if(null!==this.D)this.D=this.D.u(a,b);else{null==this.m&&(this.m=new Qd);var c=J(a);this.m.contains(c)||this.m.add(c,new Ke);c=this.m.get(c);a=Q(a);c.cc(a,b)}};
function Le(a,b){if(b.e())return a.D=null,a.m=null,!0;if(null!==a.D){if(a.D.R())return!1;var c=a.D;a.D=null;c.ga(F,function(b,c){a.cc(new N(b),c)});return Le(a,b)}return null!==a.m?(c=J(b),b=Q(b),a.m.contains(c)&&Le(a.m.get(c),b)&&a.m.remove(c),a.m.e()?(a.m=null,!0):!1):!0}function Me(a,b,c){null!==a.D?c(b,a.D):a.ga(function(a,e){var f=new N(b.toString()+"/"+a);Me(e,f,c)})}Ke.prototype.ga=function(a){null!==this.m&&Rd(this.m,function(b,c){a(b,c)})};function Ne(){this.Sc=E}Ne.prototype.toString=function(){return this.Sc.toString()};function Oe(){this.qb=[]}function Pe(a,b){for(var c=null,d=0;d<b.length;d++){var e=b[d],f=e.Nb();null===c||f.aa(c.Nb())||(a.qb.push(c),c=null);null===c&&(c=new Qe(f));c.add(e)}c&&a.qb.push(c)}function xc(a,b,c){Pe(a,c);Re(a,function(a){return a.aa(b)})}function Se(a,b,c){Pe(a,c);Re(a,function(a){return a.contains(b)||b.contains(a)})}
function Re(a,b){for(var c=!0,d=0;d<a.qb.length;d++){var e=a.qb[d];if(e)if(e=e.Nb(),b(e)){for(var e=a.qb[d],f=0;f<e.jd.length;f++){var g=e.jd[f];if(null!==g){e.jd[f]=null;var k=g.Lb();ob&&kb("event: "+g.toString());Fb(k)}}a.qb[d]=null}else c=!1}c&&(a.qb=[])}function Qe(a){this.Ca=a;this.jd=[]}Qe.prototype.add=function(a){this.jd.push(a)};Qe.prototype.Nb=function(){return this.Ca};var Te="auth.firebase.com";function Ue(a,b,c){this.ad=a||{};this.Qd=b||{};this.fc=c||{};this.ad.remember||(this.ad.remember="default")}var Ve=["remember","redirectTo"];function We(a){var b={},c={};pa(a||{},function(a,e){0<=Ja(Ve,a)?b[a]=e:c[a]=e});return new Ue(b,{},c)};var Xe={NETWORK_ERROR:"Unable to contact the Firebase server.",SERVER_ERROR:"An unknown server error occurred.",TRANSPORT_UNAVAILABLE:"There are no login transports available for the requested method.",REQUEST_INTERRUPTED:"The browser redirected the page before the login request could complete.",USER_CANCELLED:"The user cancelled authentication."};function U(a){var b=Error(u(Xe,a),a);b.code=a;return b};function Ye(){var a=window.opener.frames,b;for(b=a.length-1;0<=b;b--)try{if(a[b].location.protocol===window.location.protocol&&a[b].location.host===window.location.host&&"__winchan_relay_frame"===a[b].name)return a[b]}catch(c){}return null}function Ze(a,b,c){a.attachEvent?a.attachEvent("on"+b,c):a.addEventListener&&a.addEventListener(b,c,!1)}function $e(a,b,c){a.detachEvent?a.detachEvent("on"+b,c):a.removeEventListener&&a.removeEventListener(b,c,!1)}
function af(a){/^https?:\/\//.test(a)||(a=window.location.href);var b=/^(https?:\/\/[\-_a-zA-Z\.0-9:]+)/.exec(a);return b?b[1]:a}function bf(a){var b="";try{a=a.replace("#","");var c={},d=a.replace(/^\?/,"").split("&");for(a=0;a<d.length;a++)if(d[a]){var e=d[a].split("=");c[e[0]]=e[1]}c&&t(c,"__firebase_request_key")&&(b=u(c,"__firebase_request_key"))}catch(f){}return b}
function cf(a){var b=[],c;for(c in a)if(t(a,c)){var d=u(a,c);if(ea(d))for(var e=0;e<d.length;e++)b.push(encodeURIComponent(c)+"="+encodeURIComponent(d[e]));else b.push(encodeURIComponent(c)+"="+encodeURIComponent(u(a,c)))}return b.join("&")}function df(){var a=ub(Te);return a.scheme+"://"+a.host+"/v2"};function ef(){return!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(navigator.userAgent)}function ff(){var a=navigator.userAgent;if("Microsoft Internet Explorer"===navigator.appName){if((a=a.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/))&&1<a.length)return 8<=parseFloat(a[1])}else if(-1<a.indexOf("Trident")&&(a=a.match(/rv:([0-9]{2,2}[\.0-9]{0,})/))&&1<a.length)return 8<=parseFloat(a[1]);return!1};function gf(a){a=a||{};a.method||(a.method="GET");a.headers||(a.headers={});a.headers.content_type||(a.headers.content_type="application/json");a.headers.content_type=a.headers.content_type.toLowerCase();this.options=a}
gf.prototype.open=function(a,b,c){function d(){c&&(c(U("REQUEST_INTERRUPTED")),c=null)}var e=new XMLHttpRequest,f=this.options.method.toUpperCase(),g;Ze(window,"beforeunload",d);e.onreadystatechange=function(){if(c&&4===e.readyState){var a;if(200<=e.status&&300>e.status){try{a=sa(e.responseText)}catch(b){}c(null,a)}else 500<=e.status&&600>e.status?c(U("SERVER_ERROR")):c(U("NETWORK_ERROR"));c=null;$e(window,"beforeunload",d)}};if("GET"===f)a+=(/\?/.test(a)?"":"?")+cf(b),g=null;else{var k=this.options.headers.content_type;
"application/json"===k&&(g=v(b));"application/x-www-form-urlencoded"===k&&(g=cf(b))}e.open(f,a,!0);a={"X-Requested-With":"XMLHttpRequest",Accept:"application/json;text/plain"};zd(a,this.options.headers);for(var l in a)e.setRequestHeader(l,a[l]);e.send(g)};gf.isAvailable=function(){return!!window.XMLHttpRequest&&"string"===typeof(new XMLHttpRequest).responseType&&(!(navigator.userAgent.match(/MSIE/)||navigator.userAgent.match(/Trident/))||ff())};gf.prototype.oc=function(){return"json"};function hf(a){a=a||{};this.Qc=Ia()+Ia()+Ia();this.lf=a||{}}
hf.prototype.open=function(a,b,c){function d(){c&&(c(U("USER_CANCELLED")),c=null)}var e=this,f=ub(Te),g;b.requestId=this.Qc;b.redirectTo=f.scheme+"://"+f.host+"/blank/page.html";a+=/\?/.test(a)?"":"?";a+=cf(b);(g=window.open(a,"_blank","location=no"))&&ha(g.addEventListener)?(g.addEventListener("loadstart",function(a){var b;if(b=a&&a.url)a:{var f=a.url;try{var r=document.createElement("a");r.href=f;b=r.host===ub(Te).host&&"/blank/page.html"===r.pathname;break a}catch(s){}b=!1}b&&(a=bf(a.url),g.removeEventListener("exit",
d),g.close(),a=new Ue(null,null,{requestId:e.Qc,requestKey:a}),e.lf.requestWithCredential("/auth/session",a,c),c=null)}),g.addEventListener("exit",d)):c(U("TRANSPORT_UNAVAILABLE"))};na("fb.login.transports.CordovaInAppBrowser.prototype.open",hf.prototype.open);hf.isAvailable=function(){return ef()};hf.prototype.oc=function(){return"redirect"};function jf(a){a=a||{};if(!a.window_features||-1!==navigator.userAgent.indexOf("Fennec/")||-1!==navigator.userAgent.indexOf("Firefox/")&&-1!==navigator.userAgent.indexOf("Android"))a.window_features=void 0;a.window_name||(a.window_name="_blank");a.relay_url||(a.relay_url=df()+"/auth/channel");this.options=a}
jf.prototype.open=function(a,b,c){function d(a){g&&(document.body.removeChild(g),g=void 0);r&&(r=clearInterval(r));$e(window,"message",e);$e(window,"unload",d);if(n&&!a)try{n.close()}catch(b){k.postMessage("die",l)}n=k=void 0}function e(a){if(a.origin===l)try{var b=sa(a.data);"ready"===b.a?k.postMessage(s,l):"error"===b.a?(d(!1),c&&(c(b.d),c=null)):"response"===b.a&&(d(b.Ag),c&&(c(null,b.d),c=null))}catch(e){}}var f=ff(),g,k,l=af(a);if(l!==af(this.options.relay_url))c&&setTimeout(function(){c(Error("invalid arguments: origin of url and relay_url must match"))},
0);else{f&&(g=document.createElement("iframe"),g.setAttribute("src",this.options.relay_url),g.style.display="none",g.setAttribute("name","__winchan_relay_frame"),document.body.appendChild(g),k=g.contentWindow);a+=(/\?/.test(a)?"":"?")+cf(b);var n=window.open(a,this.options.window_name,this.options.window_features);k||(k=n);var r=setInterval(function(){n&&n.closed&&(d(!1),c&&(c(U("USER_CANCELLED")),c=null))},500),s=v({a:"request",d:b});Ze(window,"unload",d);Ze(window,"message",e)}};
na("fb.login.transports.Popup.prototype.open",jf.prototype.open);jf.isAvailable=function(){return"postMessage"in window&&!/^file:\//.test(location.href)&&!(ef()||navigator.userAgent.match(/Windows Phone/)||window.Windows&&/^ms-appx:/.test(location.href)||navigator.userAgent.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i)||navigator.userAgent.match(/CriOS/)||navigator.userAgent.match(/Twitter for iPhone/)||navigator.userAgent.match(/FBAN\/FBIOS/)||window.navigator.standalone)&&!navigator.userAgent.match(/PhantomJS/)};
jf.prototype.oc=function(){return"popup"};function kf(a){a=a||{};a.callback_parameter||(a.callback_parameter="callback");this.options=a;window.__firebase_auth_jsonp=window.__firebase_auth_jsonp||{}}
kf.prototype.open=function(a,b,c){function d(){c&&(c(U("REQUEST_INTERRUPTED")),c=null)}function e(){setTimeout(function(){delete window.__firebase_auth_jsonp[f];wd(window.__firebase_auth_jsonp)&&delete window.__firebase_auth_jsonp;try{var a=document.getElementById(f);a&&a.parentNode.removeChild(a)}catch(b){}},1);$e(window,"beforeunload",d)}var f="fn"+(new Date).getTime()+Math.floor(99999*Math.random());b[this.options.callback_parameter]="__firebase_auth_jsonp."+f;a+=(/\?/.test(a)?"":"?")+cf(b);Ze(window,
"beforeunload",d);window.__firebase_auth_jsonp[f]=function(a){c&&(c(null,a),c=null);e()};lf(f,a,c)};function lf(a,b,c){setTimeout(function(){try{var d=document.createElement("script");d.type="text/javascript";d.id=a;d.async=!0;d.src=b;d.onerror=function(){var b=document.getElementById(a);null!==b&&b.parentNode.removeChild(b);c&&c(U("NETWORK_ERROR"))};var e=document.getElementsByTagName("head");(e&&0!=e.length?e[0]:document.documentElement).appendChild(d)}catch(f){c&&c(U("NETWORK_ERROR"))}},0)}
kf.isAvailable=function(){return!ef()};kf.prototype.oc=function(){return"json"};function mf(a,b){this.Ee=["session",a.Cd,a.zb].join(":");this.Md=b}mf.prototype.set=function(a,b){if(!b)if(this.Md.length)b=this.Md[0];else throw Error("fb.login.SessionManager : No storage options available!");b.set(this.Ee,a)};mf.prototype.get=function(){var a=Ma(this.Md,q(this.Sf,this)),a=La(a,function(a){return null!==a});Ua(a,function(a,c){return qe(c.token)-qe(a.token)});return 0<a.length?a.shift():null};mf.prototype.Sf=function(a){try{var b=a.get(this.Ee);if(b&&b.token)return b}catch(c){}return null};
mf.prototype.clear=function(){var a=this;Ka(this.Md,function(b){b.remove(a.Ee)})};function nf(a){a=a||{};this.Qc=Ia()+Ia()+Ia();this.lf=a||{}}nf.prototype.open=function(a,b){wa.set("redirect_request_id",this.Qc);b.requestId=this.Qc;b.redirectTo=b.redirectTo||window.location.href;a+=(/\?/.test(a)?"":"?")+cf(b);window.location=a};na("fb.login.transports.Redirect.prototype.open",nf.prototype.open);nf.isAvailable=function(){return!/^file:\//.test(location.href)&&!ef()};nf.prototype.oc=function(){return"redirect"};function of(a,b,c,d){od.call(this,["auth_status"]);this.S=a;this.Re=b;this.wg=c;this.ze=d;this.gc=new mf(a,[va,wa]);this.kb=null;pf(this)}oa(of,od);h=of.prototype;h.le=function(){return this.kb||null};function pf(a){wa.get("redirect_request_id")&&qf(a);var b=a.gc.get();b&&b.token?(rf(a,b),a.Re(b.token,function(c,d){sf(a,c,d,!1,b.token,b)},function(b,d){tf(a,"resumeSession()",b,d)})):rf(a,null)}
function uf(a,b,c,d,e,f){"firebaseio-demo.com"===a.S.domain&&z("FirebaseRef.auth() not supported on demo Firebases (*.firebaseio-demo.com). Please use on production Firebases only (*.firebaseio.com).");a.Re(b,function(f,k){sf(a,f,k,!0,b,c,d||{},e)},function(b,c){tf(a,"auth()",b,c,f)})}function vf(a,b){a.gc.clear();rf(a,null);a.wg(function(a,d){if("ok"===a)B(b);else{var e=(a||"error").toUpperCase(),f=e;d&&(f+=": "+d);f=Error(f);f.code=e;B(b,f)}})}
function sf(a,b,c,d,e,f,g,k){"ok"===b?(d&&(b=c.auth,f.auth=b,f.expires=c.expires,f.token=re(e)?e:"",c=null,b&&t(b,"uid")?c=u(b,"uid"):t(f,"uid")&&(c=u(f,"uid")),f.uid=c,c="custom",b&&t(b,"provider")?c=u(b,"provider"):t(f,"provider")&&(c=u(f,"provider")),f.provider=c,a.gc.clear(),re(e)&&(g=g||{},c=va,"sessionOnly"===g.remember&&(c=wa),"none"!==g.remember&&a.gc.set(f,c)),rf(a,f)),B(k,null,f)):(a.gc.clear(),rf(a,null),f=a=(b||"error").toUpperCase(),c&&(f+=": "+c),f=Error(f),f.code=a,B(k,f))}
function tf(a,b,c,d,e){z(b+" was canceled: "+d);a.gc.clear();rf(a,null);a=Error(d);a.code=c.toUpperCase();B(e,a)}function wf(a,b,c,d){xf(a);var e=[gf,kf];c=We(c);yf(a,e,"/auth/"+b,c,d)}
function zf(a,b,c,d){xf(a);var e=[jf,hf];c=We(c);"anonymous"===b||"password"===b?setTimeout(function(){B(d,U("TRANSPORT_UNAVAILABLE"))},0):(c.Qd.window_features="menubar=yes,modal=yes,alwaysRaised=yeslocation=yes,resizable=yes,scrollbars=yes,status=yes,height=625,width=625,top="+("object"===typeof screen?.5*(screen.height-625):0)+",left="+("object"===typeof screen?.5*(screen.width-625):0),c.Qd.relay_url=df()+"/"+a.S.zb+"/auth/channel",c.Qd.requestWithCredential=q(a.Rc,a),yf(a,e,"/auth/"+b,c,d))}
function qf(a){var b=wa.get("redirect_request_id");if(b){var c=wa.get("redirect_client_options");wa.remove("redirect_request_id");wa.remove("redirect_client_options");var d=[gf,kf],b={requestId:b,requestKey:bf(document.location.hash)},c=new Ue(c,{},b);try{document.location.hash=document.location.hash.replace(/&__firebase_request_key=([a-zA-z0-9]*)/,"")}catch(e){}yf(a,d,"/auth/session",c)}}h.he=function(a,b){xf(this);var c=We(a);c.fc._method="POST";this.Rc("/users",c,function(a){B(b,a)})};
h.Ge=function(a,b){var c=this;xf(this);var d="/users/"+encodeURIComponent(a.email),e=We(a);e.fc._method="DELETE";this.Rc(d,e,function(a,d){!a&&d&&d.uid&&c.kb&&c.kb.uid&&c.kb.uid===d.uid&&vf(c);B(b,a)})};h.ce=function(a,b){xf(this);var c="/users/"+encodeURIComponent(a.email)+"/password",d=We(a);d.fc._method="PUT";d.fc.password=a.newPassword;this.Rc(c,d,function(a){B(b,a)})};
h.He=function(a,b){xf(this);var c="/users/"+encodeURIComponent(a.email)+"/password",d=We(a);d.fc._method="POST";this.Rc(c,d,function(a){B(b,a)})};h.Rc=function(a,b,c){Af(this,[gf,kf],a,b,c)};function yf(a,b,c,d,e){Af(a,b,c,d,function(b,c){!b&&c&&c.token&&c.uid?uf(a,c.token,c,d.ad,function(a,b){a?B(e,a):B(e,null,b)}):B(e,b||U("UNKNOWN_ERROR"))})}
function Af(a,b,c,d,e){b=La(b,function(a){return"function"===typeof a.isAvailable&&a.isAvailable()});0===b.length?setTimeout(function(){B(e,U("TRANSPORT_UNAVAILABLE"))},0):(b=new (b.shift())(d.Qd),d=qa(d.fc),d.v="js-1.2.0-beta.1",d.transport=b.oc(),d.suppress_status_codes=!0,a=df()+"/"+a.S.zb+c,b.open(a,d,function(a,b){if(a)B(e,a);else if(b&&b.error){var c=Error(b.error.message);c.code=b.error.code;c.details=b.error.details;B(e,c)}else B(e,null,b)}))}
function rf(a,b){var c=null!==a.kb||null!==b;a.kb=b;c&&a.Rd("auth_status",b);a.ze(null!==b)}h.ne=function(a){x("auth_status"===a,'initial event must be of type "auth_status"');return[this.kb]};function xf(a){var b=a.S;if("firebaseio.com"!==b.domain&&"firebaseio-demo.com"!==b.domain&&"auth.firebase.com"===Te)throw Error("This custom Firebase server ('"+a.S.domain+"') does not support delegated login.");};function Bf(a,b){return a&&"object"===typeof a?(x(".sv"in a,"Unexpected leaf node or priority contents"),b[a[".sv"]]):a}function Cf(a,b){var c=new Ke;Me(a,new N(""),function(a,e){c.cc(a,Df(e,b))});return c}function Df(a,b){var c=a.Q().O(),c=Bf(c,b),d;if(a.R()){var e=Bf(a.ra(),b);return e!==a.ra()||c!==a.Q().O()?new Uc(e,D(c)):a}d=a;c!==a.Q().O()&&(d=d.gb(new Uc(c)));a.ga(F,function(a,c){var e=Df(c,b);e!==c&&(d=d.w(a,e))});return d};function V(a,b,c,d){this.type=a;this.Va=b;this.ob=c;this.Mc=null;this.Zf=d};function Ef(){}var Ff=new Ef;function Gf(a,b,c,d){var e,f;f=W(c);e=W(b);if(d.e())return c.o?(a=[],e?e.aa(f)||(e.R()?a=Hf(f):f.R()?(a=[],e.R()||e.e()||a.push(new V("children_removed",e))):a=If(e,f),a.push(new V("value",f))):(a=Hf(f),a.push(new V("value",f))),0!==a.length||b.o||a.push(new V("value",f)),a):e?If(e,f):Hf(f);if(".priority"===J(d))return!c.o||e&&e.aa(f)?[]:[new V("value",f)];if(c.o||1===O(d))return e=J(d),f=f.I(e),a.dd(b,c,e,f);e=J(d);return f.$(e)?(f=f.I(e),a.dd(b,c,e,f)):[]}
Ef.prototype.dd=function(a,b,c,d){(a=W(a))?a.$(c)?(a=a.I(c),c=a.aa(d)?[]:d.e()?[new V("child_removed",a,c)]:[new V("child_changed",d,c,a)]):c=d.e()?[]:[new V("child_added",d,c)]:c=d.e()?[]:[new V("child_added",d,c)];0<c.length&&b.o&&c.push(new V("value",W(b)));return c};function Hf(a){var b=[];a.R()||a.e()||b.push(new V("children_added",a));return b}
function If(a,b){var c=[],d=[],e=[],f=[],g={},k={},l,n,r,s;l=a.Aa(F);r=T(l);n=b.Aa(F);s=T(n);for(var y=Kb(F);null!==r||null!==s;){var P;P=r?s?y(r,s):-1:1;0>P?(P=u(g,r.name),m(P)?(f.push(d[P]),d[P]=null):(k[r.name]=e.length,e.push(r)),r=T(l)):(0<P?(P=u(k,s.name),m(P)?(f.push(s),e[P]=null):(g[s.name]=d.length,d.push(s))):((r=r.L.hash()!==s.L.hash())&&f.push(s),r=T(l)),s=T(n))}for(g=0;g<e.length;g++)(k=e[g])&&c.push(new V("child_removed",k.L,k.name));for(g=0;g<d.length;g++)(e=d[g])&&c.push(new V("child_added",
e.L,e.name));for(g=0;g<f.length;g++)d=f[g],c.push(new V("child_changed",d.L,d.name,a.I(d.name)));return c}function Jf(a,b,c){this.wb=a;this.Oa=c;this.G=b}oa(Jf,Ef);
Jf.prototype.dd=function(a,b,c,d){var e=W(a)||E,f=W(b)||E;if(e.Za()<this.wb||f.Za()<this.wb)return Jf.Ne.dd.call(this,a,b,c,d);x(!e.R()&&!f.R(),"If it's a leaf node, we should have hit the above case.");a=[];var g=e.I(c);g.e()?f.$(c)&&(e=this.Oa?gd(e,this.G):hd(e,this.G),a.push(new V("child_removed",e.L,e.name)),a.push(new V("child_added",d,c))):f.$(c)?d.aa(g)||a.push(new V("child_changed",d,c,e.I(c))):(a.push(new V("child_removed",g,c)),e=this.Oa?gd(f,this.G):hd(f,this.G),a.push(new V("child_added",
e.L,e.name)));0<a.length&&b.o&&a.push(new V("value",f));return a};function Kf(){}h=Kf.prototype;
h.ya=function(a,b,c,d){if(b.type===Lf){if(b.source.ke)return this.lc(a,b.path,b.Qa,c,d);x(b.source.af,"Unknown source.");return this.jb(a,b.path,b.Qa,c,d)}if(b.type===Mf){if(b.source.ke)return this.Yd(a,b.path,b.children,c,d);x(b.source.af,"Unknown source.");return this.Xd(a,b.path,b.children,c,d)}if(b.type===Nf){if(b.tf)a:{var e=b.path;Of(this,a);b=a.o;var f=a.F;if(a.k){x(a.o,"Must have event snap if we have server snap");var g=c.Wa(e,a.o,a.k);if(g)if(b=a.o.u(e,g),e.e())b=this.X(this.n(b));else{f=
J(e);b=b.I(f);a=this.Fa(a,f,b,a.k,a.g,c,d);break a}}else if(a.g)if(a.o)(d=c.Kb())?b=this.X(this.n(d)):(c=c.Wa(e,a.o,a.g))&&(b=this.n(b.u(e,c)));else{if(x(a.F,"We must at least have complete children"),x(!e.e(),"If the path were empty, we would have an event snap from the set"),c=c.Wa(e,a.F,a.g))f=a.F.u(e,c),f=this.n(f)}else if(a.o)(c=c.Kb())&&(b=this.X(this.n(c)));else if(a.F){x(!e.e(),"If the path was empty, we would have an event snap");g=J(e);if(a.F.$(g)){a=(b=c.ib.Kb(c.fb.B(g)))?this.Fa(a,g,b,
a.k,a.g,c,d):this.Fa(a,g,E,a.k,a.g,c,null);break a}x(1<O(e),"Must be a deep set being reverted")}a=new X(a.k,a.g,b,f)}else a=this.Ga(a,b.path,c,d);return a}throw ib("Unknown operation type: "+b.type);};function Of(a,b){Pf(a,b.k);Pf(a,b.g);Pf(a,b.o);Pf(a,b.F)}h.Te=function(a){return a};function Pf(a,b){x(!b||a.Ub(b),"Expected an indexed snap")}
h.lc=function(a,b,c,d,e){Of(this,a);return 1===O(b)&&".priority"!==J(b)?this.Fa(a,J(b),c,a.k,a.g,d,e):b.e()?(b=this.n(this.X(c)),new X(a.k,a.g,b,null)):a.o?(b=this.n(a.o.u(b,c)),new X(a.k,a.g,b,null)):1===O(b)?(x(".priority"===J(b),"This should be handled above"),d=a.F||this.X(E),b=this.n(d.w(J(b),c)),new X(a.k,a.g,null,b)):a.F?a.F.$(J(b))?new X(a.k,a.g,null,this.n(a.F.u(b,c))):a:a};
h.Yd=function(a,b,c,d,e){Of(this,a);if(a.o){var f=a.o;A(c,function(a,c){f=f.u(b.B(c),a)});if(b.e())return new X(a.k,a.g,this.n(f),null);c=J(b);var g=f.I(c);return this.Fa(a,c,g,a.k,a.g,d,e)}if(b.e()){var k=a.F||this.X(E);A(c,function(a,b){k=k.w(b,a)});return new X(a.k,a.g,null,this.n(k))}d=J(b);if(a.F&&a.F.$(d)){var l=a.F.P(b);A(c,function(a,b){l=l.w(b,a)});d=this.n(a.F.u(b,l));return new X(a.k,a.g,null,d)}return a};
h.Ga=function(a,b,c,d){var e=a.o,f=a.F,g;Of(this,a);if(a.k){x(e,"If we have a server snap, we must have an event snap");var k=c.Wa(b,a.o,a.k);if(k)if(b.e())e=this.n(this.X(k));else return g=J(b),b=e.u(b,k).I(g),this.Fa(a,g,b,a.k,a.g,c,d)}else if(a.g)if(e){var l=!1;a.g.ga(F,function(a,b){l||e.I(a).aa(b)||(l=!0);l&&(e=e.w(a,b))});l&&(e=this.n(e))}else if(f&&(x(0<O(b),"If it were an empty path, we would have an event snap"),g=J(b),1===O(b)||f.$(g))&&(k=c.Wa(b,f,a.g)))return b=f.u(b,k).I(g),this.Fa(a,
g,b,a.k,a.g,c,d);return new X(a.k,a.g,e,f)};
h.jb=function(a,b,c,d,e){var f;Of(this,a);var g=a.k,k=a.g;a.k?g=b.e()?this.n(this.X(c)):this.n(this.X(a.k.u(b,c))):b.e()?(g=this.n(this.X(c)),k=null):1!==O(b)||!a.g&&c.e()?a.g&&(f=J(b),a.g.$(f)&&(k=this.n(a.g.w(f,c)))):(k=a.g||this.X(E),k=this.n(k.u(b,c)));f=!1;var l=a.o,n=a.F;if(g!==a.k||k!==a.g)if(g&&!l)l=this.n(this.X(d.za(g))),n=null;else if(g&&l&&g.P(b).aa(l.P(b)))f=!0;else if(c=d.Wa(b,l,g||k))if(b.e())l=this.n(this.X(c)),n=null;else{f=J(b);b=Q(b);a:{l=f;if(a.o)l=a.o.I(l);else if(a.F)a.F.$(l)?
l=a.F.I(l):(x(b.e(),"According to precondition, this must be true"),l=E);else{if(b.e())break a;x(a.k||a.g,"If we do not have event data, we must have server data");l=(a.k||a.g).I(l)}c=l.u(b,c)}return this.Fa(a,f,c,g,k,d,e)}else f=!0;x(!f||l===a.o&&n===a.F,"We thought we could skip diffing, but we changed the eventCache.");return new X(g,k,l,n)};
h.Xd=function(a,b,c,d,e){if(!a.k&&!a.g&&b.e())return a;Of(this,a);var f=a.k,g=a.g;if(a.k)A(c,function(a,c){f=f.u(b.B(c),a)}),f=this.n(f);else if(b.e())g=a.g||this.X(E),A(c,function(a,b){g=g.w(b,a)}),g=this.n(g);else if(a.g&&a.g.$(J(b))){var k=a.g.P(b);A(c,function(a,b){k=k.w(b,a)});g=this.n(a.g.u(b,k))}var l=!1,n=a.o,r=a.F;if(f!==a.k||g!==a.g)if(f&&f.P(b).aa(n.P(b)))l=!0;else if(x(null!=n||null!=r,"We should have an event cache."),c=d.ae(b,c,n||r))if(b.e())n?n=this.n(this.X(c)):r=this.n(this.X(c));
else return l=J(b),n?n=n.u(b,c).I(l):(x(r,"If there was some server data, we must have event children"),n=r.u(b,c).I(l)),this.Fa(a,l,n,f,g,d,e);else l=!0;x(!l||n===a.o&&r===a.F,"We thought we could skip diffing, but we changed the eventCache.");return new X(f,g,n,r)};h.Fa=function(a,b,c,d,e){var f=a.o;a=a.F;f?f=this.n(f.w(b,c)):(a||(a=this.X(E)),a=this.n(a.w(b,c)));return new X(d,e,f,a)};h.n=function(a){return a};function Qf(a){this.ab=a;this.index=a.G;this.ab.wa&&m(Sb(this.ab))?(a=this.ab,x(a.wa,"Only valid if start has been set"),a=a.hc?a.Tb:"[MIN_NAME]",a=this.index.we(Sb(this.ab),a)):a=this.index.ye();this.Jd=a;this.ab.Ja&&m(Tb(this.ab))?(a=this.ab,x(a.Ja,"Only valid if end has been set"),a=a.tc?a.Qb:"[MAX_NAME]",a=this.index.we(Tb(this.ab),a)):a=this.index.xe();this.gd=a}oa(Qf,Kf);Qf.prototype.X=function(a){return a.hb(this.index)};Qf.prototype.Ub=function(a){return a.Ub(this.index)};
Qf.prototype.Te=function(a){return new X(a.k&&this.n(a.k.hb(this.index)),a.g&&this.n(a.g.hb(this.index)),a.o&&this.n(a.o.hb(this.index)),a.F&&this.n(a.F.hb(this.index)))};Qf.prototype.n=function(a){if(a.R())return E;for(var b=this.Jd,c=this.gd,d=Kb(this.index),e=a.Aa(this.index),f=T(e);f&&0<d(b,f);)a=a.w(f.name,E),f=T(e);e=a.rb(c,this.index);for((f=T(e))&&0>=d(f,c)&&(f=T(e));f;)a=a.w(f.name,E),f=T(e);return a};function Rf(a){Qf.call(this,a);this.Oa=!a.wa;this.wb=Vb(a)}oa(Rf,Qf);Rf.prototype.ya=function(a,b,c,d){if(b.type===Mf&&b.source.ke){var e=b.path,f=b.children,g=W(a);if(g&&e.e()&&ud(f,function(a,b){return g.$(b)})){var k;(b=c.za(d||a.k||a.g))?k=this.n(this.X(b)):(k=g||E,A(f,function(a,b){k=k.w(b,a)}),k=this.n(this.X(k)));return a.o?new X(a.k,a.g,k,null):new X(a.k,a.g,null,k)}}return Rf.Ne.ya.call(this,a,b,c,d)};
Rf.prototype.n=function(a){Pf(this,a);if(a.R())return E;var b,c,d;if(2*this.wb<a.Za())for(b=E.gb(a.Q()).hb(this.index),a=this.Oa?a.Ob(this.gd,this.index):a.rb(this.Jd,this.index),c=T(a),d=0;c&&d<this.wb;)b=b.w(c.name,c.L),d++,c=T(a);else{b=a;var e,f=Kb(this.index);if(this.Oa){a=a.cf(this.index);e=this.gd;var g=f,f=function(a,b){return-1*g(a,b)}}else a=a.Aa(this.index),e=this.Jd;d=0;for(c=T(a);c;)0>=f(e,c)&&d<this.wb?d++:b=b.w(c.name,E),c=T(a)}return b};
Rf.prototype.Fa=function(a,b,c,d,e,f,g){var k=W(a);return!k||k.Za()<this.wb?Rf.Ne.Fa.call(this,a,b,c,d,e,f,g):k.$(b)?(b=Sf(this,a,b,c,f,g))?a.o?new X(a.k,a.g,b,null):new X(a.k,a.g,null,b):a:c.e()?a:(b=Sf(this,a,b,c,f,g))?a.o?new X(a.k,a.g,b,null):new X(a.k,a.g,null,b):a};function Sf(a,b,c,d,e,f){var g=new C(c,d),k=Kb(a.index);return a.Oa?0>=k(g,a.gd)?Tf(a,b,c,d,e,f||b.k||b.g):null:0>=k(a.Jd,g)?Tf(a,b,c,d,e,f||b.k||b.g):null}
function Tf(a,b,c,d,e,f){var g=Kb(a.index),k;k=a.Oa?function(a,b){return-1*g(a,b)}:g;b=W(b);var l=new C(c,d),n=a.Oa?gd(b,a.index):hd(b,a.index);if(b.$(c)){a=e.be(f,n,1,a.Oa,".priority");if(0===a.length)return b.w(c,d);a=a[0];return!d.e()&&0<=k(a,l)?b.w(c,d):b.w(c,E).w(a.name,a.L)}return 0<=k(n,l)?b.w(c,d).w(n.name,E):null};function Uf(a){this.G=a}oa(Uf,Kf);Uf.prototype.X=function(a){return a.hb(this.G)};Uf.prototype.Ub=function(a){return a.Ub(this.G)};function Vf(a){this.Y=a;this.G=a.C.G}
function Wf(a,b,c,d){var e=[],f=a.G,g=Ma(La(b,function(a){return"child_changed"===a.type&&f.ef(a.Zf,a.Va)}),function(a){return new V("child_moved",a.Va,a.ob)}),k=Qa(b,function(a){return"child_removed"!==a.type&&"child_added"!==a.type});for(la(Sa,b,k,0).apply(null,g);0<b.length;){var g=b[0].type,k=Xf(b,g),l=b.slice(0,k);b=b.slice(k);"value"===g||"children_added"===g||"children_removed"===g?x(1===l.length,"We should not have more than one of these at a view"):Ua(l,q(a.Lf,a));e=e.concat(Yf(a,d,l,c))}return e}
function Xf(a,b){var c=Qa(a,function(a){return a.type!==b});return-1===c?a.length:c}
function Yf(a,b,c,d){for(var e=[],f=0;f<c.length;++f)for(var g=c[f],k=null,l=null,n=0;n<b.length;++n){var r=b[n];if(r.qf(g.type)){if(!k&&!l)if("children_added"===g.type){var s=a,y=g.Va,l=[];if(!y.R()&&!y.e())for(var s=y.Aa(s.G),y=null,P=T(s);P;){var se=new V("child_added",P.L,P.name);se.Mc=y;l.push(se);y=P.name;P=T(s)}}else if("children_removed"===g.type){if(s=a,y=g.Va,l=[],!y.R()&&!y.e())for(s=y.Aa(s.G),y=T(s);y;)l.push(new V("child_removed",y.L,y.name)),y=T(s)}else k=g,"value"!==k.type&&"child_removed"!==
k.type&&(k.Mc=d.bf(k.ob,k.Va,a.G));if(k)e.push(r.createEvent(k,a.Y));else for(s=0;s<l.length;++s)e.push(r.createEvent(l[s],a.Y))}}return e}Vf.prototype.Lf=function(a,b){if(null==a.ob||null==b.ob)throw ib("Should only compare child_ events.");return this.G.compare(new C(a.ob,a.Va),new C(b.ob,b.Va))};function Zf(a,b){this.Y=a;var c=a.C;Xb(c)?(this.$b=new Uf(c.G),this.ed=Ff):c.sa?(this.$b=new Rf(c),this.ed=new Jf(Vb(c),c.G,this.$b.Oa)):(this.$b=new Qf(c),this.ed=Ff);this.la=this.$b.Te(b);this.Ka=[];this.Ye=new Vf(a)}function $f(a){return a.Y}h=Zf.prototype;h.ma=function(){return this.la.ma()};h.e=function(){return 0===this.Ka.length};h.Fb=function(a){this.Ka.push(a)};
h.eb=function(a,b){var c=[];if(b){x(null==a,"A cancel should cancel all event registrations.");var d=this.Y.path;Ka(this.Ka,function(a){(a=a.Ue(b,d))&&c.push(a)})}if(a){for(var e=[],f=0;f<this.Ka.length;++f){var g=this.Ka[f];if(!g.matches(a))e.push(g);else if(a.df()){e=e.concat(this.Ka.slice(f+1));break}}this.Ka=e}else this.Ka=[];return c};
h.ya=function(a,b,c){a.type===Mf&&null!==a.source.Nc&&(x(this.la.ma(),"We should always have a full cache before handling merges"),x(!!this.la.o,"Missing event cache, even though we have a server cache"));var d=this.la;b=this.$b.ya(d,a,b,c);Of(this.$b,b);this.la=b;return W(b)!==W(d)?(a=Gf(this.ed,d,b,a.path),Wf(this.Ye,a,W(b),this.Ka)):[]};function X(a,b,c,d){this.k=a;this.g=b;this.o=c;this.F=d;x(null==a||null==b,"Only one of serverSnap / serverChildren can be non-null.");x(null==c||null==d,"Only one of eventSnap / eventChildren can be non-null.")}function W(a){return a.o||a.F}X.prototype.ma=function(){return this.k};var ag=new X(null,null,null,null);function bg(a,b){this.value=a;this.children=b||cg}var cg=new Gc(function(a,b){return a===b?0:a<b?-1:1}),dg=new bg(null);h=bg.prototype;h.e=function(){return null===this.value&&this.children.e()};function eg(a,b,c){if(null!=a.value&&c(a.value))return{path:R,value:a.value};if(b.e())return null;var d=J(b);a=a.children.get(d);return null!==a?(b=eg(a,Q(b),c),null!=b?{path:(new N(d)).B(b.path),value:b.value}:null):null}function fg(a,b){return eg(a,b,function(){return!0})}
h.subtree=function(a){if(a.e())return this;var b=this.children.get(J(a));return null!==b?b.subtree(Q(a)):dg};h.set=function(a,b){if(a.e())return new bg(b,this.children);var c=J(a),d=(this.children.get(c)||dg).set(Q(a),b),c=this.children.La(c,d);return new bg(this.value,c)};
h.remove=function(a){if(a.e())return this.children.e()?dg:new bg(null,this.children);var b=J(a),c=this.children.get(b);return c?(a=c.remove(Q(a)),b=a.e()?this.children.remove(b):this.children.La(b,a),null===this.value&&b.e()?dg:new bg(this.value,b)):this};h.get=function(a){if(a.e())return this.value;var b=this.children.get(J(a));return b?b.get(Q(a)):null};
function gg(a,b,c){if(b.e())return c;var d=J(b);b=gg(a.children.get(d)||dg,Q(b),c);d=b.e()?a.children.remove(d):a.children.La(d,b);return new bg(a.value,d)}function hg(a,b){return ig(a,R,b)}function ig(a,b,c){var d={};a.children.Ba(function(a,f){d[a]=ig(f,b.B(a),c)});return c(b,a.value,d)}function jg(a,b,c){return kg(a,b,R,c)}function kg(a,b,c,d){var e=a.value?d(c,a.value):!1;if(e)return e;if(b.e())return null;e=J(b);return(a=a.children.get(e))?kg(a,Q(b),c.B(e),d):null}
function lg(a,b,c){if(!b.e()){var d=!0;a.value&&(d=c(R,a.value));!0===d&&(d=J(b),(a=a.children.get(d))&&mg(a,Q(b),R.B(d),c))}}function mg(a,b,c,d){if(b.e())return a;a.value&&d(c,a.value);var e=J(b);return(a=a.children.get(e))?mg(a,Q(b),c.B(e),d):dg}function ng(a,b){og(a,R,b)}function og(a,b,c){a.children.Ba(function(a,e){og(e,b.B(a),c)});a.value&&c(b,a.value)}function pg(a,b){a.children.Ba(function(a,d){d.value&&b(a,d.value)})};function qg(){this.xa={}}h=qg.prototype;h.e=function(){return wd(this.xa)};h.ya=function(a,b,c){var d=a.source.Nc;if(null!==d)return d=u(this.xa,d),x(null!=d,"SyncTree gave us an op for an invalid query."),d.ya(a,b,c);var e=[];A(this.xa,function(d){e=e.concat(d.ya(a,b,c))});return e};h.Fb=function(a,b,c,d,e){var f=a.Da(),g=u(this.xa,f);g||(c=(g=c.za(d))?null:c.$d(e),d=new X(d,e,g,c),g=new Zf(a,d),this.xa[f]=g);g.Fb(b);a=g;(f=W(a.la))?(d=Gf(a.ed,ag,a.la,R),b=Wf(a.Ye,d,f,b?[b]:a.Ka)):b=[];return b};
h.eb=function(a,b,c){var d=a.Da(),e=[],f=[],g=null!=rg(this);if("default"===d){var k=this;A(this.xa,function(a,d){f=f.concat(a.eb(b,c));a.e()&&(delete k.xa[d],Xb(a.Y.C)||e.push(a.Y))})}else{var l=u(this.xa,d);l&&(f=f.concat(l.eb(b,c)),l.e()&&(delete this.xa[d],Xb(l.Y.C)||e.push(l.Y)))}g&&null==rg(this)&&e.push(new M(a.j,a.path));return{lg:e,Pf:f}};function sg(a){return La(sd(a.xa),function(a){return!Xb(a.Y.C)})}h.ma=function(a){var b=rg(this);return null!=b&&(b=b.ma())?b.P(a):null};
function tg(a,b){if(Xb(b.C))return rg(a);var c=b.Da();return u(a.xa,c)}function rg(a){return vd(a.xa,function(a){return Xb(a.Y.C)})||null};function ug(){this.V=dg;this.pa=[];this.zc=-1}
function vg(a,b){var c=Qa(a.pa,function(a){return a.Ud===b});x(0<=c,"removeWrite called with nonexistent writeId.");var d=a.pa[c];a.pa.splice(c,1);for(var e=!1,f=!1,g=!1,k=a.pa.length-1;!e&&0<=k;){var l=a.pa[k];k>=c&&wg(l,d.path)?e=!0:!f&&d.path.contains(l.path)&&(k>=c?f=!0:g=!0);k--}e||(f||g?xg(a):d.Qa?a.V=a.V.remove(d.path):A(d.children,function(b,c){a.V=a.V.remove(d.path.B(c))}));c=d.path;if(fg(a.V,c)){if(g)return c;x(e,"Must have found a shadow");return null}return c}h=ug.prototype;
h.Kb=function(a){var b=fg(this.V,a);if(b){var c=b.value;a=S(b.path,a);return c.P(a)}return null};
h.za=function(a,b,c,d){var e,f;if(c||d)return e=this.V.subtree(a),!d&&e.e()?b:d||null!==b||null!==e.value?(e=yg(this.pa,function(b){return(b.visible||d)&&(!c||!(0<=Ja(c,b.Ud)))&&(b.path.contains(a)||a.contains(b.path))},a),f=b||E,ng(e,function(a,b){f=f.u(a,b)}),f):null;if(e=fg(this.V,a))return b=S(e.path,a),e.value.P(b);e=this.V.subtree(a);return e.e()?b:b||e.value?(f=b||E,ng(e,function(a,b){f=f.u(a,b)}),f):null};
h.$d=function(a,b){var c=!1,d=E,e=this.Kb(a);if(e)return e.R()||e.ga(F,function(a,b){d=d.w(a,b)}),d;if(b)return d=b,pg(this.V.subtree(a),function(a,b){d=d.w(a,b)}),d;pg(this.V.subtree(a),function(a,b){c=!0;d=d.w(a,b)});return c?d:null};
h.Wa=function(a,b,c,d){x(c||d,"Either existingEventSnap or existingServerSnap must exist");a=a.B(b);if(fg(this.V,a))return null;a=this.V.subtree(a);if(a.e())return d.P(b);var e,f;c?(e=!1,f=c.P(b)):(e=!0,f=d.P(b));ng(a,function(a,b){e||f.P(a).aa(b)||(e=!0);e&&(f=f.u(a,b))});return e?f:null};
h.ae=function(a,b,c,d){x(d,"We should have an event cache already.");a=a.B(b);if(fg(this.V,a))return null;var e=d.P(b),f=!1,g=this.V.subtree(a);A(c,function(a,b){var c=new N(b),d=fg(g,c);if(d){var s=S(d.path,c),d=d.value.P(s);e=e.u(c,d)}else if(f=!0,d=g.subtree(c),d.e())e=e.u(c,a);else{var y=a;ng(d,function(a,b){y=y.u(a,b)});e=e.u(c,y)}});return f?e:null};
h.be=function(a,b,c,d,e,f){var g;a=this.V.subtree(a);a.value?g=a.value:b&&(g=b,ng(a,function(a,b){g=g.u(a,b)}));if(g){b=[];a=Kb(F);e=e?g.Ob(c,f):g.rb(c,f);for(f=T(e);f&&b.length<d;)0!==a(f,c)&&b.push(f),f=T(e);return b}return[]};function wg(a,b){return a.Qa?a.path.contains(b):!!ud(a.children,function(c,d){return a.path.B(d).contains(b)})}function xg(a){a.V=yg(a.pa,zg,R);a.zc=0<a.pa.length?a.pa[a.pa.length-1].Ud:-1}function zg(a){return a.visible}
function yg(a,b,c){for(var d=dg,e=0;e<a.length;++e){var f=a[e];if(b(f)){var g=f.path,k;f.Qa?(c.contains(g)?(k=S(c,g),f=f.Qa):(k=R,f=f.Qa.P(S(g,c))),d=Ag(d,k,f)):d=Bg(d,f.path,f.children)}}return d}function Ag(a,b,c){var d=fg(a,b);if(d){var e=d.value,d=d.path;b=S(d,b);c=e.u(b,c);a=gg(a,d,new bg(c))}else a=gg(a,b,new bg(c));return a}
function Bg(a,b,c){var d=fg(a,b);if(d){var e=d.value,d=d.path,f=S(d,b),g=e;A(c,function(a,b){g=g.u(f.B(b),a)});a=gg(a,d,new bg(g))}else A(c,function(c,d){a=gg(a,b.B(d),new bg(c))});return a}function Cg(a,b){this.fb=a;this.ib=b}h=Cg.prototype;h.Kb=function(){return this.ib.Kb(this.fb)};h.za=function(a,b,c){return this.ib.za(this.fb,a,b,c)};h.$d=function(a){return this.ib.$d(this.fb,a)};h.Wa=function(a,b,c){return this.ib.Wa(this.fb,a,b,c)};h.ae=function(a,b,c){return this.ib.ae(this.fb,a,b,c)};
h.be=function(a,b,c,d,e){return this.ib.be(this.fb,a,b,c,d,e)};h.B=function(a){return new Cg(this.fb.B(a),this.ib)};function Dg(a,b,c){this.type=Lf;this.source=a;this.path=b;this.Qa=c}Dg.prototype.yd=function(a){return this.path.e()?new Dg(this.source,R,this.Qa.I(a)):new Dg(this.source,Q(this.path),this.Qa)};function Eg(a,b){this.type=Nf;this.source=Fg;this.path=a;this.tf=b}Eg.prototype.yd=function(){return this.path.e()?this:new Eg(Q(this.path),this.tf)};function Gg(a,b,c){this.type=Mf;this.source=a;this.path=b;this.children=c}Gg.prototype.yd=function(a){return this.path.e()?(a=u(this.children,a))?new Dg(this.source,R,a):null:new Gg(this.source,Q(this.path),this.children)};var Lf=0,Mf=1,Nf=2;function Hg(a,b,c){this.ke=a;this.af=b;this.Nc=c}var Fg=new Hg(!0,!1,null),Ig=new Hg(!1,!0,null);function Jg(a){this.ja=dg;this.bb=new ug;this.Nd={};this.ac={};this.Ac=a}h=Jg.prototype;h.lc=function(a,b,c,d){var e=this.bb,f=d;x(c>e.zc,"Stacking an older write on top of newer ones");m(f)||(f=!0);e.pa.push({path:a,Qa:b,Ud:c,visible:f});f&&(e.V=Ag(e.V,a,b));e.zc=c;return d?Kg(this,new Dg(Fg,a,b)):[]};h.Yd=function(a,b,c){var d=this.bb;x(c>d.zc,"Stacking an older merge on top of newer ones");d.pa.push({path:a,children:b,Ud:c,visible:!0});d.V=Bg(d.V,a,b);d.zc=c;return Kg(this,new Gg(Fg,a,b))};
h.Ga=function(a,b){b=b||!1;var c=vg(this.bb,a);return null==c?[]:Kg(this,new Eg(c,b))};h.jb=function(a,b){return Kg(this,new Dg(Ig,a,b))};h.Xd=function(a,b){return Kg(this,new Gg(Ig,a,b))};function Lg(a,b,c,d){d=xd(a.Nd,"_"+d);if(null!=d){var e=Mg(d);d=e.path;var e=e.Nc,f=a.ja.get(d);x(f,"Missing sync point for query tag that we're tracking");b=S(d,b);return f.ya(new Dg(new Hg(!1,!0,e),b,c),new Cg(d,a.bb),null)}return[]}
function Ng(a,b,c,d){if(d=xd(a.Nd,"_"+d)){var e=Mg(d);d=e.path;var e=e.Nc,f=a.ja.get(d);x(f,"Missing sync point for query tag that we're tracking");b=S(d,b);return f.ya(new Gg(new Hg(!1,!0,e),b,c),new Cg(d,a.bb),null)}return[]}
h.Fb=function(a,b){var c=a.path,d=null,e=!1;lg(this.ja,c,function(a,b){var f=S(a,c);d=b.ma(f);e=e||null!=rg(b);return!d});var f=this.ja.get(c);f?(e=e||null!=rg(f),d=d||f.ma(R)):(f=new qg,this.ja=this.ja.set(c,f));var g=null;if(!d){var k=!1,g=E;pg(this.ja.subtree(c),function(a,b){var c=b.ma(R);c&&(k=!0,g=g.w(a,c))});k||(g=null)}var l=null!=tg(f,a);if(!l&&!Xb(a.C)){var n=Og(a);x(!(n in this.ac),"View does not exist, but we have a tag");var r=Pg++;this.ac[n]=r;this.Nd["_"+r]=n}n=f.Fb(a,b,new Cg(c,this.bb),
d,g);l||e||(f=tg(f,a),n=n.concat(Qg(this,a,f)));return n};
h.eb=function(a,b,c){var d=a.path,e=this.ja.get(d),f=[];if(e&&("default"===a.Da()||null!=tg(e,a))){f=e.eb(a,b,c);e.e()&&(this.ja=this.ja.remove(d));e=f.lg;f=f.Pf;b=-1!==Qa(e,function(a){return Xb(a.C)});var g=jg(this.ja,d,function(a,b){return null!=rg(b)});if(b&&!g&&(d=this.ja.subtree(d),!d.e()))for(var d=Rg(d),k=0;k<d.length;++k){var l=d[k],n=l.Y,l=Sg(this,l);this.Ac.Je(n,Tg(this,n),l.ld,l.M)}if(!g&&0<e.length&&!c)if(b)this.Ac.Ld(a,null);else{var r=this;Ka(e,function(a){a.Da();var b=r.ac[Og(a)];
r.Ac.Ld(a,b)})}Ug(this,e)}return f};h.za=function(a,b){var c=this.bb;return jg(this.ja,a,function(d,e){var f=S(d,a),f=e.ma(f);return c.za(a,f,b,!0)})};function Rg(a){return hg(a,function(a,c,d){if(c&&null!=rg(c))return[rg(c)];var e=[];c&&(e=sg(c));A(d,function(a){e=e.concat(a)});return e})}function Ug(a,b){for(var c=0;c<b.length;++c){var d=b[c];if(!Xb(d.C)){var d=Og(d),e=a.ac[d];delete a.ac[d];delete a.Nd["_"+e]}}}
function Qg(a,b,c){var d=b.path,e=Tg(a,b);c=Sg(a,c);b=a.Ac.Je(b,e,c.ld,c.M);d=a.ja.subtree(d);if(e)x(null==rg(d.value),"If we're adding a query, it shouldn't be shadowed");else for(e=hg(d,function(a,b,c){if(!a.e()&&b&&null!=rg(b))return[$f(rg(b))];var d=[];b&&(d=d.concat(Ma(sg(b),function(a){return a.Y})));A(c,function(a){d=d.concat(a)});return d}),d=0;d<e.length;++d)c=e[d],a.Ac.Ld(c,Tg(a,c));return b}
function Sg(a,b){var c=b.Y,d=Tg(a,c);return{ld:function(){return(b.ma()||E).hash()},M:function(e,f){if("ok"===e){if(f&&"object"===typeof f&&t(f,"w")){var g=u(f,"w");ea(g)&&0<=Ja(g,"no_index")&&z("Using an unspecified index. Consider adding "+('".indexOn": "'+c.C.G.toString()+'"')+" at "+c.path.toString()+" to your security rules for better performance")}g=b.ma()||E;return d?Lg(a,c.path,g,d):a.jb(c.path,g)}g="Unknown Error";"too_big"===e?g="The data requested exceeds the maximum size that can be accessed with a single request.":
"permission_denied"==e?g="Client doesn't have permission to access the desired data.":"unavailable"==e&&(g="The service is unavailable");g=Error(e+": "+g);g.code=e.toUpperCase();return a.eb(c,null,g)}}}function Og(a){return a.path.toString()+"$"+a.Da()}function Mg(a){var b=a.indexOf("$");x(-1!==b&&b<a.length-1,"Bad queryKey.");return{Nc:a.substr(b+1),path:new N(a.substr(0,b))}}function Tg(a,b){var c=Og(b);return u(a.ac,c)}var Pg=1;function Kg(a,b){return Vg(a,b,a.ja,null,new Cg(R,a.bb))}
function Vg(a,b,c,d,e){if(b.path.e())return Wg(a,b,c,d,e);var f=c.get(R);null==d&&null!=f&&(d=f.ma(R));var g=[],k=J(b.path),l=b.yd(k);if((c=c.children.get(k))&&l)var n=d?d.I(k):null,k=e.B(k),g=g.concat(Vg(a,l,c,n,k));f&&(g=g.concat(f.ya(b,e,d)));return g}function Wg(a,b,c,d,e){var f=c.get(R);null==d&&null!=f&&(d=f.ma(R));var g=[];c.children.Ba(function(c,f){var n=d?d.I(c):null,r=e.B(c),s=b.yd(c);s&&(g=g.concat(Wg(a,s,f,n,r)))});f&&(g=g.concat(f.ya(b,e,d)));return g};function Xg(a){this.S=a;this.Ea=Gd(a);this.ba=new Oe;this.ud=1;this.U=new te(this.S,q(this.xd,this),q(this.vd,this),q(this.Ce,this));this.wf=Hd(a,q(function(){return new Dd(this.Ea,this.U)},this));this.ic=new Ac;this.oe=new Ne;var b=this;this.pd=new Jg({Je:function(a,d,e,f){d=[];e=b.oe.Sc.P(a.path);e.e()||(d=b.pd.jb(a.path,e),setTimeout(function(){f("ok")},0));return d},Ld:ba});Yg(this,"connected",!1);this.ha=new Ke;this.W=new of(a,q(this.U.W,this.U),q(this.U.Pe,this.U),q(this.ze,this));this.cd=0;
this.pe=null;this.N=new Jg({Je:function(a,d,e,f){xe(b.U,a,e,d,function(d,e){var l=f(d,e);Se(b.ba,a.path,l)});return[]},Ld:function(a,d){var e=b.U,f=a.path.toString(),g=a.Da();e.f("Unlisten called for "+f+" "+g);if(ze(e,f,g)&&e.fa){var k=yc(a);e.f("Unlisten on "+f+" for "+g);f={p:f};d&&(f.q=k,f.t=d);e.va("n",f)}}})}h=Xg.prototype;h.toString=function(){return(this.S.Cb?"https://":"http://")+this.S.host};h.name=function(){return this.S.zb};
function Zg(a){var b=new N(".info/serverTimeOffset");a=a.oe.Sc.P(b).O()||0;return(new Date).getTime()+a}function $g(a){a=a={timestamp:Zg(a)};a.timestamp=a.timestamp||(new Date).getTime();return a}h.xd=function(a,b,c,d){this.cd++;var e=new N(a);b=this.pe?this.pe(a,b):b;a=[];d?c?(b=ad(b,function(a){return D(a)}),a=Ng(this.N,e,b,d)):(b=D(b),a=Lg(this.N,e,b,d)):c?(d=ad(b,function(a){return D(a)}),a=this.N.Xd(e,d)):(d=D(b),a=this.N.jb(e,d));d=e;0<a.length&&(d=ah(this,e));Se(this.ba,d,a)};
h.vd=function(a){Yg(this,"connected",a);!1===a&&bh(this)};h.Ce=function(a){var b=this;Cb(a,function(a,d){Yg(b,d,a)})};h.ze=function(a){Yg(this,"authenticated",a)};function Yg(a,b,c){b=new N("/.info/"+b);c=D(c);var d=a.oe;d.Sc=d.Sc.u(b,c);c=a.pd.jb(b,c);Se(a.ba,b,c)}
h.Db=function(a,b,c,d){this.f("set",{path:a.toString(),value:b,Cg:c});var e=$g(this);b=D(b,c);var e=Df(b,e),f=this.ud++,e=this.N.lc(a,e,f,!0);Pe(this.ba,e);var g=this;this.U.put(a.toString(),b.O(!0),function(b,c){var e="ok"===b;e||z("set at "+a+" failed: "+b);e=g.N.Ga(f,!e);Se(g.ba,a,e);ch(d,b,c)});e=dh(this,a);ah(this,e);Se(this.ba,e,[])};
h.update=function(a,b,c){this.f("update",{path:a.toString(),value:b});var d=!0,e=$g(this),f={};A(b,function(a,b){d=!1;var c=D(a);f[b]=Df(c,e)});if(d)kb("update() called with empty data.  Don't do anything."),ch(c,"ok");else{var g=this.ud++,k=this.N.Yd(a,f,g);Pe(this.ba,k);var l=this;Fe(this.U,a.toString(),b,function(b,d){x("ok"===b||"permission_denied"===b,"merge at "+a+" failed.");var e="ok"===b;e||z("update at "+a+" failed: "+b);var e=l.N.Ga(g,!e),f=a;0<e.length&&(f=ah(l,a));Se(l.ba,f,e);ch(c,b,
d)});b=dh(this,a);ah(this,b);Se(this.ba,a,[])}};function bh(a){a.f("onDisconnectEvents");var b=$g(a),c=[];Me(Cf(a.ha,b),R,function(b,e){c=c.concat(a.N.jb(b,e));var f=dh(a,b);ah(a,f)});a.ha=new Ke;Se(a.ba,R,c)}h.Ae=function(a,b){var c=this;this.U.Ae(a.toString(),function(d,e){"ok"===d&&Le(c.ha,a);ch(b,d,e)})};function eh(a,b,c,d){var e=D(c);Be(a.U,b.toString(),e.O(!0),function(c,g){"ok"===c&&a.ha.cc(b,e);ch(d,c,g)})}
function fh(a,b,c,d,e){var f=D(c,d);Be(a.U,b.toString(),f.O(!0),function(c,d){"ok"===c&&a.ha.cc(b,f);ch(e,c,d)})}function gh(a,b,c,d){var e=!0,f;for(f in c)e=!1;e?(kb("onDisconnect().update() called with empty data.  Don't do anything."),ch(d,"ok")):De(a.U,b.toString(),c,function(e,f){if("ok"===e)for(var l in c){var n=D(c[l]);a.ha.cc(b.B(l),n)}ch(d,e,f)})}function hh(a){Bd(a.Ea,"deprecated_on_disconnect");a.wf.Me.deprecated_on_disconnect=!0}
function wc(a,b,c){c=".info"===J(b.path)?a.pd.Fb(b,c):a.N.Fb(b,c);xc(a.ba,b.path,c)}h.tb=function(){this.U.tb()};h.ec=function(){this.U.ec()};h.Ke=function(a){if("undefined"!==typeof console){a?(this.Kd||(this.Kd=new Cd(this.Ea)),a=this.Kd.get()):a=this.Ea.get();var b=Na(td(a),function(a,b){return Math.max(b.length,a)},0),c;for(c in a){for(var d=a[c],e=c.length;e<b+2;e++)c+=" ";console.log(c+d)}}};h.Le=function(a){Bd(this.Ea,a);this.wf.Me[a]=!0};h.f=function(a){kb("r:"+this.U.id+":",arguments)};
function ch(a,b,c){a&&Fb(function(){if("ok"==b)a(null,c);else{var d=(b||"error").toUpperCase(),e=d;c&&(e+=": "+c);e=Error(e);e.code=d;a(e)}})};function ih(a,b,c,d,e){function f(){}a.f("transaction on "+b);var g=new M(a,b);g.Ab("value",f);c={path:b,update:c,M:d,status:null,mf:hb(),Qe:e,sf:0,Td:function(){g.Yb("value",f)},Vd:null,qa:null,bd:null,rc:null};d=a.N.za(b,void 0)||E;c.bd=d;d=c.update(d.O());if(m(d)){cc("transaction failed: Data returned ",d);c.status=1;e=Bc(a.ic,b);var k=e.ra()||[];k.push(c);Cc(e,k);"object"===typeof d&&null!==d&&t(d,".priority")?(k=d[".priority"],x(null===k||"number"===typeof k||"string"===typeof k,"Invalid priority returned by transaction.")):
k=(a.N.za(b)||E).Q().O();e=$g(a);d=D(d,k);d=Df(d,e);c.rc=d;c.qa=a.ud++;c=a.N.lc(b,d,c.qa,c.Qe);Se(a.ba,b,c);jh(a)}else c.Td(),c.rc=null,c.M&&(a=new K(c.bd,new M(a,c.path),F),c.M(null,!1,a))}function jh(a,b){var c=b||a.ic;b||kh(a,c);if(null!==c.ra()){var d=lh(a,c);x(0<d.length,"Sending zero length transaction queue");Oa(d,function(a){return 1===a.status})&&mh(a,c.path(),d)}else c.kd()&&c.ga(function(b){jh(a,b)})}
function mh(a,b,c){for(var d=Ma(c,function(a){return a.qa}),e=a.N.za(b,d)||E,d=e,e=e.hash(),f=0;f<c.length;f++){var g=c[f];x(1===g.status,"tryToSendTransactionQueue_: items in queue should all be run.");g.status=2;g.sf++;var k=S(b,g.path),d=d.u(k,g.rc)}d=d.O(!0);a.U.put(b.toString(),d,function(d){a.f("transaction put response",{path:b.toString(),status:d});var e=[];if("ok"===d){d=[];for(f=0;f<c.length;f++){c[f].status=3;e=e.concat(a.N.Ga(c[f].qa));if(c[f].M){var g=c[f].rc,k=new M(a,c[f].path);d.push(q(c[f].M,
null,null,!0,new K(g,k,F)))}c[f].Td()}kh(a,Bc(a.ic,b));jh(a);Se(a.ba,b,e);for(f=0;f<d.length;f++)Fb(d[f])}else{if("datastale"===d)for(f=0;f<c.length;f++)c[f].status=4===c[f].status?5:1;else for(z("transaction at "+b.toString()+" failed: "+d),f=0;f<c.length;f++)c[f].status=5,c[f].Vd=d;ah(a,b)}},e)}function ah(a,b){var c=nh(a,b),d=c.path(),c=lh(a,c);oh(a,c,d);return d}
function oh(a,b,c){if(0!==b.length){for(var d=[],e=[],f=Ma(b,function(a){return a.qa}),g=0;g<b.length;g++){var k=b[g],l=S(c,k.path),n=!1,r;x(null!==l,"rerunTransactionsUnderNode_: relativePath should not be null.");if(5===k.status)n=!0,r=k.Vd,e=e.concat(a.N.Ga(k.qa,!0));else if(1===k.status)if(25<=k.sf)n=!0,r="maxretry",e=e.concat(a.N.Ga(k.qa,!0));else{var s=a.N.za(k.path,f)||E;k.bd=s;var y=b[g].update(s.O());m(y)?(cc("transaction failed: Data returned ",y),l=D(y),"object"===typeof y&&null!=y&&t(y,
".priority")||(l=l.gb(s.Q())),s=k.qa,k.rc=l,k.qa=a.ud++,Ra(f,s),e=e.concat(a.N.lc(k.path,l,k.qa,k.Qe)),e=e.concat(a.N.Ga(s,!0))):(n=!0,r="nodata",e=e.concat(a.N.Ga(k.qa,!0)))}Se(a.ba,c,e);e=[];n&&(b[g].status=3,setTimeout(b[g].Td,Math.floor(0)),b[g].M&&("nodata"===r?(k=new M(a,b[g].path),d.push(q(b[g].M,null,null,!1,new K(b[g].bd,k,F)))):d.push(q(b[g].M,null,Error(r),!1,null))))}kh(a,a.ic);for(g=0;g<d.length;g++)Fb(d[g]);jh(a)}}
function nh(a,b){for(var c,d=a.ic;null!==(c=J(b))&&null===d.ra();)d=Bc(d,c),b=Q(b);return d}function lh(a,b){var c=[];ph(a,b,c);c.sort(function(a,b){return a.mf-b.mf});return c}function ph(a,b,c){var d=b.ra();if(null!==d)for(var e=0;e<d.length;e++)c.push(d[e]);b.ga(function(b){ph(a,b,c)})}function kh(a,b){var c=b.ra();if(c){for(var d=0,e=0;e<c.length;e++)3!==c[e].status&&(c[d]=c[e],d++);c.length=d;Cc(b,0<c.length?c:null)}b.ga(function(b){kh(a,b)})}
function dh(a,b){var c=nh(a,b).path(),d=Bc(a.ic,b);Fc(d,function(b){qh(a,b)});qh(a,d);Ec(d,function(b){qh(a,b)});return c}
function qh(a,b){var c=b.ra();if(null!==c){for(var d=[],e=[],f=-1,g=0;g<c.length;g++)4!==c[g].status&&(2===c[g].status?(x(f===g-1,"All SENT items should be at beginning of queue."),f=g,c[g].status=4,c[g].Vd="set"):(x(1===c[g].status,"Unexpected transaction status in abort"),c[g].Td(),e=e.concat(a.N.Ga(c[g].qa,!0)),c[g].M&&d.push(q(c[g].M,null,Error("set"),!1,null))));-1===f?Cc(b,null):c.length=f+1;Se(a.ba,b.path(),e);for(g=0;g<d.length;g++)Fb(d[g])}};function rh(){this.dc={}}ca(rh);rh.prototype.tb=function(){for(var a in this.dc)this.dc[a].tb()};rh.prototype.interrupt=rh.prototype.tb;rh.prototype.ec=function(){for(var a in this.dc)this.dc[a].ec()};rh.prototype.resume=rh.prototype.ec;function sh(a){var b=this;this.nc=a;this.Od="*";ff()?this.Cc=this.nd=Ye():(this.Cc=window.opener,this.nd=window);if(!b.Cc)throw"Unable to find relay frame";Ze(this.nd,"message",q(this.Zb,this));Ze(this.nd,"message",q(this.jf,this));try{th(this,{a:"ready"})}catch(c){Ze(this.Cc,"load",function(){th(b,{a:"ready"})})}Ze(window,"unload",q(this.dg,this))}function th(a,b){b=v(b);ff()?a.Cc.doPost(b,a.Od):a.Cc.postMessage(b,a.Od)}
sh.prototype.Zb=function(a){var b=this,c;try{c=sa(a.data)}catch(d){}c&&"request"===c.a&&($e(window,"message",this.Zb),this.Od=a.origin,this.nc&&setTimeout(function(){b.nc(b.Od,c.d,function(a,c){b.If=!c;b.nc=void 0;th(b,{a:"response",d:a,forceKeepWindowOpen:c})})},0))};sh.prototype.dg=function(){try{$e(this.nd,"message",this.jf)}catch(a){}this.nc&&(th(this,{a:"error",d:"unknown closed window"}),this.nc=void 0);try{window.close()}catch(b){}};sh.prototype.jf=function(a){if(this.If&&"die"===a.data)try{window.close()}catch(b){}};var Y={Qf:function(){Td=Kd=!0}};Y.forceLongPolling=Y.Qf;Y.Rf=function(){Ud=!0};Y.forceWebSockets=Y.Rf;Y.rg=function(a,b){a.j.U.Ie=b};Y.setSecurityDebugCallback=Y.rg;Y.Ke=function(a,b){a.j.Ke(b)};Y.stats=Y.Ke;Y.Le=function(a,b){a.j.Le(b)};Y.statsIncrementCounter=Y.Le;Y.cd=function(a){return a.j.cd};Y.dataUpdateCount=Y.cd;Y.Uf=function(a,b){a.j.pe=b};Y.interceptServerData=Y.Uf;Y.ag=function(a){new sh(a)};Y.onPopupOpen=Y.ag;Y.og=function(a){Te=a};Y.setAuthenticationServer=Y.og;function Z(a,b){this.Oc=a;this.Ca=b}Z.prototype.cancel=function(a){G("Firebase.onDisconnect().cancel",0,1,arguments.length);I("Firebase.onDisconnect().cancel",1,a,!0);this.Oc.Ae(this.Ca,a||null)};Z.prototype.cancel=Z.prototype.cancel;Z.prototype.remove=function(a){G("Firebase.onDisconnect().remove",0,1,arguments.length);jc("Firebase.onDisconnect().remove",this.Ca);I("Firebase.onDisconnect().remove",1,a,!0);eh(this.Oc,this.Ca,null,a)};Z.prototype.remove=Z.prototype.remove;
Z.prototype.set=function(a,b){G("Firebase.onDisconnect().set",1,2,arguments.length);jc("Firebase.onDisconnect().set",this.Ca);bc("Firebase.onDisconnect().set",a,!1);I("Firebase.onDisconnect().set",2,b,!0);eh(this.Oc,this.Ca,a,b)};Z.prototype.set=Z.prototype.set;
Z.prototype.Db=function(a,b,c){G("Firebase.onDisconnect().setWithPriority",2,3,arguments.length);jc("Firebase.onDisconnect().setWithPriority",this.Ca);bc("Firebase.onDisconnect().setWithPriority",a,!1);fc("Firebase.onDisconnect().setWithPriority",2,b,!1);I("Firebase.onDisconnect().setWithPriority",3,c,!0);fh(this.Oc,this.Ca,a,b,c)};Z.prototype.setWithPriority=Z.prototype.Db;
Z.prototype.update=function(a,b){G("Firebase.onDisconnect().update",1,2,arguments.length);jc("Firebase.onDisconnect().update",this.Ca);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;z("Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}ec("Firebase.onDisconnect().update",a);I("Firebase.onDisconnect().update",2,b,!0);gh(this.Oc,
this.Ca,a,b)};Z.prototype.update=Z.prototype.update;var $={};$.kc=te;$.DataConnection=$.kc;te.prototype.tg=function(a,b){this.va("q",{p:a},b)};$.kc.prototype.simpleListen=$.kc.prototype.tg;te.prototype.Nf=function(a,b){this.va("echo",{d:a},b)};$.kc.prototype.echo=$.kc.prototype.Nf;te.prototype.interrupt=te.prototype.tb;$.zf=de;$.RealTimeConnection=$.zf;de.prototype.sendRequest=de.prototype.va;de.prototype.close=de.prototype.close;
$.Tf=function(a){var b=te.prototype.put;te.prototype.put=function(c,d,e,f){m(f)&&(f=a());b.call(this,c,d,e,f)};return function(){te.prototype.put=b}};$.hijackHash=$.Tf;$.yf=xa;$.ConnectionTarget=$.yf;$.Da=function(a){return a.Da()};$.queryIdentifier=$.Da;$.Vf=function(a){return a.j.U.ta};$.listens=$.Vf;var uh=function(){var a=0,b=[];return function(c){var d=c===a;a=c;for(var e=Array(8),f=7;0<=f;f--)e[f]="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c%64),c=Math.floor(c/64);x(0===c,"Cannot push at time == 0");c=e.join("");if(d){for(f=11;0<=f&&63===b[f];f--)b[f]=0;b[f]++}else for(f=0;12>f;f++)b[f]=Math.floor(64*Math.random());for(f=0;12>f;f++)c+="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);x(20===c.length,"NextPushId: Length should be 20.");
return c}}();function M(a,b){var c,d,e;if(a instanceof Xg)c=a,d=b;else{G("new Firebase",1,2,arguments.length);d=ub(arguments[0]);c=d.ug;"firebase"===d.domain&&tb(d.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead");c||tb("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com");d.Cb||"undefined"!==typeof window&&window.location&&window.location.protocol&&-1!==window.location.protocol.indexOf("https:")&&z("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");
c=new xa(d.host,d.Cb,c,"ws"===d.scheme||"wss"===d.scheme);d=new N(d.Kc);e=d.toString();var f;!(f=!p(c.host)||0===c.host.length||!ac(c.zb))&&(f=0!==e.length)&&(e&&(e=e.replace(/^\/*\.info(\/|$)/,"/")),f=!(p(e)&&0!==e.length&&!$b.test(e)));if(f)throw Error(H("new Firebase",1,!1)+'must be a valid firebase URL and the path can\'t contain ".", "#", "$", "[", or "]".');if(b)if(b instanceof rh)e=b;else if(p(b))e=rh.Mb(),c.Cd=b;else throw Error("Expected a valid Firebase.Context for second argument to new Firebase()");
else e=rh.Mb();f=c.toString();var g=u(e.dc,f);g||(g=new Xg(c),e.dc[f]=g);c=g}L.call(this,c,d,Rb)}oa(M,L);na("Firebase",M);M.prototype.name=function(){G("Firebase.name",0,0,arguments.length);var a;this.path.e()?a=null:(a=this.path,a=a.da<a.A.length?a.A[a.A.length-1]:null);return a};M.prototype.name=M.prototype.name;
M.prototype.B=function(a){G("Firebase.child",1,1,arguments.length);if(ga(a))a=String(a);else if(!(a instanceof N))if(null===J(this.path)){var b=a;b&&(b=b.replace(/^\/*\.info(\/|$)/,"/"));ic("Firebase.child",b)}else ic("Firebase.child",a);return new M(this.j,this.path.B(a))};M.prototype.child=M.prototype.B;M.prototype.parent=function(){G("Firebase.parent",0,0,arguments.length);var a=this.path.parent();return null===a?null:new M(this.j,a)};M.prototype.parent=M.prototype.parent;
M.prototype.root=function(){G("Firebase.ref",0,0,arguments.length);for(var a=this;null!==a.parent();)a=a.parent();return a};M.prototype.root=M.prototype.root;M.prototype.toString=function(){G("Firebase.toString",0,0,arguments.length);var a;if(null===this.parent())a=this.j.toString();else{a=this.parent().toString()+"/";var b=this.name();a+=encodeURIComponent(String(b))}return a};M.prototype.toString=M.prototype.toString;
M.prototype.set=function(a,b){G("Firebase.set",1,2,arguments.length);jc("Firebase.set",this.path);bc("Firebase.set",a,!1);I("Firebase.set",2,b,!0);this.j.Db(this.path,a,null,b||null)};M.prototype.set=M.prototype.set;
M.prototype.update=function(a,b){G("Firebase.update",1,2,arguments.length);jc("Firebase.update",this.path);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;z("Passing an Array to Firebase.update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}ec("Firebase.update",a);I("Firebase.update",2,b,!0);if(t(a,".priority"))throw Error("update() does not currently support updating .priority.");
this.j.update(this.path,a,b||null)};M.prototype.update=M.prototype.update;M.prototype.Db=function(a,b,c){G("Firebase.setWithPriority",2,3,arguments.length);jc("Firebase.setWithPriority",this.path);bc("Firebase.setWithPriority",a,!1);fc("Firebase.setWithPriority",2,b,!1);I("Firebase.setWithPriority",3,c,!0);if(".length"===this.name()||".keys"===this.name())throw"Firebase.setWithPriority failed: "+this.name()+" is a read-only object.";this.j.Db(this.path,a,b,c||null)};M.prototype.setWithPriority=M.prototype.Db;
M.prototype.remove=function(a){G("Firebase.remove",0,1,arguments.length);jc("Firebase.remove",this.path);I("Firebase.remove",1,a,!0);this.set(null,a)};M.prototype.remove=M.prototype.remove;
M.prototype.transaction=function(a,b,c){G("Firebase.transaction",1,3,arguments.length);jc("Firebase.transaction",this.path);I("Firebase.transaction",1,a,!1);I("Firebase.transaction",2,b,!0);if(m(c)&&"boolean"!=typeof c)throw Error(H("Firebase.transaction",3,!0)+"must be a boolean.");if(".length"===this.name()||".keys"===this.name())throw"Firebase.transaction failed: "+this.name()+" is a read-only object.";"undefined"===typeof c&&(c=!0);ih(this.j,this.path,a,b||null,c)};M.prototype.transaction=M.prototype.transaction;
M.prototype.qg=function(a,b){G("Firebase.setPriority",1,2,arguments.length);jc("Firebase.setPriority",this.path);fc("Firebase.setPriority",1,a,!1);I("Firebase.setPriority",2,b,!0);this.j.Db(this.path.B(".priority"),a,null,b)};M.prototype.setPriority=M.prototype.qg;M.prototype.push=function(a,b){G("Firebase.push",0,2,arguments.length);jc("Firebase.push",this.path);bc("Firebase.push",a,!0);I("Firebase.push",2,b,!0);var c=Zg(this.j),c=uh(c),c=this.B(c);"undefined"!==typeof a&&null!==a&&c.set(a,b);return c};
M.prototype.push=M.prototype.push;M.prototype.Na=function(){jc("Firebase.onDisconnect",this.path);return new Z(this.j,this.path)};M.prototype.onDisconnect=M.prototype.Na;M.prototype.kg=function(){z("FirebaseRef.removeOnDisconnect() being deprecated. Please use FirebaseRef.onDisconnect().remove() instead.");this.Na().remove();hh(this.j)};M.prototype.removeOnDisconnect=M.prototype.kg;
M.prototype.pg=function(a){z("FirebaseRef.setOnDisconnect(value) being deprecated. Please use FirebaseRef.onDisconnect().set(value) instead.");this.Na().set(a);hh(this.j)};M.prototype.setOnDisconnect=M.prototype.pg;M.prototype.W=function(a,b,c){z("FirebaseRef.auth() being deprecated. Please use FirebaseRef.authWithCustomToken() instead.");G("Firebase.auth",1,3,arguments.length);kc("Firebase.auth",a);I("Firebase.auth",2,b,!0);I("Firebase.auth",3,b,!0);uf(this.j.W,a,{},{remember:"none"},b,c)};
M.prototype.auth=M.prototype.W;M.prototype.Pe=function(a){G("Firebase.unauth",0,1,arguments.length);I("Firebase.unauth",1,a,!0);vf(this.j.W,a)};M.prototype.unauth=M.prototype.Pe;M.prototype.le=function(){G("Firebase.getAuth",0,0,arguments.length);return this.j.W.le()};M.prototype.getAuth=M.prototype.le;M.prototype.$f=function(a,b){G("Firebase.onAuth",1,2,arguments.length);I("Firebase.onAuth",1,a,!1);Yb("Firebase.onAuth",2,b);this.j.W.Ab("auth_status",a,b)};M.prototype.onAuth=M.prototype.$f;
M.prototype.Yf=function(a,b){G("Firebase.offAuth",1,2,arguments.length);I("Firebase.offAuth",1,a,!1);Yb("Firebase.offAuth",2,b);this.j.W.Yb("auth_status",a,b)};M.prototype.offAuth=M.prototype.Yf;M.prototype.Df=function(a,b,c){G("Firebase.authWithCustomToken",2,3,arguments.length);kc("Firebase.authWithCustomToken",a);I("Firebase.authWithCustomToken",2,b,!1);mc("Firebase.authWithCustomToken",3,c,!0);uf(this.j.W,a,{},c||{},b)};M.prototype.authWithCustomToken=M.prototype.Df;
M.prototype.Ef=function(a,b,c){G("Firebase.authWithOAuthPopup",2,3,arguments.length);lc("Firebase.authWithOAuthPopup",1,a);I("Firebase.authWithOAuthPopup",2,b,!1);mc("Firebase.authWithOAuthPopup",3,c,!0);zf(this.j.W,a,c,b)};M.prototype.authWithOAuthPopup=M.prototype.Ef;
M.prototype.Ff=function(a,b,c){G("Firebase.authWithOAuthRedirect",2,3,arguments.length);lc("Firebase.authWithOAuthRedirect",1,a);I("Firebase.authWithOAuthRedirect",2,b,!1);mc("Firebase.authWithOAuthRedirect",3,c,!0);var d=this.j.W;xf(d);var e=[nf],f=We(c);"anonymous"===a||"firebase"===a?B(b,U("TRANSPORT_UNAVAILABLE")):(wa.set("redirect_client_options",f.ad),yf(d,e,"/auth/"+a,f,b))};M.prototype.authWithOAuthRedirect=M.prototype.Ff;
M.prototype.Gf=function(a,b,c,d){G("Firebase.authWithOAuthToken",3,4,arguments.length);lc("Firebase.authWithOAuthToken",1,a);I("Firebase.authWithOAuthToken",3,c,!1);mc("Firebase.authWithOAuthToken",4,d,!0);p(b)?(lc("Firebase.authWithOAuthToken",2,b),wf(this.j.W,a+"/token",{access_token:b},c)):(mc("Firebase.authWithOAuthToken",2,b,!1),wf(this.j.W,a+"/token",b,c))};M.prototype.authWithOAuthToken=M.prototype.Gf;
M.prototype.Cf=function(a,b){G("Firebase.authAnonymously",1,2,arguments.length);I("Firebase.authAnonymously",1,a,!1);mc("Firebase.authAnonymously",2,b,!0);wf(this.j.W,"anonymous",{},a)};M.prototype.authAnonymously=M.prototype.Cf;
M.prototype.Hf=function(a,b,c){G("Firebase.authWithPassword",2,3,arguments.length);mc("Firebase.authWithPassword",1,a,!1);nc("Firebase.authWithPassword",a,"email");nc("Firebase.authWithPassword",a,"password");I("Firebase.authAnonymously",2,b,!1);mc("Firebase.authAnonymously",3,c,!0);wf(this.j.W,"password",a,b)};M.prototype.authWithPassword=M.prototype.Hf;
M.prototype.he=function(a,b){G("Firebase.createUser",2,2,arguments.length);mc("Firebase.createUser",1,a,!1);nc("Firebase.createUser",a,"email");nc("Firebase.createUser",a,"password");I("Firebase.createUser",2,b,!1);this.j.W.he(a,b)};M.prototype.createUser=M.prototype.he;M.prototype.Ge=function(a,b){G("Firebase.removeUser",2,2,arguments.length);mc("Firebase.removeUser",1,a,!1);nc("Firebase.removeUser",a,"email");nc("Firebase.removeUser",a,"password");I("Firebase.removeUser",2,b,!1);this.j.W.Ge(a,b)};
M.prototype.removeUser=M.prototype.Ge;M.prototype.ce=function(a,b){G("Firebase.changePassword",2,2,arguments.length);mc("Firebase.changePassword",1,a,!1);nc("Firebase.changePassword",a,"email");nc("Firebase.changePassword",a,"oldPassword");nc("Firebase.changePassword",a,"newPassword");I("Firebase.changePassword",2,b,!1);this.j.W.ce(a,b)};M.prototype.changePassword=M.prototype.ce;
M.prototype.He=function(a,b){G("Firebase.resetPassword",2,2,arguments.length);mc("Firebase.resetPassword",1,a,!1);nc("Firebase.resetPassword",a,"email");I("Firebase.resetPassword",2,b,!1);this.j.W.He(a,b)};M.prototype.resetPassword=M.prototype.He;M.goOffline=function(){G("Firebase.goOffline",0,0,arguments.length);rh.Mb().tb()};M.goOnline=function(){G("Firebase.goOnline",0,0,arguments.length);rh.Mb().ec()};
function qb(a,b){x(!b||!0===a||!1===a,"Can't turn on custom loggers persistently.");!0===a?("undefined"!==typeof console&&("function"===typeof console.log?ob=q(console.log,console):"object"===typeof console.log&&(ob=function(a){console.log(a)})),b&&wa.set("logging_enabled",!0)):a?ob=a:(ob=null,wa.remove("logging_enabled"))}M.enableLogging=qb;M.ServerValue={TIMESTAMP:{".sv":"timestamp"}};M.SDK_VERSION="1.2.0-beta.1";M.INTERNAL=Y;M.Context=rh;M.TEST_ACCESS=$;})();
module.exports = Firebase;

},{}],"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js":[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/child.js":[function(require,module,exports){
var _ = require('../util')

/**
 * Create a child instance that prototypally inehrits
 * data on parent. To achieve that we create an intermediate
 * constructor with its prototype pointing to parent.
 *
 * @param {Object} opts
 * @param {Function} [BaseCtor]
 * @return {Vue}
 * @public
 */

exports.$addChild = function (opts, BaseCtor) {
  BaseCtor = BaseCtor || _.Vue
  opts = opts || {}
  var parent = this
  var ChildVue
  var inherit = opts.inherit !== undefined
    ? opts.inherit
    : BaseCtor.options.inherit
  if (inherit) {
    var ctors = parent._childCtors
    if (!ctors) {
      ctors = parent._childCtors = {}
    }
    ChildVue = ctors[BaseCtor.cid]
    if (!ChildVue) {
      var optionName = BaseCtor.options.name
      var className = optionName
        ? _.camelize(optionName, true)
        : 'VueComponent'
      ChildVue = new Function(
        'return function ' + className + ' (options) {' +
        'this.constructor = ' + className + ';' +
        'this._init(options) }'
      )()
      ChildVue.options = BaseCtor.options
      ChildVue.prototype = this
      ctors[BaseCtor.cid] = ChildVue
    }
  } else {
    ChildVue = BaseCtor
  }
  opts._parent = parent
  opts._root = parent.$root
  var child = new ChildVue(opts)
  if (!this._children) {
    this._children = []
  }
  this._children.push(child)
  return child
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/data.js":[function(require,module,exports){
var _ = require('../util')
var Watcher = require('../watcher')
var Path = require('../parsers/path')
var textParser = require('../parsers/text')
var dirParser = require('../parsers/directive')
var expParser = require('../parsers/expression')
var filterRE = /[^|]\|[^|]/

/**
 * Get the value from an expression on this vm.
 *
 * @param {String} exp
 * @return {*}
 */

exports.$get = function (exp) {
  var res = expParser.parse(exp)
  if (res) {
    return res.get.call(this, this)
  }
}

/**
 * Set the value from an expression on this vm.
 * The expression must be a valid left-hand
 * expression in an assignment.
 *
 * @param {String} exp
 * @param {*} val
 */

exports.$set = function (exp, val) {
  var res = expParser.parse(exp, true)
  if (res && res.set) {
    res.set.call(this, this, val)
  }
}

/**
 * Add a property on the VM
 *
 * @param {String} key
 * @param {*} val
 */

exports.$add = function (key, val) {
  this._data.$add(key, val)
}

/**
 * Delete a property on the VM
 *
 * @param {String} key
 */

exports.$delete = function (key) {
  this._data.$delete(key)
}

/**
 * Watch an expression, trigger callback when its
 * value changes.
 *
 * @param {String} exp
 * @param {Function} cb
 * @param {Boolean} [deep]
 * @param {Boolean} [immediate]
 * @return {Function} - unwatchFn
 */

exports.$watch = function (exp, cb, deep, immediate) {
  var vm = this
  var key = deep ? exp + '**deep**' : exp
  var watcher = vm._userWatchers[key]
  var wrappedCb = function (val, oldVal) {
    cb.call(vm, val, oldVal)
  }
  if (!watcher) {
    watcher = vm._userWatchers[key] =
      new Watcher(vm, exp, wrappedCb, null, false, deep)
  } else {
    watcher.addCb(wrappedCb)
  }
  if (immediate) {
    wrappedCb(watcher.value)
  }
  return function unwatchFn () {
    watcher.removeCb(wrappedCb)
    if (!watcher.active) {
      vm._userWatchers[key] = null
    }
  }
}

/**
 * Evaluate a text directive, including filters.
 *
 * @param {String} text
 * @return {String}
 */

exports.$eval = function (text) {
  // check for filters.
  if (filterRE.test(text)) {
    var dir = dirParser.parse(text)[0]
    // the filter regex check might give false positive
    // for pipes inside strings, so it's possible that
    // we don't get any filters here
    return dir.filters
      ? _.applyFilters(
          this.$get(dir.expression),
          _.resolveFilters(this, dir.filters).read,
          this
        )
      : this.$get(dir.expression)
  } else {
    // no filter
    return this.$get(text)
  }
}

/**
 * Interpolate a piece of template text.
 *
 * @param {String} text
 * @return {String}
 */

exports.$interpolate = function (text) {
  var tokens = textParser.parse(text)
  var vm = this
  if (tokens) {
    return tokens.length === 1
      ? vm.$eval(tokens[0].value)
      : tokens.map(function (token) {
          return token.tag
            ? vm.$eval(token.value)
            : token.value
        }).join('')
  } else {
    return text
  }
}

/**
 * Log instance data as a plain JS object
 * so that it is easier to inspect in console.
 * This method assumes console is available.
 *
 * @param {String} [path]
 */

exports.$log = function (path) {
  var data = path
    ? Path.get(this._data, path)
    : this._data
  if (data) {
    data = JSON.parse(JSON.stringify(data))
  }
  console.log(data)
}
},{"../parsers/directive":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/directive.js","../parsers/expression":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js","../parsers/path":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/path.js","../parsers/text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","../watcher":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/watcher.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/dom.js":[function(require,module,exports){
var _ = require('../util')
var transition = require('../transition')

/**
 * Append instance to target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$appendTo = function (target, cb, withTransition) {
  return insert(
    this, target, cb, withTransition,
    append, transition.append
  )
}

/**
 * Prepend instance to target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$prependTo = function (target, cb, withTransition) {
  target = query(target)
  if (target.hasChildNodes()) {
    this.$before(target.firstChild, cb, withTransition)
  } else {
    this.$appendTo(target, cb, withTransition)
  }
  return this
}

/**
 * Insert instance before target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$before = function (target, cb, withTransition) {
  return insert(
    this, target, cb, withTransition,
    before, transition.before
  )
}

/**
 * Insert instance after target
 *
 * @param {Node} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$after = function (target, cb, withTransition) {
  target = query(target)
  if (target.nextSibling) {
    this.$before(target.nextSibling, cb, withTransition)
  } else {
    this.$appendTo(target.parentNode, cb, withTransition)
  }
  return this
}

/**
 * Remove instance from DOM
 *
 * @param {Function} [cb]
 * @param {Boolean} [withTransition] - defaults to true
 */

exports.$remove = function (cb, withTransition) {
  var inDoc = this._isAttached && _.inDoc(this.$el)
  // if we are not in document, no need to check
  // for transitions
  if (!inDoc) withTransition = false
  var op
  var self = this
  var realCb = function () {
    if (inDoc) self._callHook('detached')
    if (cb) cb()
  }
  if (
    this._isBlock &&
    !this._blockFragment.hasChildNodes()
  ) {
    op = withTransition === false
      ? append
      : transition.removeThenAppend
    blockOp(this, this._blockFragment, op, realCb)
  } else {
    op = withTransition === false
      ? remove
      : transition.remove
    op(this.$el, this, realCb)
  }
  return this
}

/**
 * Shared DOM insertion function.
 *
 * @param {Vue} vm
 * @param {Element} target
 * @param {Function} [cb]
 * @param {Boolean} [withTransition]
 * @param {Function} op1 - op for non-transition insert
 * @param {Function} op2 - op for transition insert
 * @return vm
 */

function insert (vm, target, cb, withTransition, op1, op2) {
  target = query(target)
  var targetIsDetached = !_.inDoc(target)
  var op = withTransition === false || targetIsDetached
    ? op1
    : op2
  var shouldCallHook =
    !targetIsDetached &&
    !vm._isAttached &&
    !_.inDoc(vm.$el)
  if (vm._isBlock) {
    blockOp(vm, target, op, cb)
  } else {
    op(vm.$el, target, vm, cb)
  }
  if (shouldCallHook) {
    vm._callHook('attached')
  }
  return vm
}

/**
 * Execute a transition operation on a block instance,
 * iterating through all its block nodes.
 *
 * @param {Vue} vm
 * @param {Node} target
 * @param {Function} op
 * @param {Function} cb
 */

function blockOp (vm, target, op, cb) {
  var current = vm._blockStart
  var end = vm._blockEnd
  var next
  while (next !== end) {
    next = current.nextSibling
    op(current, target, vm)
    current = next
  }
  op(end, target, vm, cb)
}

/**
 * Check for selectors
 *
 * @param {String|Element} el
 */

function query (el) {
  return typeof el === 'string'
    ? document.querySelector(el)
    : el
}

/**
 * Append operation that takes a callback.
 *
 * @param {Node} el
 * @param {Node} target
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function append (el, target, vm, cb) {
  target.appendChild(el)
  if (cb) cb()
}

/**
 * InsertBefore operation that takes a callback.
 *
 * @param {Node} el
 * @param {Node} target
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function before (el, target, vm, cb) {
  _.before(el, target)
  if (cb) cb()
}

/**
 * Remove operation that takes a callback.
 *
 * @param {Node} el
 * @param {Vue} vm - unused
 * @param {Function} [cb]
 */

function remove (el, vm, cb) {
  _.remove(el)
  if (cb) cb()
}
},{"../transition":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/index.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/events.js":[function(require,module,exports){
var _ = require('../util')

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$on = function (event, fn) {
  (this._events[event] || (this._events[event] = []))
    .push(fn)
  modifyListenerCount(this, event, 1)
  return this
}

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$once = function (event, fn) {
  var self = this
  function on () {
    self.$off(event, on)
    fn.apply(this, arguments)
  }
  on.fn = fn
  this.$on(event, on)
  return this
}

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$off = function (event, fn) {
  var cbs
  // all
  if (!arguments.length) {
    if (this.$parent) {
      for (event in this._events) {
        cbs = this._events[event]
        if (cbs) {
          modifyListenerCount(this, event, -cbs.length)
        }
      }
    }
    this._events = {}
    return this
  }
  // specific event
  cbs = this._events[event]
  if (!cbs) {
    return this
  }
  if (arguments.length === 1) {
    modifyListenerCount(this, event, -cbs.length)
    this._events[event] = null
    return this
  }
  // specific handler
  var cb
  var i = cbs.length
  while (i--) {
    cb = cbs[i]
    if (cb === fn || cb.fn === fn) {
      modifyListenerCount(this, event, -1)
      cbs.splice(i, 1)
      break
    }
  }
  return this
}

/**
 * Trigger an event on self.
 *
 * @param {String} event
 */

exports.$emit = function (event) {
  this._eventCancelled = false
  var cbs = this._events[event]
  if (cbs) {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length - 1
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i + 1]
    }
    i = 0
    cbs = cbs.length > 1
      ? _.toArray(cbs)
      : cbs
    for (var l = cbs.length; i < l; i++) {
      if (cbs[i].apply(this, args) === false) {
        this._eventCancelled = true
      }
    }
  }
  return this
}

/**
 * Recursively broadcast an event to all children instances.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

exports.$broadcast = function (event) {
  // if no child has registered for this event,
  // then there's no need to broadcast.
  if (!this._eventsCount[event]) return
  var children = this._children
  if (children) {
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i]
      child.$emit.apply(child, arguments)
      if (!child._eventCancelled) {
        child.$broadcast.apply(child, arguments)
      }
    }
  }
  return this
}

/**
 * Recursively propagate an event up the parent chain.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

exports.$dispatch = function () {
  var parent = this.$parent
  while (parent) {
    parent.$emit.apply(parent, arguments)
    parent = parent._eventCancelled
      ? null
      : parent.$parent
  }
  return this
}

/**
 * Modify the listener counts on all parents.
 * This bookkeeping allows $broadcast to return early when
 * no child has listened to a certain event.
 *
 * @param {Vue} vm
 * @param {String} event
 * @param {Number} count
 */

var hookRE = /^hook:/
function modifyListenerCount (vm, event, count) {
  var parent = vm.$parent
  // hooks do not get broadcasted so no need
  // to do bookkeeping for them
  if (!parent || !count || hookRE.test(event)) return
  while (parent) {
    parent._eventsCount[event] =
      (parent._eventsCount[event] || 0) + count
    parent = parent.$parent
  }
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/global.js":[function(require,module,exports){
var _ = require('../util')
var mergeOptions = require('../util/merge-option')

/**
 * Expose useful internals
 */

exports.util = _
exports.nextTick = _.nextTick
exports.config = require('../config')

exports.compiler = {
  compile: require('../compiler/compile'),
  transclude: require('../compiler/transclude')
}

exports.parsers = {
  path: require('../parsers/path'),
  text: require('../parsers/text'),
  template: require('../parsers/template'),
  directive: require('../parsers/directive'),
  expression: require('../parsers/expression')
}

/**
 * Each instance constructor, including Vue, has a unique
 * cid. This enables us to create wrapped "child
 * constructors" for prototypal inheritance and cache them.
 */

exports.cid = 0
var cid = 1

/**
 * Class inehritance
 *
 * @param {Object} extendOptions
 */

exports.extend = function (extendOptions) {
  extendOptions = extendOptions || {}
  var Super = this
  var Sub = createClass(extendOptions.name || 'VueComponent')
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.cid = cid++
  Sub.options = mergeOptions(
    Super.options,
    extendOptions
  )
  Sub['super'] = Super
  // allow further extension
  Sub.extend = Super.extend
  // create asset registers, so extended classes
  // can have their private assets too.
  createAssetRegisters(Sub)
  return Sub
}

/**
 * A function that returns a sub-class constructor with the
 * given name. This gives us much nicer output when
 * logging instances in the console.
 *
 * @param {String} name
 * @return {Function}
 */

function createClass (name) {
  return new Function(
    'return function ' + _.camelize(name, true) +
    ' (options) { this._init(options) }'
  )()
}

/**
 * Plugin system
 *
 * @param {Object} plugin
 */

exports.use = function (plugin) {
  // additional parameters
  var args = _.toArray(arguments, 1)
  args.unshift(this)
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else {
    plugin.apply(null, args)
  }
  return this
}

/**
 * Define asset registration methods on a constructor.
 *
 * @param {Function} Constructor
 */

var assetTypes = [
  'directive',
  'filter',
  'partial',
  'transition'
]

function createAssetRegisters (Constructor) {

  /* Asset registration methods share the same signature:
   *
   * @param {String} id
   * @param {*} definition
   */

  assetTypes.forEach(function (type) {
    Constructor[type] = function (id, definition) {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        this.options[type + 's'][id] = definition
      }
    }
  })

  /**
   * Component registration needs to automatically invoke
   * Vue.extend on object values.
   *
   * @param {String} id
   * @param {Object|Function} definition
   */

  Constructor.component = function (id, definition) {
    if (!definition) {
      return this.options.components[id]
    } else {
      if (_.isPlainObject(definition)) {
        definition.name = id
        definition = _.Vue.extend(definition)
      }
      this.options.components[id] = definition
    }
  }
}

createAssetRegisters(exports)
},{"../compiler/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js","../compiler/transclude":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/transclude.js","../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","../parsers/directive":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/directive.js","../parsers/expression":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js","../parsers/path":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/path.js","../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../parsers/text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","../util/merge-option":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/merge-option.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/lifecycle.js":[function(require,module,exports){
var _ = require('../util')
var compile = require('../compiler/compile')

/**
 * Set instance target element and kick off the compilation
 * process. The passed in `el` can be a selector string, an
 * existing Element, or a DocumentFragment (for block
 * instances).
 *
 * @param {Element|DocumentFragment|string} el
 * @public
 */

exports.$mount = function (el) {
  if (this._isCompiled) {
    _.warn('$mount() should be called only once.')
    return
  }
  if (!el) {
    el = document.createElement('div')
  } else if (typeof el === 'string') {
    var selector = el
    el = document.querySelector(el)
    if (!el) {
      _.warn('Cannot find element: ' + selector)
      return
    }
  }
  this._compile(el)
  this._isCompiled = true
  this._callHook('compiled')
  if (_.inDoc(this.$el)) {
    this._callHook('attached')
    this._initDOMHooks()
    ready.call(this)
  } else {
    this._initDOMHooks()
    this.$once('hook:attached', ready)
  }
  return this
}

/**
 * Mark an instance as ready.
 */

function ready () {
  this._isAttached = true
  this._isReady = true
  this._callHook('ready')
}

/**
 * Teardown the instance, simply delegate to the internal
 * _destroy.
 */

exports.$destroy = function (remove, deferCleanup) {
  this._destroy(remove, deferCleanup)
}

/**
 * Partially compile a piece of DOM and return a
 * decompile function.
 *
 * @param {Element|DocumentFragment} el
 * @return {Function}
 */

exports.$compile = function (el) {
  return compile(el, this.$options, true)(this, el)
}
},{"../compiler/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/batcher.js":[function(require,module,exports){
var _ = require('./util')

/**
 * The Batcher maintains a job queue to be run
 * async on the next event loop.
 */

function Batcher () {
  this.reset()
}

var p = Batcher.prototype

/**
 * Push a job into the job queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 *
 * @param {Object} job
 *   properties:
 *   - {String|Number} id
 *   - {Function}      run
 */

p.push = function (job) {
  if (!job.id || !this.has[job.id] || this.flushing) {
    this.queue.push(job)
    this.has[job.id] = job
    if (!this.waiting) {
      this.waiting = true
      _.nextTick(this.flush, this)
    }
  }
}

/**
 * Flush the queue and run the jobs.
 * Will call a preFlush hook if has one.
 */

p.flush = function () {
  this.flushing = true
  // do not cache length because more jobs might be pushed
  // as we run existing jobs
  for (var i = 0; i < this.queue.length; i++) {
    var job = this.queue[i]
    if (!job.cancelled) {
      job.run()
    }
  }
  this.reset()
}

/**
 * Reset the batcher's state.
 */

p.reset = function () {
  this.has = {}
  this.queue = []
  this.waiting = false
  this.flushing = false
}

module.exports = Batcher
},{"./util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js":[function(require,module,exports){
/**
 * A doubly linked list-based Least Recently Used (LRU)
 * cache. Will keep most recently used items while
 * discarding least recently used items when its limit is
 * reached. This is a bare-bone version of
 * Rasmus Andersson's js-lru:
 *
 *   https://github.com/rsms/js-lru
 *
 * @param {Number} limit
 * @constructor
 */

function Cache (limit) {
  this.size = 0
  this.limit = limit
  this.head = this.tail = undefined
  this._keymap = {}
}

var p = Cache.prototype

/**
 * Put <value> into the cache associated with <key>.
 * Returns the entry which was removed to make room for
 * the new entry. Otherwise undefined is returned.
 * (i.e. if there was enough room already).
 *
 * @param {String} key
 * @param {*} value
 * @return {Entry|undefined}
 */

p.put = function (key, value) {
  var entry = {
    key:key,
    value:value
  }
  this._keymap[key] = entry
  if (this.tail) {
    this.tail.newer = entry
    entry.older = this.tail
  } else {
    this.head = entry
  }
  this.tail = entry
  if (this.size === this.limit) {
    return this.shift()
  } else {
    this.size++
  }
}

/**
 * Purge the least recently used (oldest) entry from the
 * cache. Returns the removed entry or undefined if the
 * cache was empty.
 */

p.shift = function () {
  var entry = this.head
  if (entry) {
    this.head = this.head.newer
    this.head.older = undefined
    entry.newer = entry.older = undefined
    this._keymap[entry.key] = undefined
  }
  return entry
}

/**
 * Get and register recent use of <key>. Returns the value
 * associated with <key> or undefined if not in cache.
 *
 * @param {String} key
 * @param {Boolean} returnEntry
 * @return {Entry|*}
 */

p.get = function (key, returnEntry) {
  var entry = this._keymap[key]
  if (entry === undefined) return
  if (entry === this.tail) {
    return returnEntry
      ? entry
      : entry.value
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry.newer) {
    if (entry === this.head) {
      this.head = entry.newer
    }
    entry.newer.older = entry.older // C <-- E.
  }
  if (entry.older) {
    entry.older.newer = entry.newer // C. --> E
  }
  entry.newer = undefined // D --x
  entry.older = this.tail // D. --> E
  if (this.tail) {
    this.tail.newer = entry // E. <-- D
  }
  this.tail = entry
  return returnEntry
    ? entry
    : entry.value
}

module.exports = Cache
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js":[function(require,module,exports){
var _ = require('../util')
var config = require('../config')
var textParser = require('../parsers/text')
var dirParser = require('../parsers/directive')
var templateParser = require('../parsers/template')

/**
 * Compile a template and return a reusable composite link
 * function, which recursively contains more link functions
 * inside. This top level compile function should only be
 * called on instance root nodes.
 *
 * When the `asParent` flag is true, this means we are doing
 * a partial compile for a component's parent scope markup
 * (See #502). This could **only** be triggered during
 * compilation of `v-component`, and we need to skip v-with,
 * v-ref & v-component in this situation.
 *
 * @param {Element|DocumentFragment} el
 * @param {Object} options
 * @param {Boolean} partial
 * @param {Boolean} asParent - compiling a component
 *                             container as its parent.
 * @return {Function}
 */

module.exports = function compile (el, options, partial, asParent) {
  var params = !partial && options.paramAttributes
  var paramsLinkFn = params
    ? compileParamAttributes(el, params, options)
    : null
  var nodeLinkFn = el instanceof DocumentFragment
    ? null
    : compileNode(el, options, asParent)
  var childLinkFn =
    !(nodeLinkFn && nodeLinkFn.terminal) &&
    el.tagName !== 'SCRIPT' &&
    el.hasChildNodes()
      ? compileNodeList(el.childNodes, options)
      : null

  /**
   * A linker function to be called on a already compiled
   * piece of DOM, which instantiates all directive
   * instances.
   *
   * @param {Vue} vm
   * @param {Element|DocumentFragment} el
   * @return {Function|undefined}
   */

  return function link (vm, el) {
    var originalDirCount = vm._directives.length
    if (paramsLinkFn) paramsLinkFn(vm, el)
    if (nodeLinkFn) nodeLinkFn(vm, el)
    if (childLinkFn) childLinkFn(vm, el.childNodes)

    /**
     * If this is a partial compile, the linker function
     * returns an unlink function that tearsdown all
     * directives instances generated during the partial
     * linking.
     */

    if (partial) {
      var dirs = vm._directives.slice(originalDirCount)
      return function unlink () {
        var i = dirs.length
        while (i--) {
          dirs[i]._teardown()
        }
        i = vm._directives.indexOf(dirs[0])
        vm._directives.splice(i, dirs.length)
      }
    }
  }
}

/**
 * Compile a node and return a nodeLinkFn based on the
 * node type.
 *
 * @param {Node} node
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Function|undefined}
 */

function compileNode (node, options, asParent) {
  var type = node.nodeType
  if (type === 1 && node.tagName !== 'SCRIPT') {
    return compileElement(node, options, asParent)
  } else if (type === 3 && config.interpolate) {
    return compileTextNode(node, options)
  }
}

/**
 * Compile an element and return a nodeLinkFn.
 *
 * @param {Element} el
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Function|null}
 */

function compileElement (el, options, asParent) {
  var linkFn, tag, component
  // check custom element component, but only on non-root
  if (!asParent && !el.__vue__) {
    tag = el.tagName.toLowerCase()
    component =
      tag.indexOf('-') > 0 &&
      options.components[tag]
    if (component) {
      el.setAttribute(config.prefix + 'component', tag)
    }
  }
  if (component || el.hasAttributes()) {
    // check terminal direcitves
    if (!asParent) {
      linkFn = checkTerminalDirectives(el, options)
    }
    // if not terminal, build normal link function
    if (!linkFn) {
      var dirs = collectDirectives(el, options, asParent)
      linkFn = dirs.length
        ? makeDirectivesLinkFn(dirs)
        : null
    }
  }
  // if the element is a textarea, we need to interpolate
  // its content on initial render.
  if (el.tagName === 'TEXTAREA') {
    var realLinkFn = linkFn
    linkFn = function (vm, el) {
      el.value = vm.$interpolate(el.value)
      if (realLinkFn) realLinkFn(vm, el)
    }
    linkFn.terminal = true
  }
  return linkFn
}

/**
 * Build a multi-directive link function.
 *
 * @param {Array} directives
 * @return {Function} directivesLinkFn
 */

function makeDirectivesLinkFn (directives) {
  return function directivesLinkFn (vm, el) {
    // reverse apply because it's sorted low to high
    var i = directives.length
    var dir, j, k
    while (i--) {
      dir = directives[i]
      if (dir._link) {
        // custom link fn
        dir._link(vm, el)
      } else {
        k = dir.descriptors.length
        for (j = 0; j < k; j++) {
          vm._bindDir(dir.name, el,
                      dir.descriptors[j], dir.def)
        }
      }
    }
  }
}

/**
 * Compile a textNode and return a nodeLinkFn.
 *
 * @param {TextNode} node
 * @param {Object} options
 * @return {Function|null} textNodeLinkFn
 */

function compileTextNode (node, options) {
  var tokens = textParser.parse(node.nodeValue)
  if (!tokens) {
    return null
  }
  var frag = document.createDocumentFragment()
  var el, token
  for (var i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i]
    el = token.tag
      ? processTextToken(token, options)
      : document.createTextNode(token.value)
    frag.appendChild(el)
  }
  return makeTextNodeLinkFn(tokens, frag, options)
}

/**
 * Process a single text token.
 *
 * @param {Object} token
 * @param {Object} options
 * @return {Node}
 */

function processTextToken (token, options) {
  var el
  if (token.oneTime) {
    el = document.createTextNode(token.value)
  } else {
    if (token.html) {
      el = document.createComment('v-html')
      setTokenType('html')
    } else if (token.partial) {
      el = document.createComment('v-partial')
      setTokenType('partial')
    } else {
      // IE will clean up empty textNodes during
      // frag.cloneNode(true), so we have to give it
      // something here...
      el = document.createTextNode(' ')
      setTokenType('text')
    }
  }
  function setTokenType (type) {
    token.type = type
    token.def = options.directives[type]
    token.descriptor = dirParser.parse(token.value)[0]
  }
  return el
}

/**
 * Build a function that processes a textNode.
 *
 * @param {Array<Object>} tokens
 * @param {DocumentFragment} frag
 */

function makeTextNodeLinkFn (tokens, frag) {
  return function textNodeLinkFn (vm, el) {
    var fragClone = frag.cloneNode(true)
    var childNodes = _.toArray(fragClone.childNodes)
    var token, value, node
    for (var i = 0, l = tokens.length; i < l; i++) {
      token = tokens[i]
      value = token.value
      if (token.tag) {
        node = childNodes[i]
        if (token.oneTime) {
          value = vm.$eval(value)
          if (token.html) {
            _.replace(node, templateParser.parse(value, true))
          } else {
            node.nodeValue = value
          }
        } else {
          vm._bindDir(token.type, node,
                      token.descriptor, token.def)
        }
      }
    }
    _.replace(el, fragClone)
  }
}

/**
 * Compile a node list and return a childLinkFn.
 *
 * @param {NodeList} nodeList
 * @param {Object} options
 * @return {Function|undefined}
 */

function compileNodeList (nodeList, options) {
  var linkFns = []
  var nodeLinkFn, childLinkFn, node
  for (var i = 0, l = nodeList.length; i < l; i++) {
    node = nodeList[i]
    nodeLinkFn = compileNode(node, options)
    childLinkFn =
      !(nodeLinkFn && nodeLinkFn.terminal) &&
      node.tagName !== 'SCRIPT' &&
      node.hasChildNodes()
        ? compileNodeList(node.childNodes, options)
        : null
    linkFns.push(nodeLinkFn, childLinkFn)
  }
  return linkFns.length
    ? makeChildLinkFn(linkFns)
    : null
}

/**
 * Make a child link function for a node's childNodes.
 *
 * @param {Array<Function>} linkFns
 * @return {Function} childLinkFn
 */

function makeChildLinkFn (linkFns) {
  return function childLinkFn (vm, nodes) {
    // stablize nodes
    nodes = _.toArray(nodes)
    var node, nodeLinkFn, childrenLinkFn
    for (var i = 0, n = 0, l = linkFns.length; i < l; n++) {
      node = nodes[n]
      nodeLinkFn = linkFns[i++]
      childrenLinkFn = linkFns[i++]
      if (nodeLinkFn) {
        nodeLinkFn(vm, node)
      }
      if (childrenLinkFn) {
        childrenLinkFn(vm, node.childNodes)
      }
    }
  }
}

/**
 * Compile param attributes on a root element and return
 * a paramAttributes link function.
 *
 * @param {Element} el
 * @param {Array} attrs
 * @param {Object} options
 * @return {Function} paramsLinkFn
 */

function compileParamAttributes (el, attrs, options) {
  var params = []
  var i = attrs.length
  var name, value, param
  while (i--) {
    name = attrs[i]
    value = el.getAttribute(name)
    if (value !== null) {
      param = {
        name: name,
        value: value
      }
      var tokens = textParser.parse(value)
      if (tokens) {
        el.removeAttribute(name)
        if (tokens.length > 1) {
          _.warn(
            'Invalid param attribute binding: "' +
            name + '="' + value + '"' +
            '\nDon\'t mix binding tags with plain text ' +
            'in param attribute bindings.'
          )
          continue
        } else {
          param.dynamic = true
          param.value = tokens[0].value
        }
      }
      params.push(param)
    }
  }
  return makeParamsLinkFn(params, options)
}

/**
 * Build a function that applies param attributes to a vm.
 *
 * @param {Array} params
 * @param {Object} options
 * @return {Function} paramsLinkFn
 */

var dataAttrRE = /^data-/

function makeParamsLinkFn (params, options) {
  var def = options.directives['with']
  return function paramsLinkFn (vm, el) {
    var i = params.length
    var param, path
    while (i--) {
      param = params[i]
      // params could contain dashes, which will be
      // interpreted as minus calculations by the parser
      // so we need to wrap the path here
      path = _.camelize(param.name.replace(dataAttrRE, ''))
      if (param.dynamic) {
        // dynamic param attribtues are bound as v-with.
        // we can directly duck the descriptor here beacuse
        // param attributes cannot use expressions or
        // filters.
        vm._bindDir('with', el, {
          arg: path,
          expression: param.value
        }, def)
      } else {
        // just set once
        vm.$set(path, param.value)
      }
    }
  }
}

/**
 * Check an element for terminal directives in fixed order.
 * If it finds one, return a terminal link function.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Function} terminalLinkFn
 */

var terminalDirectives = [
  'repeat',
  'if',
  'component'
]

function skip () {}
skip.terminal = true

function checkTerminalDirectives (el, options) {
  if (_.attr(el, 'pre') !== null) {
    return skip
  }
  var value, dirName
  /* jshint boss: true */
  for (var i = 0; i < 3; i++) {
    dirName = terminalDirectives[i]
    if (value = _.attr(el, dirName)) {
      return makeTeriminalLinkFn(el, dirName, value, options)
    }
  }
}

/**
 * Build a link function for a terminal directive.
 *
 * @param {Element} el
 * @param {String} dirName
 * @param {String} value
 * @param {Object} options
 * @return {Function} terminalLinkFn
 */

function makeTeriminalLinkFn (el, dirName, value, options) {
  var descriptor = dirParser.parse(value)[0]
  var def = options.directives[dirName]
  var terminalLinkFn = function (vm, el) {
    vm._bindDir(dirName, el, descriptor, def)
  }
  terminalLinkFn.terminal = true
  return terminalLinkFn
}

/**
 * Collect the directives on an element.
 *
 * @param {Element} el
 * @param {Object} options
 * @param {Boolean} asParent
 * @return {Array}
 */

function collectDirectives (el, options, asParent) {
  var attrs = _.toArray(el.attributes)
  var i = attrs.length
  var dirs = []
  var attr, attrName, dir, dirName, dirDef
  while (i--) {
    attr = attrs[i]
    attrName = attr.name
    if (attrName.indexOf(config.prefix) === 0) {
      dirName = attrName.slice(config.prefix.length)
      if (asParent &&
          (dirName === 'with' ||
           dirName === 'ref' ||
           dirName === 'component')) {
        continue
      }
      dirDef = options.directives[dirName]
      _.assertAsset(dirDef, 'directive', dirName)
      if (dirDef) {
        dirs.push({
          name: dirName,
          descriptors: dirParser.parse(attr.value),
          def: dirDef
        })
      }
    } else if (config.interpolate) {
      dir = collectAttrDirective(el, attrName, attr.value,
                                 options)
      if (dir) {
        dirs.push(dir)
      }
    }
  }
  // sort by priority, LOW to HIGH
  dirs.sort(directiveComparator)
  return dirs
}

/**
 * Check an attribute for potential dynamic bindings,
 * and return a directive object.
 *
 * @param {Element} el
 * @param {String} name
 * @param {String} value
 * @param {Object} options
 * @return {Object}
 */

function collectAttrDirective (el, name, value, options) {
  if (options._skipAttrs &&
      options._skipAttrs.indexOf(name) > -1) {
    return
  }
  var tokens = textParser.parse(value)
  if (tokens) {
    var def = options.directives.attr
    var i = tokens.length
    var allOneTime = true
    while (i--) {
      var token = tokens[i]
      if (token.tag && !token.oneTime) {
        allOneTime = false
      }
    }
    return {
      def: def,
      _link: allOneTime
        ? function (vm, el) {
            el.setAttribute(name, vm.$interpolate(value))
          }
        : function (vm, el) {
            var value = textParser.tokensToExp(tokens, vm)
            var desc = dirParser.parse(name + ':' + value)[0]
            vm._bindDir('attr', el, desc, def)
          }
    }
  }
}

/**
 * Directive priority sort comparator
 *
 * @param {Object} a
 * @param {Object} b
 */

function directiveComparator (a, b) {
  a = a.def.priority || 0
  b = b.def.priority || 0
  return a > b ? 1 : -1
}
},{"../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","../parsers/directive":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/directive.js","../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../parsers/text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/transclude.js":[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

/**
 * Process an element or a DocumentFragment based on a
 * instance option object. This allows us to transclude
 * a template node/fragment before the instance is created,
 * so the processed fragment can then be cloned and reused
 * in v-repeat.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

module.exports = function transclude (el, options) {
  // for template tags, what we want is its content as
  // a documentFragment (for block instances)
  if (el.tagName === 'TEMPLATE') {
    el = templateParser.parse(el)
  }
  if (options && options.template) {
    el = transcludeTemplate(el, options)
  }
  if (el instanceof DocumentFragment) {
    _.prepend(document.createComment('v-start'), el)
    el.appendChild(document.createComment('v-end'))
  }
  return el
}

/**
 * Process the template option.
 * If the replace option is true this will swap the $el.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

function transcludeTemplate (el, options) {
  var template = options.template
  var frag = templateParser.parse(template, true)
  if (!frag) {
    _.warn('Invalid template option: ' + template)
  } else {
    var rawContent = options._content || _.extractContent(el)
    if (options.replace) {
      if (frag.childNodes.length > 1) {
        transcludeContent(frag, rawContent)
        return frag
      } else {
        var replacer = frag.firstChild
        _.copyAttributes(el, replacer)
        transcludeContent(replacer, rawContent)
        return replacer
      }
    } else {
      el.appendChild(frag)
      transcludeContent(el, rawContent)
      return el
    }
  }
}

/**
 * Resolve <content> insertion points mimicking the behavior
 * of the Shadow DOM spec:
 *
 *   http://w3c.github.io/webcomponents/spec/shadow/#insertion-points
 *
 * @param {Element|DocumentFragment} el
 * @param {Element} raw
 */

function transcludeContent (el, raw) {
  var outlets = getOutlets(el)
  var i = outlets.length
  if (!i) return
  var outlet, select, selected, j, main
  // first pass, collect corresponding content
  // for each outlet.
  while (i--) {
    outlet = outlets[i]
    if (raw) {
      select = outlet.getAttribute('select')
      if (select) {  // select content
        selected = raw.querySelectorAll(select)
        outlet.content = _.toArray(
          selected.length
            ? selected
            : outlet.childNodes
        )
      } else { // default content
        main = outlet
      }
    } else { // fallback content
      outlet.content = _.toArray(outlet.childNodes)
    }
  }
  // second pass, actually insert the contents
  for (i = 0, j = outlets.length; i < j; i++) {
    outlet = outlets[i]
    if (outlet !== main) {
      insertContentAt(outlet, outlet.content)
    }
  }
  // finally insert the main content
  if (main) {
    insertContentAt(main, _.toArray(raw.childNodes))
  }
}

/**
 * Get <content> outlets from the element/list
 *
 * @param {Element|Array} el
 * @return {Array}
 */

var concat = [].concat
function getOutlets (el) {
  return _.isArray(el)
    ? concat.apply([], el.map(getOutlets))
    : el.querySelectorAll
      ? _.toArray(el.querySelectorAll('content'))
      : []
}

/**
 * Insert an array of nodes at outlet,
 * then remove the outlet.
 *
 * @param {Element} outlet
 * @param {Array} contents
 */

function insertContentAt (outlet, contents) {
  // not using util DOM methods here because
  // parentNode can be cached
  var parent = outlet.parentNode
  for (var i = 0, j = contents.length; i < j; i++) {
    parent.insertBefore(contents[i], outlet)
  }
  parent.removeChild(outlet)
}
},{"../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js":[function(require,module,exports){
module.exports = {

  /**
   * The prefix to look for when parsing directives.
   *
   * @type {String}
   */

  prefix: 'v-',

  /**
   * Whether to print debug messages.
   * Also enables stack trace for warnings.
   *
   * @type {Boolean}
   */

  debug: false,

  /**
   * Whether to suppress warnings.
   *
   * @type {Boolean}
   */

  silent: false,

  /**
   * Whether allow observer to alter data objects'
   * __proto__.
   *
   * @type {Boolean}
   */

  proto: true,

  /**
   * Whether to parse mustache tags in templates.
   *
   * @type {Boolean}
   */

  interpolate: true,

  /**
   * Whether to use async rendering.
   */

  async: true,

  /**
   * Internal flag to indicate the delimiters have been
   * changed.
   *
   * @type {Boolean}
   */

  _delimitersChanged: true

}

/**
 * Interpolation delimiters.
 * We need to mark the changed flag so that the text parser
 * knows it needs to recompile the regex.
 *
 * @type {Array<String>}
 */

var delimiters = ['{{', '}}']
Object.defineProperty(module.exports, 'delimiters', {
  get: function () {
    return delimiters
  },
  set: function (val) {
    delimiters = val
    this._delimitersChanged = true
  }
})
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directive.js":[function(require,module,exports){
var _ = require('./util')
var config = require('./config')
var Watcher = require('./watcher')
var textParser = require('./parsers/text')
var expParser = require('./parsers/expression')

/**
 * A directive links a DOM element with a piece of data,
 * which is the result of evaluating an expression.
 * It registers a watcher with the expression and calls
 * the DOM update function when a change is triggered.
 *
 * @param {String} name
 * @param {Node} el
 * @param {Vue} vm
 * @param {Object} descriptor
 *                 - {String} expression
 *                 - {String} [arg]
 *                 - {Array<Object>} [filters]
 * @param {Object} def - directive definition object
 * @constructor
 */

function Directive (name, el, vm, descriptor, def) {
  // public
  this.name = name
  this.el = el
  this.vm = vm
  // copy descriptor props
  this.raw = descriptor.raw
  this.expression = descriptor.expression
  this.arg = descriptor.arg
  this.filters = _.resolveFilters(vm, descriptor.filters)
  // private
  this._locked = false
  this._bound = false
  // init
  this._bind(def)
}

var p = Directive.prototype

/**
 * Initialize the directive, mixin definition properties,
 * setup the watcher, call definition bind() and update()
 * if present.
 *
 * @param {Object} def
 */

p._bind = function (def) {
  if (this.name !== 'cloak' && this.el.removeAttribute) {
    this.el.removeAttribute(config.prefix + this.name)
  }
  if (typeof def === 'function') {
    this.update = def
  } else {
    _.extend(this, def)
  }
  this._watcherExp = this.expression
  this._checkDynamicLiteral()
  if (this.bind) {
    this.bind()
  }
  if (
    this.update && this._watcherExp &&
    (!this.isLiteral || this._isDynamicLiteral) &&
    !this._checkStatement()
  ) {
    // wrapped updater for context
    var dir = this
    var update = this._update = function (val, oldVal) {
      if (!dir._locked) {
        dir.update(val, oldVal)
      }
    }
    // use raw expression as identifier because filters
    // make them different watchers
    var watcher = this.vm._watchers[this.raw]
    // v-repeat always creates a new watcher because it has
    // a special filter that's bound to its directive
    // instance.
    if (!watcher || this.name === 'repeat') {
      watcher = this.vm._watchers[this.raw] = new Watcher(
        this.vm,
        this._watcherExp,
        update, // callback
        this.filters,
        this.twoWay, // need setter,
        this.deep
      )
    } else {
      watcher.addCb(update)
    }
    this._watcher = watcher
    if (this._initValue != null) {
      watcher.set(this._initValue)
    } else {
      this.update(watcher.value)
    }
  }
  this._bound = true
}

/**
 * check if this is a dynamic literal binding.
 *
 * e.g. v-component="{{currentView}}"
 */

p._checkDynamicLiteral = function () {
  var expression = this.expression
  if (expression && this.isLiteral) {
    var tokens = textParser.parse(expression)
    if (tokens) {
      var exp = textParser.tokensToExp(tokens)
      this.expression = this.vm.$get(exp)
      this._watcherExp = exp
      this._isDynamicLiteral = true
    }
  }
}

/**
 * Check if the directive is a function caller
 * and if the expression is a callable one. If both true,
 * we wrap up the expression and use it as the event
 * handler.
 *
 * e.g. v-on="click: a++"
 *
 * @return {Boolean}
 */

p._checkStatement = function () {
  var expression = this.expression
  if (
    expression && this.acceptStatement &&
    !expParser.pathTestRE.test(expression)
  ) {
    var fn = expParser.parse(expression).get
    var vm = this.vm
    var handler = function () {
      fn.call(vm, vm)
    }
    if (this.filters) {
      handler = _.applyFilters(
        handler,
        this.filters.read,
        vm
      )
    }
    this.update(handler)
    return true
  }
}

/**
 * Check for an attribute directive param, e.g. lazy
 *
 * @param {String} name
 * @return {String}
 */

p._checkParam = function (name) {
  var param = this.el.getAttribute(name)
  if (param !== null) {
    this.el.removeAttribute(name)
  }
  return param
}

/**
 * Teardown the watcher and call unbind.
 */

p._teardown = function () {
  if (this._bound) {
    if (this.unbind) {
      this.unbind()
    }
    var watcher = this._watcher
    if (watcher && watcher.active) {
      watcher.removeCb(this._update)
      if (!watcher.active) {
        this.vm._watchers[this.raw] = null
      }
    }
    this._bound = false
    this.vm = this.el = this._watcher = null
  }
}

/**
 * Set the corresponding value with the setter.
 * This should only be used in two-way directives
 * e.g. v-model.
 *
 * @param {*} value
 * @param {Boolean} lock - prevent wrtie triggering update.
 * @public
 */

p.set = function (value, lock) {
  if (this.twoWay) {
    if (lock) {
      this._locked = true
    }
    this._watcher.set(value)
    if (lock) {
      var self = this
      _.nextTick(function () {
        self._locked = false
      })
    }
  }
}

module.exports = Directive
},{"./config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","./parsers/expression":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js","./parsers/text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js","./util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./watcher":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/watcher.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/attr.js":[function(require,module,exports){
// xlink
var xlinkNS = 'http://www.w3.org/1999/xlink'
var xlinkRE = /^xlink:/

module.exports = {

  priority: 850,

  bind: function () {
    var name = this.arg
    this.update = xlinkRE.test(name)
      ? xlinkHandler
      : defaultHandler
  }

}

function defaultHandler (value) {
  if (value || value === 0) {
    this.el.setAttribute(this.arg, value)
  } else {
    this.el.removeAttribute(this.arg)
  }
}

function xlinkHandler (value) {
  if (value != null) {
    this.el.setAttributeNS(xlinkNS, this.arg, value)
  } else {
    this.el.removeAttributeNS(xlinkNS, 'href')
  }
}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/class.js":[function(require,module,exports){
var _ = require('../util')
var addClass = _.addClass
var removeClass = _.removeClass

module.exports = function (value) {
  if (this.arg) {
    var method = value ? addClass : removeClass
    method(this.el, this.arg)
  } else {
    if (this.lastVal) {
      removeClass(this.el, this.lastVal)
    }
    if (value) {
      addClass(this.el, value)
      this.lastVal = value
    }
  }
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/cloak.js":[function(require,module,exports){
var config = require('../config')

module.exports = {

  bind: function () {
    var el = this.el
    this.vm.$once('hook:compiled', function () {
      el.removeAttribute(config.prefix + 'cloak')
    })
  }

}
},{"../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/component.js":[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

module.exports = {

  isLiteral: true,

  /**
   * Setup. Two possible usages:
   *
   * - static:
   *   v-component="comp"
   *
   * - dynamic:
   *   v-component="{{currentView}}"
   */

  bind: function () {
    if (!this.el.__vue__) {
      // create a ref anchor
      this.ref = document.createComment('v-component')
      _.replace(this.el, this.ref)
      // check keep-alive options.
      // If yes, instead of destroying the active vm when
      // hiding (v-if) or switching (dynamic literal) it,
      // we simply remove it from the DOM and save it in a
      // cache object, with its constructor id as the key.
      this.keepAlive = this._checkParam('keep-alive') != null
      if (this.keepAlive) {
        this.cache = {}
      }
      // if static, build right now.
      if (!this._isDynamicLiteral) {
        this.resolveCtor(this.expression)
        this.childVM = this.build()
        this.childVM.$before(this.ref)
      } else {
        // check dynamic component params
        this.readyEvent = this._checkParam('wait-for')
        this.transMode = this._checkParam('transition-mode')
      }
    } else {
      _.warn(
        'v-component="' + this.expression + '" cannot be ' +
        'used on an already mounted instance.'
      )
    }
  },

  /**
   * Resolve the component constructor to use when creating
   * the child vm.
   */

  resolveCtor: function (id) {
    this.ctorId = id
    this.Ctor = this.vm.$options.components[id]
    _.assertAsset(this.Ctor, 'component', id)
  },

  /**
   * Instantiate/insert a new child vm.
   * If keep alive and has cached instance, insert that
   * instance; otherwise build a new one and cache it.
   *
   * @return {Vue} - the created instance
   */

  build: function () {
    if (this.keepAlive) {
      var cached = this.cache[this.ctorId]
      if (cached) {
        return cached
      }
    }
    var vm = this.vm
    var el = templateParser.clone(this.el)
    if (this.Ctor) {
      var child = vm.$addChild({
        el: el,
        _asComponent: true
      }, this.Ctor)
      if (this.keepAlive) {
        this.cache[this.ctorId] = child
      }
      return child
    }
  },

  /**
   * Teardown the current child, but defers cleanup so
   * that we can separate the destroy and removal steps.
   */

  unbuild: function () {
    var child = this.childVM
    if (!child || this.keepAlive) {
      return
    }
    // the sole purpose of `deferCleanup` is so that we can
    // "deactivate" the vm right now and perform DOM removal
    // later.
    child.$destroy(false, true)
  },

  /**
   * Remove current destroyed child and manually do
   * the cleanup after removal.
   *
   * @param {Function} cb
   */

  removeCurrent: function (cb) {
    var child = this.childVM
    var keepAlive = this.keepAlive
    if (child) {
      child.$remove(function () {
        if (!keepAlive) child._cleanup()
        if (cb) cb()
      })
    } else if (cb) {
      cb()
    }
  },

  /**
   * Update callback for the dynamic literal scenario,
   * e.g. v-component="{{view}}"
   */

  update: function (value) {
    if (!value) {
      // just destroy and remove current
      this.unbuild()
      this.removeCurrent()
      this.childVM = null
    } else {
      this.resolveCtor(value)
      this.unbuild()
      var newComponent = this.build()
      var self = this
      if (this.readyEvent) {
        newComponent.$once(this.readyEvent, function () {
          self.swapTo(newComponent)
        })
      } else {
        this.swapTo(newComponent)
      }
    }
  },

  /**
   * Actually swap the components, depending on the
   * transition mode. Defaults to simultaneous.
   *
   * @param {Vue} target
   */

  swapTo: function (target) {
    var self = this
    switch (self.transMode) {
      case 'in-out':
        target.$before(self.ref, function () {
          self.removeCurrent()
          self.childVM = target
        })
        break
      case 'out-in':
        self.removeCurrent(function () {
          target.$before(self.ref)
          self.childVM = target
        })
        break
      default:
        self.removeCurrent()
        target.$before(self.ref)
        self.childVM = target
    }
  },

  /**
   * Unbind.
   */

  unbind: function () {
    this.unbuild()
    // destroy all keep-alive cached instances
    if (this.cache) {
      for (var key in this.cache) {
        this.cache[key].$destroy()
      }
      this.cache = null
    }
  }

}
},{"../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/el.js":[function(require,module,exports){
module.exports = {

  isLiteral: true,

  bind: function () {
    this.vm.$$[this.expression] = this.el
  },

  unbind: function () {
    delete this.vm.$$[this.expression]
  }
  
}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/html.js":[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')

module.exports = {

  bind: function () {
    // a comment node means this is a binding for
    // {{{ inline unescaped html }}}
    if (this.el.nodeType === 8) {
      // hold nodes
      this.nodes = []
    }
  },

  update: function (value) {
    value = _.toString(value)
    if (this.nodes) {
      this.swap(value)
    } else {
      this.el.innerHTML = value
    }
  },

  swap: function (value) {
    // remove old nodes
    var i = this.nodes.length
    while (i--) {
      _.remove(this.nodes[i])
    }
    // convert new value to a fragment
    // do not attempt to retrieve from id selector
    var frag = templateParser.parse(value, true, true)
    // save a reference to these nodes so we can remove later
    this.nodes = _.toArray(frag.childNodes)
    _.before(frag, this.el)
  }

}
},{"../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/if.js":[function(require,module,exports){
var _ = require('../util')
var compile = require('../compiler/compile')
var templateParser = require('../parsers/template')
var transition = require('../transition')

module.exports = {

  bind: function () {
    var el = this.el
    if (!el.__vue__) {
      this.start = document.createComment('v-if-start')
      this.end = document.createComment('v-if-end')
      _.replace(el, this.end)
      _.before(this.start, this.end)
      if (el.tagName === 'TEMPLATE') {
        this.template = templateParser.parse(el, true)
      } else {
        this.template = document.createDocumentFragment()
        this.template.appendChild(el)
      }
      // compile the nested partial
      this.linker = compile(
        this.template,
        this.vm.$options,
        true
      )
    } else {
      this.invalid = true
      _.warn(
        'v-if="' + this.expression + '" cannot be ' +
        'used on an already mounted instance.'
      )
    }
  },

  update: function (value) {
    if (this.invalid) return
    if (value) {
      this.insert()
    } else {
      this.teardown()
    }
  },

  insert: function () {
    // avoid duplicate inserts, since update() can be
    // called with different truthy values
    if (!this.unlink) {
      this.compile(this.template) 
    }
  },

  compile: function (template) {
    var vm = this.vm
    var frag = templateParser.clone(template)
    var originalChildLength = vm._children
      ? vm._children.length
      : 0
    this.unlink = this.linker
      ? this.linker(vm, frag)
      : vm.$compile(frag)
    transition.blockAppend(frag, this.end, vm)
    this.children = vm._children
      ? vm._children.slice(originalChildLength)
      : null
    if (this.children && _.inDoc(vm.$el)) {
      this.children.forEach(function (child) {
        child._callHook('attached')
      })
    }
  },

  teardown: function () {
    if (!this.unlink) return
    transition.blockRemove(this.start, this.end, this.vm)
    if (this.children && _.inDoc(this.vm.$el)) {
      this.children.forEach(function (child) {
        if (!child._isDestroyed) {
          child._callHook('detached')
        }
      })
    }
    this.unlink()
    this.unlink = null
  }

}
},{"../compiler/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js","../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../transition":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/index.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/index.js":[function(require,module,exports){
// manipulation directives
exports.text       = require('./text')
exports.html       = require('./html')
exports.attr       = require('./attr')
exports.show       = require('./show')
exports['class']   = require('./class')
exports.el         = require('./el')
exports.ref        = require('./ref')
exports.cloak      = require('./cloak')
exports.style      = require('./style')
exports.partial    = require('./partial')
exports.transition = require('./transition')

// event listener directives
exports.on         = require('./on')
exports.model      = require('./model')

// child vm directives
exports.component  = require('./component')
exports.repeat     = require('./repeat')
exports['if']      = require('./if')
exports['with']    = require('./with')
},{"./attr":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/attr.js","./class":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/class.js","./cloak":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/cloak.js","./component":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/component.js","./el":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/el.js","./html":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/html.js","./if":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/if.js","./model":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/index.js","./on":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/on.js","./partial":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/partial.js","./ref":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/ref.js","./repeat":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/repeat.js","./show":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/show.js","./style":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/style.js","./text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/text.js","./transition":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/transition.js","./with":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/with.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/checkbox.js":[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    this.listener = function () {
      self.set(el.checked, true)
    }
    _.on(el, 'change', this.listener)
    if (el.checked) {
      this._initValue = el.checked
    }
  },

  update: function (value) {
    this.el.checked = !!value
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
  }

}
},{"../../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/default.js":[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el

    // check params
    // - lazy: update model on "change" instead of "input"
    var lazy = this._checkParam('lazy') != null
    // - number: cast value into number when updating model.
    var number = this._checkParam('number') != null

    // handle composition events.
    // http://blog.evanyou.me/2014/01/03/composition-event/
    var cpLocked = false
    this.cpLock = function () {
      cpLocked = true
    }
    this.cpUnlock = function () {
      cpLocked = false
      // in IE11 the "compositionend" event fires AFTER
      // the "input" event, so the input handler is blocked
      // at the end... have to call it here.
      set()
    }
    _.on(el,'compositionstart', this.cpLock)
    _.on(el,'compositionend', this.cpUnlock)

    // shared setter
    function set () {
      self.set(
        number ? _.toNumber(el.value) : el.value,
        true
      )
    }

    // if the directive has filters, we need to
    // record cursor position and restore it after updating
    // the input with the filtered value.
    // also force update for type="range" inputs to enable
    // "lock in range" (see #506)
    this.listener = this.filters || el.type === 'range'
      ? function textInputListener () {
          if (cpLocked) return
          var charsOffset
          // some HTML5 input types throw error here
          try {
            // record how many chars from the end of input
            // the cursor was at
            charsOffset = el.value.length - el.selectionStart
          } catch (e) {}
          // Fix IE10/11 infinite update cycle
          // https://github.com/yyx990803/vue/issues/592
          /* istanbul ignore if */
          if (charsOffset < 0) {
            return
          }
          set()
          _.nextTick(function () {
            // force a value update, because in
            // certain cases the write filters output the
            // same result for different input values, and
            // the Observer set events won't be triggered.
            var newVal = self._watcher.value
            self.update(newVal)
            if (charsOffset != null) {
              var cursorPos =
                _.toString(newVal).length - charsOffset
              el.setSelectionRange(cursorPos, cursorPos)
            }
          })
        }
      : function textInputListener () {
          if (cpLocked) return
          set()
        }

    this.event = lazy ? 'change' : 'input'
    _.on(el, this.event, this.listener)

    // IE9 doesn't fire input event on backspace/del/cut
    if (!lazy && _.isIE9) {
      this.onCut = function () {
        _.nextTick(self.listener)
      }
      this.onDel = function (e) {
        if (e.keyCode === 46 || e.keyCode === 8) {
          self.listener()
        }
      }
      _.on(el, 'cut', this.onCut)
      _.on(el, 'keyup', this.onDel)
    }

    // set initial value if present
    if (
      el.hasAttribute('value') ||
      (el.tagName === 'TEXTAREA' && el.value.trim())
    ) {
      this._initValue = number
        ? _.toNumber(el.value)
        : el.value
    }
  },

  update: function (value) {
    this.el.value = _.toString(value)
  },

  unbind: function () {
    var el = this.el
    _.off(el, this.event, this.listener)
    _.off(el,'compositionstart', this.cpLock)
    _.off(el,'compositionend', this.cpUnlock)
    if (this.onCut) {
      _.off(el,'cut', this.onCut)
      _.off(el,'keyup', this.onDel)
    }
  }

}
},{"../../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/index.js":[function(require,module,exports){
var _ = require('../../util')

var handlers = {
  _default: require('./default'),
  radio: require('./radio'),
  select: require('./select'),
  checkbox: require('./checkbox')
}

module.exports = {

  priority: 800,
  twoWay: true,
  handlers: handlers,

  /**
   * Possible elements:
   *   <select>
   *   <textarea>
   *   <input type="*">
   *     - text
   *     - checkbox
   *     - radio
   *     - number
   *     - TODO: more types may be supplied as a plugin
   */

  bind: function () {
    // friendly warning...
    var filters = this.filters
    if (filters && filters.read && !filters.write) {
      _.warn(
        'It seems you are using a read-only filter with ' +
        'v-model. You might want to use a two-way filter ' +
        'to ensure correct behavior.'
      )
    }
    var el = this.el
    var tag = el.tagName
    var handler
    if (tag === 'INPUT') {
      handler = handlers[el.type] || handlers._default
    } else if (tag === 'SELECT') {
      handler = handlers.select
    } else if (tag === 'TEXTAREA') {
      handler = handlers._default
    } else {
      _.warn("v-model doesn't support element type: " + tag)
      return
    }
    handler.bind.call(this)
    this.update = handler.update
    this.unbind = handler.unbind
  }

}
},{"../../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./checkbox":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/checkbox.js","./default":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/default.js","./radio":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/radio.js","./select":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/select.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/radio.js":[function(require,module,exports){
var _ = require('../../util')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    this.listener = function () {
      self.set(el.value, true)
    }
    _.on(el, 'change', this.listener)
    if (el.checked) {
      this._initValue = el.value
    }
  },

  update: function (value) {
    /* jshint eqeqeq: false */
    this.el.checked = value == this.el.value
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
  }

}
},{"../../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/model/select.js":[function(require,module,exports){
var _ = require('../../util')
var Watcher = require('../../watcher')

module.exports = {

  bind: function () {
    var self = this
    var el = this.el
    // check options param
    var optionsParam = this._checkParam('options')
    if (optionsParam) {
      initOptions.call(this, optionsParam)
    }
    this.multiple = el.hasAttribute('multiple')
    this.listener = function () {
      var value = self.multiple
        ? getMultiValue(el)
        : el.value
      self.set(value, true)
    }
    _.on(el, 'change', this.listener)
    checkInitialValue.call(this)
  },

  update: function (value) {
    /* jshint eqeqeq: false */
    var el = this.el
    el.selectedIndex = -1
    var multi = this.multiple && _.isArray(value)
    var options = el.options
    var i = options.length
    var option
    while (i--) {
      option = options[i]
      option.selected = multi
        ? indexOf(value, option.value) > -1
        : value == option.value
    }
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
    if (this.optionWatcher) {
      this.optionWatcher.teardown()
    }
  }

}

/**
 * Initialize the option list from the param.
 *
 * @param {String} expression
 */

function initOptions (expression) {
  var self = this
  function optionUpdateWatcher (value) {
    if (_.isArray(value)) {
      self.el.innerHTML = ''
      buildOptions(self.el, value)
      if (self._watcher) {
        self.update(self._watcher.value)
      }
    } else {
      _.warn('Invalid options value for v-model: ' + value)
    }
  }
  this.optionWatcher = new Watcher(
    this.vm,
    expression,
    optionUpdateWatcher
  )
  // update with initial value
  optionUpdateWatcher(this.optionWatcher.value)
}

/**
 * Build up option elements. IE9 doesn't create options
 * when setting innerHTML on <select> elements, so we have
 * to use DOM API here.
 *
 * @param {Element} parent - a <select> or an <optgroup>
 * @param {Array} options
 */

function buildOptions (parent, options) {
  var op, el
  for (var i = 0, l = options.length; i < l; i++) {
    op = options[i]
    if (!op.options) {
      el = document.createElement('option')
      if (typeof op === 'string') {
        el.text = el.value = op
      } else {
        el.text = op.text
        el.value = op.value
      }
    } else {
      el = document.createElement('optgroup')
      el.label = op.label
      buildOptions(el, op.options)
    }
    parent.appendChild(el)
  }
}

/**
 * Check the initial value for selected options.
 */

function checkInitialValue () {
  var initValue
  var options = this.el.options
  for (var i = 0, l = options.length; i < l; i++) {
    if (options[i].hasAttribute('selected')) {
      if (this.multiple) {
        (initValue || (initValue = []))
          .push(options[i].value)
      } else {
        initValue = options[i].value
      }
    }
  }
  if (initValue) {
    this._initValue = initValue
  }
}

/**
 * Helper to extract a value array for select[multiple]
 *
 * @param {SelectElement} el
 * @return {Array}
 */

function getMultiValue (el) {
  return Array.prototype.filter
    .call(el.options, filterSelected)
    .map(getOptionValue)
}

function filterSelected (op) {
  return op.selected
}

function getOptionValue (op) {
  return op.value || op.text
}

/**
 * Native Array.indexOf uses strict equal, but in this
 * case we need to match string/numbers with soft equal.
 *
 * @param {Array} arr
 * @param {*} val
 */

function indexOf (arr, val) {
  /* jshint eqeqeq: false */
  var i = arr.length
  while (i--) {
    if (arr[i] == val) return i
  }
  return -1
}
},{"../../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","../../watcher":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/watcher.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/on.js":[function(require,module,exports){
var _ = require('../util')

module.exports = {

  acceptStatement: true,
  priority: 700,

  bind: function () {
    // deal with iframes
    if (
      this.el.tagName === 'IFRAME' &&
      this.arg !== 'load'
    ) {
      var self = this
      this.iframeBind = function () {
        _.on(self.el.contentWindow, self.arg, self.handler)
      }
      _.on(this.el, 'load', this.iframeBind)
    }
  },

  update: function (handler) {
    if (typeof handler !== 'function') {
      _.warn(
        'Directive "v-on:' + this.expression + '" ' +
        'expects a function value.'
      )
      return
    }
    this.reset()
    var vm = this.vm
    this.handler = function (e) {
      e.targetVM = vm
      vm.$event = e
      var res = handler(e)
      vm.$event = null
      return res
    }
    if (this.iframeBind) {
      this.iframeBind()
    } else {
      _.on(this.el, this.arg, this.handler)
    }
  },

  reset: function () {
    var el = this.iframeBind
      ? this.el.contentWindow
      : this.el
    if (this.handler) {
      _.off(el, this.arg, this.handler)
    }
  },

  unbind: function () {
    this.reset()
    _.off(this.el, 'load', this.iframeBind)
  }
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/partial.js":[function(require,module,exports){
var _ = require('../util')
var templateParser = require('../parsers/template')
var vIf = require('./if')

module.exports = {

  isLiteral: true,

  // same logic reuse from v-if
  compile: vIf.compile,
  teardown: vIf.teardown,

  bind: function () {
    var el = this.el
    this.start = document.createComment('v-partial-start')
    this.end = document.createComment('v-partial-end')
    if (el.nodeType !== 8) {
      el.innerHTML = ''
    }
    if (el.tagName === 'TEMPLATE' || el.nodeType === 8) {
      _.replace(el, this.end)
    } else {
      el.appendChild(this.end)
    }
    _.before(this.start, this.end)
    if (!this._isDynamicLiteral) {
      this.insert(this.expression)
    }
  },

  update: function (id) {
    this.teardown()
    this.insert(id)
  },

  insert: function (id) {
    var partial = this.vm.$options.partials[id]
    _.assertAsset(partial, 'partial', id)
    if (partial) {
      this.compile(templateParser.parse(partial))
    }
  }

}
},{"../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./if":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/if.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/ref.js":[function(require,module,exports){
var _ = require('../util')

module.exports = {

  isLiteral: true,

  bind: function () {
    if (this.el !== this.vm.$el) {
      _.warn(
        'v-ref should only be used on instance root nodes.'
      )
      return
    }
    this.owner = this.vm.$parent
    this.owner.$[this.expression] = this.vm
  },

  unbind: function () {
    if (this.owner.$[this.expression] === this.vm) {
      delete this.owner.$[this.expression]
    }
  }
  
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/repeat.js":[function(require,module,exports){
var _ = require('../util')
var isObject = _.isObject
var textParser = require('../parsers/text')
var expParser = require('../parsers/expression')
var templateParser = require('../parsers/template')
var compile = require('../compiler/compile')
var transclude = require('../compiler/transclude')
var mergeOptions = require('../util/merge-option')
var uid = 0

module.exports = {

  /**
   * Setup.
   */

  bind: function () {
    // uid as a cache identifier
    this.id = '__v_repeat_' + (++uid)
    // we need to insert the objToArray converter
    // as the first read filter, because it has to be invoked
    // before any user filters. (can't do it in `update`)
    if (!this.filters) {
      this.filters = {}
    }
    // add the object -> array convert filter
    var objectConverter = _.bind(objToArray, this)
    if (!this.filters.read) {
      this.filters.read = [objectConverter]
    } else {
      this.filters.read.unshift(objectConverter)
    }
    // setup ref node
    this.ref = document.createComment('v-repeat')
    _.replace(this.el, this.ref)
    // check if this is a block repeat
    this.template = this.el.tagName === 'TEMPLATE'
      ? templateParser.parse(this.el, true)
      : this.el
    // check other directives that need to be handled
    // at v-repeat level
    this.checkIf()
    this.checkRef()
    this.checkComponent()
    // check for trackby param
    this.idKey =
      this._checkParam('track-by') ||
      this._checkParam('trackby') // 0.11.0 compat
    // cache for primitive value instances
    this.cache = Object.create(null)
  },

  /**
   * Warn against v-if usage.
   */

  checkIf: function () {
    if (_.attr(this.el, 'if') !== null) {
      _.warn(
        'Don\'t use v-if with v-repeat. ' +
        'Use v-show or the "filterBy" filter instead.'
      )
    }
  },

  /**
   * Check if v-ref/ v-el is also present.
   */

  checkRef: function () {
    var childId = _.attr(this.el, 'ref')
    this.childId = childId
      ? this.vm.$interpolate(childId)
      : null
    var elId = _.attr(this.el, 'el')
    this.elId = elId
      ? this.vm.$interpolate(elId)
      : null
  },

  /**
   * Check the component constructor to use for repeated
   * instances. If static we resolve it now, otherwise it
   * needs to be resolved at build time with actual data.
   */

  checkComponent: function () {
    var id = _.attr(this.el, 'component')
    var options = this.vm.$options
    if (!id) {
      this.Ctor = _.Vue // default constructor
      this.inherit = true // inline repeats should inherit
      // important: transclude with no options, just
      // to ensure block start and block end
      this.template = transclude(this.template)
      this._linkFn = compile(this.template, options)
    } else {
      this._asComponent = true
      var tokens = textParser.parse(id)
      if (!tokens) { // static component
        var Ctor = this.Ctor = options.components[id]
        _.assertAsset(Ctor, 'component', id)
        // If there's no parent scope directives and no
        // content to be transcluded, we can optimize the
        // rendering by pre-transcluding + compiling here
        // and provide a link function to every instance.
        if (!this.el.hasChildNodes() &&
            !this.el.hasAttributes()) {
          // merge an empty object with owner vm as parent
          // so child vms can access parent assets.
          var merged = mergeOptions(Ctor.options, {}, {
            $parent: this.vm
          })
          this.template = transclude(this.template, merged)
          this._linkFn = compile(this.template, merged)
        }
      } else {
        // to be resolved later
        var ctorExp = textParser.tokensToExp(tokens)
        this.ctorGetter = expParser.parse(ctorExp).get
      }
    }
  },

  /**
   * Update.
   * This is called whenever the Array mutates.
   *
   * @param {Array} data
   */

  update: function (data) {
    if (typeof data === 'number') {
      data = range(data)
    }
    this.vms = this.diff(data || [], this.vms)
    // update v-ref
    if (this.childId) {
      this.vm.$[this.childId] = this.vms
    }
    if (this.elId) {
      this.vm.$$[this.elId] = this.vms.map(function (vm) {
        return vm.$el
      })
    }
  },

  /**
   * Diff, based on new data and old data, determine the
   * minimum amount of DOM manipulations needed to make the
   * DOM reflect the new data Array.
   *
   * The algorithm diffs the new data Array by storing a
   * hidden reference to an owner vm instance on previously
   * seen data. This allows us to achieve O(n) which is
   * better than a levenshtein distance based algorithm,
   * which is O(m * n).
   *
   * @param {Array} data
   * @param {Array} oldVms
   * @return {Array}
   */

  diff: function (data, oldVms) {
    var idKey = this.idKey
    var converted = this.converted
    var ref = this.ref
    var alias = this.arg
    var init = !oldVms
    var vms = new Array(data.length)
    var obj, raw, vm, i, l
    // First pass, go through the new Array and fill up
    // the new vms array. If a piece of data has a cached
    // instance for it, we reuse it. Otherwise build a new
    // instance.
    for (i = 0, l = data.length; i < l; i++) {
      obj = data[i]
      raw = converted ? obj.value : obj
      vm = !init && this.getVm(raw)
      if (vm) { // reusable instance
        vm._reused = true
        vm.$index = i // update $index
        if (converted) {
          vm.$key = obj.key // update $key
        }
        if (idKey) { // swap track by id data
          if (alias) {
            vm[alias] = raw
          } else {
            vm._setData(raw)
          }
        }
      } else { // new instance
        vm = this.build(obj, i)
        vm._new = true
      }
      vms[i] = vm
      // insert if this is first run
      if (init) {
        vm.$before(ref)
      }
    }
    // if this is the first run, we're done.
    if (init) {
      return vms
    }
    // Second pass, go through the old vm instances and
    // destroy those who are not reused (and remove them
    // from cache)
    for (i = 0, l = oldVms.length; i < l; i++) {
      vm = oldVms[i]
      if (!vm._reused) {
        this.uncacheVm(vm)
        vm.$destroy(true)
      }
    }
    // final pass, move/insert new instances into the
    // right place. We're going in reverse here because
    // insertBefore relies on the next sibling to be
    // resolved.
    var targetNext, currentNext
    i = vms.length
    while (i--) {
      vm = vms[i]
      // this is the vm that we should be in front of
      targetNext = vms[i + 1]
      if (!targetNext) {
        // This is the last item. If it's reused then
        // everything else will eventually be in the right
        // place, so no need to touch it. Otherwise, insert
        // it.
        if (!vm._reused) {
          vm.$before(ref)
        }
      } else {
        if (vm._reused) {
          // this is the vm we are actually in front of
          currentNext = findNextVm(vm, ref)
          // we only need to move if we are not in the right
          // place already.
          if (currentNext !== targetNext) {
            vm.$before(targetNext.$el, null, false)
          }
        } else {
          // new instance, insert to existing next
          vm.$before(targetNext.$el)
        }
      }
      vm._new = false
      vm._reused = false
    }
    return vms
  },

  /**
   * Build a new instance and cache it.
   *
   * @param {Object} data
   * @param {Number} index
   */

  build: function (data, index) {
    var original = data
    var meta = { $index: index }
    if (this.converted) {
      meta.$key = original.key
    }
    var raw = this.converted ? data.value : data
    var alias = this.arg
    var hasAlias = !isObject(raw) || alias
    // wrap the raw data with alias
    data = hasAlias ? {} : raw
    if (alias) {
      data[alias] = raw
    } else if (hasAlias) {
      meta.$value = raw
    }
    // resolve constructor
    var Ctor = this.Ctor || this.resolveCtor(data, meta)
    var vm = this.vm.$addChild({
      el: templateParser.clone(this.template),
      _asComponent: this._asComponent,
      _linkFn: this._linkFn,
      _meta: meta,
      data: data,
      inherit: this.inherit
    }, Ctor)
    // cache instance
    this.cacheVm(raw, vm)
    return vm
  },

  /**
   * Resolve a contructor to use for an instance.
   * The tricky part here is that there could be dynamic
   * components depending on instance data.
   *
   * @param {Object} data
   * @param {Object} meta
   * @return {Function}
   */

  resolveCtor: function (data, meta) {
    // create a temporary context object and copy data
    // and meta properties onto it.
    // use _.define to avoid accidentally overwriting scope
    // properties.
    var context = Object.create(this.vm)
    var key
    for (key in data) {
      _.define(context, key, data[key])
    }
    for (key in meta) {
      _.define(context, key, meta[key])
    }
    var id = this.ctorGetter.call(context, context)
    var Ctor = this.vm.$options.components[id]
    _.assertAsset(Ctor, 'component', id)
    return Ctor
  },

  /**
   * Unbind, teardown everything
   */

  unbind: function () {
    if (this.childId) {
      delete this.vm.$[this.childId]
    }
    if (this.vms) {
      var i = this.vms.length
      var vm
      while (i--) {
        vm = this.vms[i]
        this.uncacheVm(vm)
        vm.$destroy()
      }
    }
  },

  /**
   * Cache a vm instance based on its data.
   *
   * If the data is an object, we save the vm's reference on
   * the data object as a hidden property. Otherwise we
   * cache them in an object and for each primitive value
   * there is an array in case there are duplicates.
   *
   * @param {Object} data
   * @param {Vue} vm
   */

  cacheVm: function (data, vm) {
    var idKey = this.idKey
    var cache = this.cache
    var id
    if (idKey) {
      id = data[idKey]
      if (!cache[id]) {
        cache[id] = vm
      } else {
        _.warn('Duplicate ID in v-repeat: ' + id)
      }
    } else if (isObject(data)) {
      id = this.id
      if (data.hasOwnProperty(id)) {
        if (data[id] === null) {
          data[id] = vm
        } else {
          _.warn(
            'Duplicate objects are not supported in v-repeat.'
          )
        }
      } else {
        _.define(data, this.id, vm)
      }
    } else {
      if (!cache[data]) {
        cache[data] = [vm]
      } else {
        cache[data].push(vm)
      }
    }
    vm._raw = data
  },

  /**
   * Try to get a cached instance from a piece of data.
   *
   * @param {Object} data
   * @return {Vue|undefined}
   */

  getVm: function (data) {
    if (this.idKey) {
      return this.cache[data[this.idKey]]
    } else if (isObject(data)) {
      return data[this.id]
    } else {
      var cached = this.cache[data]
      if (cached) {
        var i = 0
        var vm = cached[i]
        // since duplicated vm instances might be a reused
        // one OR a newly created one, we need to return the
        // first instance that is neither of these.
        while (vm && (vm._reused || vm._new)) {
          vm = cached[++i]
        }
        return vm
      }
    }
  },

  /**
   * Delete a cached vm instance.
   *
   * @param {Vue} vm
   */

  uncacheVm: function (vm) {
    var data = vm._raw
    if (this.idKey) {
      this.cache[data[this.idKey]] = null
    } else if (isObject(data)) {
      data[this.id] = null
      vm._raw = null
    } else {
      this.cache[data].pop()
    }
  }

}

/**
 * Helper to find the next element that is an instance
 * root node. This is necessary because a destroyed vm's
 * element could still be lingering in the DOM before its
 * leaving transition finishes, but its __vue__ reference
 * should have been removed so we can skip them.
 *
 * @param {Vue} vm
 * @param {CommentNode} ref
 * @return {Vue}
 */

function findNextVm (vm, ref) {
  var el = (vm._blockEnd || vm.$el).nextSibling
  while (!el.__vue__ && el !== ref) {
    el = el.nextSibling
  }
  return el.__vue__
}

/**
 * Attempt to convert non-Array objects to array.
 * This is the default filter installed to every v-repeat
 * directive.
 *
 * It will be called with **the directive** as `this`
 * context so that we can mark the repeat array as converted
 * from an object.
 *
 * @param {*} obj
 * @return {Array}
 * @private
 */

function objToArray (obj) {
  if (!_.isPlainObject(obj)) {
    return obj
  }
  var keys = Object.keys(obj)
  var i = keys.length
  var res = new Array(i)
  var key
  while (i--) {
    key = keys[i]
    res[i] = {
      key: key,
      value: obj[key]
    }
  }
  // `this` points to the repeat directive instance
  this.converted = true
  return res
}

/**
 * Create a range array from given number.
 *
 * @param {Number} n
 * @return {Array}
 */

function range (n) {
  var i = -1
  var ret = new Array(n)
  while (++i < n) {
    ret[i] = i
  }
  return ret
}
},{"../compiler/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js","../compiler/transclude":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/transclude.js","../parsers/expression":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js","../parsers/template":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js","../parsers/text":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","../util/merge-option":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/merge-option.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/show.js":[function(require,module,exports){
var transition = require('../transition')

module.exports = function (value) {
  var el = this.el
  transition.apply(el, value ? 1 : -1, function () {
    el.style.display = value ? '' : 'none'
  }, this.vm)
}
},{"../transition":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/style.js":[function(require,module,exports){
var prefixes = ['-webkit-', '-moz-', '-ms-']
var importantRE = /!important;?$/

module.exports = {

  deep: true,

  bind: function () {
    var prop = this.arg
    if (!prop) return
    this.prop = prop
  },

  update: function (value) {
    if (this.prop) {
      this.setCssProperty(this.prop, value)
    } else {
      if (typeof value === 'object') {
        for (var prop in value) {
          this.setCssProperty(prop, value[prop])
        }
      } else {
        this.el.style.cssText = value
      }
    }
  },

  setCssProperty: function (prop, value) {
    var prefixed = false
    if (prop.charAt(0) === '$') {
      // properties that start with $ will be auto-prefixed
      prop = prop.slice(1)
      prefixed = true
    }
    // cast possible numbers/booleans into strings
    if (value != null) {
      value += ''
    }
    var isImportant = importantRE.test(value)
      ? 'important'
      : ''
    if (isImportant) {
      value = value.replace(importantRE, '').trim()
    }
    this.el.style.setProperty(prop, value, isImportant)
    if (prefixed) {
      var i = prefixes.length
      while (i--) {
        this.el.style.setProperty(
          prefixes[i] + prop,
          value,
          isImportant
        )
      }
    }
  }

}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/text.js":[function(require,module,exports){
var _ = require('../util')

module.exports = {

  bind: function () {
    this.attr = this.el.nodeType === 3
      ? 'nodeValue'
      : 'textContent'
  },

  update: function (value) {
    this.el[this.attr] = _.toString(value)
  }
  
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/transition.js":[function(require,module,exports){
module.exports = {

  priority: 1000,
  isLiteral: true,

  bind: function () {
    this.el.__v_trans = {
      id: this.expression
    }
  }

}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/with.js":[function(require,module,exports){
var _ = require('../util')
var Watcher = require('../watcher')

module.exports = {

  priority: 900,

  bind: function () {
    var vm = this.vm
    if (this.el !== vm.$el) {
      _.warn(
        'v-with can only be used on instance root elements.'
      )
    } else if (!vm.$parent) {
      _.warn(
        'v-with must be used on an instance with a parent.'
      )
    } else {
      var key = this.arg
      this.watcher = new Watcher(
        vm.$parent,
        this.expression,
        key
          ? function (val) {
              vm.$set(key, val)
            }
          : function (val) {
              vm.$data = val
            }
      )
      // initial set
      var initialVal = this.watcher.value
      if (key) {
        vm.$set(key, initialVal)
      } else {
        vm.$data = initialVal
      }
    }
  },

  unbind: function () {
    if (this.watcher) {
      this.watcher.teardown()
    }
  }

}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","../watcher":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/watcher.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/filters/array-filters.js":[function(require,module,exports){
var _ = require('../util')
var Path = require('../parsers/path')

/**
 * Filter filter for v-repeat
 *
 * @param {String} searchKey
 * @param {String} [delimiter]
 * @param {String} dataKey
 */

exports.filterBy = function (arr, searchKey, delimiter, dataKey) {
  // allow optional `in` delimiter
  // because why not
  if (delimiter && delimiter !== 'in') {
    dataKey = delimiter
  }
  // get the search string
  var search =
    _.stripQuotes(searchKey) ||
    this.$get(searchKey)
  if (!search) {
    return arr
  }
  search = ('' + search).toLowerCase()
  // get the optional dataKey
  dataKey =
    dataKey &&
    (_.stripQuotes(dataKey) || this.$get(dataKey))
  return arr.filter(function (item) {
    return dataKey
      ? contains(Path.get(item, dataKey), search)
      : contains(item, search)
  })
}

/**
 * Filter filter for v-repeat
 *
 * @param {String} sortKey
 * @param {String} reverseKey
 */

exports.orderBy = function (arr, sortKey, reverseKey) {
  var key =
    _.stripQuotes(sortKey) ||
    this.$get(sortKey)
  if (!key) {
    return arr
  }
  var order = 1
  if (reverseKey) {
    if (reverseKey === '-1') {
      order = -1
    } else if (reverseKey.charCodeAt(0) === 0x21) { // !
      reverseKey = reverseKey.slice(1)
      order = this.$get(reverseKey) ? 1 : -1
    } else {
      order = this.$get(reverseKey) ? -1 : 1
    }
  }
  // sort on a copy to avoid mutating original array
  return arr.slice().sort(function (a, b) {
    a = Path.get(a, key)
    b = Path.get(b, key)
    return a === b ? 0 : a > b ? order : -order
  })
}

/**
 * String contain helper
 *
 * @param {*} val
 * @param {String} search
 */

function contains (val, search) {
  if (_.isObject(val)) {
    for (var key in val) {
      if (contains(val[key], search)) {
        return true
      }
    }
  } else if (val != null) {
    return val.toString().toLowerCase().indexOf(search) > -1
  }
}
},{"../parsers/path":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/path.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/filters/index.js":[function(require,module,exports){
var _ = require('../util')

/**
 * Stringify value.
 *
 * @param {Number} indent
 */

exports.json = {
  read: function (value, indent) {
    return typeof value === 'string'
      ? value
      : JSON.stringify(value, null, Number(indent) || 2)
  },
  write: function (value) {
    try {
      return JSON.parse(value)
    } catch (e) {
      return value
    }
  }
}

/**
 * 'abc' => 'Abc'
 */

exports.capitalize = function (value) {
  if (!value && value !== 0) return ''
  value = value.toString()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * 'abc' => 'ABC'
 */

exports.uppercase = function (value) {
  return (value || value === 0)
    ? value.toString().toUpperCase()
    : ''
}

/**
 * 'AbC' => 'abc'
 */

exports.lowercase = function (value) {
  return (value || value === 0)
    ? value.toString().toLowerCase()
    : ''
}

/**
 * 12345 => $12,345.00
 *
 * @param {String} sign
 */

var digitsRE = /(\d{3})(?=\d)/g

exports.currency = function (value, sign) {
  value = parseFloat(value)
  if (!value && value !== 0) return ''
  sign = sign || '$'
  var s = Math.floor(Math.abs(value)).toString(),
    i = s.length % 3,
    h = i > 0
      ? (s.slice(0, i) + (s.length > 3 ? ',' : ''))
      : '',
    f = '.' + value.toFixed(2).slice(-2)
  return (value < 0 ? '-' : '') +
    sign + h + s.slice(i).replace(digitsRE, '$1,') + f
}

/**
 * 'item' => 'items'
 *
 * @params
 *  an array of strings corresponding to
 *  the single, double, triple ... forms of the word to
 *  be pluralized. When the number to be pluralized
 *  exceeds the length of the args, it will use the last
 *  entry in the array.
 *
 *  e.g. ['single', 'double', 'triple', 'multiple']
 */

exports.pluralize = function (value) {
  var args = _.toArray(arguments, 1)
  return args.length > 1
    ? (args[value % 10 - 1] || args[args.length - 1])
    : (args[0] + (value === 1 ? '' : 's'))
}

/**
 * A special filter that takes a handler function,
 * wraps it so it only gets triggered on specific
 * keypresses. v-on only.
 *
 * @param {String} key
 */

var keyCodes = {
  enter    : 13,
  tab      : 9,
  'delete' : 46,
  up       : 38,
  left     : 37,
  right    : 39,
  down     : 40,
  esc      : 27
}

exports.key = function (handler, key) {
  if (!handler) return
  var code = keyCodes[key]
  if (!code) {
    code = parseInt(key, 10)
  }
  return function (e) {
    if (e.keyCode === code) {
      return handler.call(this, e)
    }
  }
}

// expose keycode hash
exports.key.keyCodes = keyCodes

/**
 * Install special array filters
 */

_.extend(exports, require('./array-filters'))
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./array-filters":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/filters/array-filters.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/compile.js":[function(require,module,exports){
var _ = require('../util')
var Directive = require('../directive')
var compile = require('../compiler/compile')
var transclude = require('../compiler/transclude')

/**
 * Transclude, compile and link element.
 *
 * If a pre-compiled linker is available, that means the
 * passed in element will be pre-transcluded and compiled
 * as well - all we need to do is to call the linker.
 *
 * Otherwise we need to call transclude/compile/link here.
 *
 * @param {Element} el
 * @return {Element}
 */

exports._compile = function (el) {
  var options = this.$options
  var parent = options._parent
  if (options._linkFn) {
    this._initElement(el)
    options._linkFn(this, el)
  } else {
    var raw = el
    if (options._asComponent) {
      // separate container element and content
      var content = options._content = _.extractContent(raw)
      // create two separate linekrs for container and content
      var parentOptions = parent.$options
      
      // hack: we need to skip the paramAttributes for this
      // child instance when compiling its parent container
      // linker. there could be a better way to do this.
      parentOptions._skipAttrs = options.paramAttributes
      var containerLinkFn =
        compile(raw, parentOptions, true, true)
      parentOptions._skipAttrs = null

      if (content) {
        var contentLinkFn =
          compile(content, parentOptions, true)
        // call content linker now, before transclusion
        this._contentUnlinkFn = contentLinkFn(parent, content)
      }
      // tranclude, this possibly replaces original
      el = transclude(el, options)
      // now call the container linker on the resolved el
      this._containerUnlinkFn = containerLinkFn(parent, el)
    } else {
      // simply transclude
      el = transclude(el, options)
    }
    this._initElement(el)
    var linkFn = compile(el, options)
    linkFn(this, el)
    if (options.replace) {
      _.replace(raw, el)
    }
  }
  return el
}

/**
 * Initialize instance element. Called in the public
 * $mount() method.
 *
 * @param {Element} el
 */

exports._initElement = function (el) {
  if (el instanceof DocumentFragment) {
    this._isBlock = true
    this.$el = this._blockStart = el.firstChild
    this._blockEnd = el.lastChild
    this._blockFragment = el
  } else {
    this.$el = el
  }
  this.$el.__vue__ = this
  this._callHook('beforeCompile')
}

/**
 * Create and bind a directive to an element.
 *
 * @param {String} name - directive name
 * @param {Node} node   - target node
 * @param {Object} desc - parsed directive descriptor
 * @param {Object} def  - directive definition object
 */

exports._bindDir = function (name, node, desc, def) {
  this._directives.push(
    new Directive(name, node, this, desc, def)
  )
}

/**
 * Teardown an instance, unobserves the data, unbind all the
 * directives, turn off all the event listeners, etc.
 *
 * @param {Boolean} remove - whether to remove the DOM node.
 * @param {Boolean} deferCleanup - if true, defer cleanup to
 *                                 be called later
 */

exports._destroy = function (remove, deferCleanup) {
  if (this._isBeingDestroyed) {
    return
  }
  this._callHook('beforeDestroy')
  this._isBeingDestroyed = true
  var i
  // remove self from parent. only necessary
  // if parent is not being destroyed as well.
  var parent = this.$parent
  if (parent && !parent._isBeingDestroyed) {
    i = parent._children.indexOf(this)
    parent._children.splice(i, 1)
  }
  // destroy all children.
  if (this._children) {
    i = this._children.length
    while (i--) {
      this._children[i].$destroy()
    }
  }
  // teardown parent linkers
  if (this._containerUnlinkFn) {
    this._containerUnlinkFn()
  }
  if (this._contentUnlinkFn) {
    this._contentUnlinkFn()
  }
  // teardown all directives. this also tearsdown all
  // directive-owned watchers. intentionally check for
  // directives array length on every loop since directives
  // that manages partial compilation can splice ones out
  for (i = 0; i < this._directives.length; i++) {
    this._directives[i]._teardown()
  }
  // teardown all user watchers.
  for (i in this._userWatchers) {
    this._userWatchers[i].teardown()
  }
  // remove reference to self on $el
  if (this.$el) {
    this.$el.__vue__ = null
  }
  // remove DOM element
  var self = this
  if (remove && this.$el) {
    this.$remove(function () {
      self._cleanup()
    })
  } else if (!deferCleanup) {
    this._cleanup()
  }
}

/**
 * Clean up to ensure garbage collection.
 * This is called after the leave transition if there
 * is any.
 */

exports._cleanup = function () {
  // remove reference from data ob
  this._data.__ob__.removeVm(this)
  this._data =
  this._watchers =
  this._userWatchers =
  this._watcherList =
  this.$el =
  this.$parent =
  this.$root =
  this._children =
  this._directives = null
  // call the last hook...
  this._isDestroyed = true
  this._callHook('destroyed')
  // turn off all instance listeners.
  this.$off()
}
},{"../compiler/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/compile.js","../compiler/transclude":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/compiler/transclude.js","../directive":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directive.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/events.js":[function(require,module,exports){
var _ = require('../util')
var inDoc = _.inDoc

/**
 * Setup the instance's option events & watchers.
 * If the value is a string, we pull it from the
 * instance's methods by name.
 */

exports._initEvents = function () {
  var options = this.$options
  registerCallbacks(this, '$on', options.events)
  registerCallbacks(this, '$watch', options.watch)
}

/**
 * Register callbacks for option events and watchers.
 *
 * @param {Vue} vm
 * @param {String} action
 * @param {Object} hash
 */

function registerCallbacks (vm, action, hash) {
  if (!hash) return
  var handlers, key, i, j
  for (key in hash) {
    handlers = hash[key]
    if (_.isArray(handlers)) {
      for (i = 0, j = handlers.length; i < j; i++) {
        register(vm, action, key, handlers[i])
      }
    } else {
      register(vm, action, key, handlers)
    }
  }
}

/**
 * Helper to register an event/watch callback.
 *
 * @param {Vue} vm
 * @param {String} action
 * @param {String} key
 * @param {*} handler
 */

function register (vm, action, key, handler) {
  var type = typeof handler
  if (type === 'function') {
    vm[action](key, handler)
  } else if (type === 'string') {
    var methods = vm.$options.methods
    var method = methods && methods[handler]
    if (method) {
      vm[action](key, method)
    } else {
      _.warn(
        'Unknown method: "' + handler + '" when ' +
        'registering callback for ' + action +
        ': "' + key + '".'
      )
    }
  }
}

/**
 * Setup recursive attached/detached calls
 */

exports._initDOMHooks = function () {
  this.$on('hook:attached', onAttached)
  this.$on('hook:detached', onDetached)
}

/**
 * Callback to recursively call attached hook on children
 */

function onAttached () {
  this._isAttached = true
  var children = this._children
  if (!children) return
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    if (!child._isAttached && inDoc(child.$el)) {
      child._callHook('attached')
    }
  }
}

/**
 * Callback to recursively call detached hook on children
 */

function onDetached () {
  this._isAttached = false
  var children = this._children
  if (!children) return
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    if (child._isAttached && !inDoc(child.$el)) {
      child._callHook('detached')
    }
  }
}

/**
 * Trigger all handlers for a hook
 *
 * @param {String} hook
 */

exports._callHook = function (hook) {
  var handlers = this.$options[hook]
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      handlers[i].call(this)
    }
  }
  this.$emit('hook:' + hook)
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/init.js":[function(require,module,exports){
var mergeOptions = require('../util/merge-option')

/**
 * The main init sequence. This is called for every
 * instance, including ones that are created from extended
 * constructors.
 *
 * @param {Object} options - this options object should be
 *                           the result of merging class
 *                           options and the options passed
 *                           in to the constructor.
 */

exports._init = function (options) {

  options = options || {}

  this.$el           = null
  this.$parent       = options._parent
  this.$root         = options._root || this
  this.$             = {} // child vm references
  this.$$            = {} // element references
  this._watcherList  = [] // all watchers as an array
  this._watchers     = {} // internal watchers as a hash
  this._userWatchers = {} // user watchers as a hash
  this._directives   = [] // all directives

  // a flag to avoid this being observed
  this._isVue = true

  // events bookkeeping
  this._events         = {}    // registered callbacks
  this._eventsCount    = {}    // for $broadcast optimization
  this._eventCancelled = false // for event cancellation

  // block instance properties
  this._isBlock     = false
  this._blockStart  =          // @type {CommentNode}
  this._blockEnd    = null     // @type {CommentNode}

  // lifecycle state
  this._isCompiled  =
  this._isDestroyed =
  this._isReady     =
  this._isAttached  =
  this._isBeingDestroyed = false

  // children
  this._children =         // @type {Array}
  this._childCtors = null  // @type {Object} - hash to cache
                           // child constructors

  // merge options.
  options = this.$options = mergeOptions(
    this.constructor.options,
    options,
    this
  )

  // set data after merge.
  this._data = options.data || {}

  // initialize data observation and scope inheritance.
  this._initScope()

  // setup event system and option events.
  this._initEvents()

  // call created hook
  this._callHook('created')

  // if `el` option is passed, start compilation.
  if (options.el) {
    this.$mount(options.el)
  }
}
},{"../util/merge-option":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/merge-option.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/scope.js":[function(require,module,exports){
var _ = require('../util')
var Observer = require('../observer')
var Dep = require('../observer/dep')

/**
 * Setup the scope of an instance, which contains:
 * - observed data
 * - computed properties
 * - user methods
 * - meta properties
 */

exports._initScope = function () {
  this._initData()
  this._initComputed()
  this._initMethods()
  this._initMeta()
}

/**
 * Initialize the data. 
 */

exports._initData = function () {
  // proxy data on instance
  var data = this._data
  var keys = Object.keys(data)
  var i = keys.length
  var key
  while (i--) {
    key = keys[i]
    if (!_.isReserved(key)) {
      this._proxy(key)
    }
  }
  // observe data
  Observer.create(data).addVm(this)
}

/**
 * Swap the isntance's $data. Called in $data's setter.
 *
 * @param {Object} newData
 */

exports._setData = function (newData) {
  newData = newData || {}
  var oldData = this._data
  this._data = newData
  var keys, key, i
  // unproxy keys not present in new data
  keys = Object.keys(oldData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!_.isReserved(key) && !(key in newData)) {
      this._unproxy(key)
    }
  }
  // proxy keys not already proxied,
  // and trigger change for changed values
  keys = Object.keys(newData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!this.hasOwnProperty(key) && !_.isReserved(key)) {
      // new property
      this._proxy(key)
    }
  }
  oldData.__ob__.removeVm(this)
  Observer.create(newData).addVm(this)
  this._digest()
}

/**
 * Proxy a property, so that
 * vm.prop === vm._data.prop
 *
 * @param {String} key
 */

exports._proxy = function (key) {
  // need to store ref to self here
  // because these getter/setters might
  // be called by child instances!
  var self = this
  Object.defineProperty(self, key, {
    configurable: true,
    enumerable: true,
    get: function proxyGetter () {
      return self._data[key]
    },
    set: function proxySetter (val) {
      self._data[key] = val
    }
  })
}

/**
 * Unproxy a property.
 *
 * @param {String} key
 */

exports._unproxy = function (key) {
  delete this[key]
}

/**
 * Force update on every watcher in scope.
 */

exports._digest = function () {
  var i = this._watcherList.length
  while (i--) {
    this._watcherList[i].update()
  }
  var children = this._children
  var child
  if (children) {
    i = children.length
    while (i--) {
      child = children[i]
      if (child.$options.inherit) {
        child._digest()
      }
    }
  }
}

/**
 * Setup computed properties. They are essentially
 * special getter/setters
 */

function noop () {}
exports._initComputed = function () {
  var computed = this.$options.computed
  if (computed) {
    for (var key in computed) {
      var userDef = computed[key]
      var def = {
        enumerable: true,
        configurable: true
      }
      if (typeof userDef === 'function') {
        def.get = _.bind(userDef, this)
        def.set = noop
      } else {
        def.get = userDef.get
          ? _.bind(userDef.get, this)
          : noop
        def.set = userDef.set
          ? _.bind(userDef.set, this)
          : noop
      }
      Object.defineProperty(this, key, def)
    }
  }
}

/**
 * Setup instance methods. Methods must be bound to the
 * instance since they might be called by children
 * inheriting them.
 */

exports._initMethods = function () {
  var methods = this.$options.methods
  if (methods) {
    for (var key in methods) {
      this[key] = _.bind(methods[key], this)
    }
  }
}

/**
 * Initialize meta information like $index, $key & $value.
 */

exports._initMeta = function () {
  var metas = this.$options._meta
  if (metas) {
    for (var key in metas) {
      this._defineMeta(key, metas[key])
    }
  }
}

/**
 * Define a meta property, e.g $index, $key, $value
 * which only exists on the vm instance but not in $data.
 *
 * @param {String} key
 * @param {*} value
 */

exports._defineMeta = function (key, value) {
  var dep = new Dep()
  Object.defineProperty(this, key, {
    enumerable: true,
    configurable: true,
    get: function metaGetter () {
      if (Observer.target) {
        Observer.target.addDep(dep)
      }
      return value
    },
    set: function metaSetter (val) {
      if (val !== value) {
        value = val
        dep.notify()
      }
    }
  })
}
},{"../observer":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/index.js","../observer/dep":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/dep.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/array.js":[function(require,module,exports){
var _ = require('../util')
var arrayProto = Array.prototype
var arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */

;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  var original = arrayProto[method]
  _.define(arrayMethods, method, function mutator () {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }
    var result = original.apply(this, args)
    var ob = this.__ob__
    var inserted
    switch (method) {
      case 'push':
        inserted = args
        break
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.notify()
    return result
  })
})

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} val
 * @return {*} - replaced element
 */

_.define(
  arrayProto,
  '$set',
  function $set (index, val) {
    if (index >= this.length) {
      this.length = index + 1
    }
    return this.splice(index, 1, val)[0]
  }
)

/**
 * Convenience method to remove the element at given index.
 *
 * @param {Number} index
 * @param {*} val
 */

_.define(
  arrayProto,
  '$remove',
  function $remove (index) {
    if (typeof index !== 'number') {
      index = this.indexOf(index)
    }
    if (index > -1) {
      return this.splice(index, 1)[0]
    }
  }
)

module.exports = arrayMethods
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/dep.js":[function(require,module,exports){
var uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 *
 * @constructor
 */

function Dep () {
  this.id = ++uid
  this.subs = []
}

var p = Dep.prototype

/**
 * Add a directive subscriber.
 *
 * @param {Directive} sub
 */

p.addSub = function (sub) {
  this.subs.push(sub)
}

/**
 * Remove a directive subscriber.
 *
 * @param {Directive} sub
 */

p.removeSub = function (sub) {
  if (this.subs.length) {
    var i = this.subs.indexOf(sub)
    if (i > -1) this.subs.splice(i, 1)
  }
}

/**
 * Notify all subscribers of a new value.
 */

p.notify = function () {
  for (var i = 0, l = this.subs.length; i < l; i++) {
    this.subs[i].update()
  }
}

module.exports = Dep
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/index.js":[function(require,module,exports){
var _ = require('../util')
var config = require('../config')
var Dep = require('./dep')
var arrayMethods = require('./array')
var arrayKeys = Object.getOwnPropertyNames(arrayMethods)
require('./object')

var uid = 0

/**
 * Type enums
 */

var ARRAY  = 0
var OBJECT = 1

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function protoAugment (target, src) {
  target.__proto__ = src
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment (target, src, keys) {
  var i = keys.length
  var key
  while (i--) {
    key = keys[i]
    _.define(target, key, src[key])
  }
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * @param {Array|Object} value
 * @param {Number} type
 * @constructor
 */

function Observer (value, type) {
  this.id = ++uid
  this.value = value
  this.active = true
  this.deps = []
  _.define(value, '__ob__', this)
  if (type === ARRAY) {
    var augment = config.proto && _.hasProto
      ? protoAugment
      : copyAugment
    augment(value, arrayMethods, arrayKeys)
    this.observeArray(value)
  } else if (type === OBJECT) {
    this.walk(value)
  }
}

Observer.target = null

var p = Observer.prototype

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @return {Observer|undefined}
 * @static
 */

Observer.create = function (value) {
  if (
    value &&
    value.hasOwnProperty('__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    return value.__ob__
  } else if (_.isArray(value)) {
    return new Observer(value, ARRAY)
  } else if (
    _.isPlainObject(value) &&
    !value._isVue // avoid Vue instance
  ) {
    return new Observer(value, OBJECT)
  }
}

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object. Properties prefixed with `$` or `_`
 * and accessor properties are ignored.
 *
 * @param {Object} obj
 */

p.walk = function (obj) {
  var keys = Object.keys(obj)
  var i = keys.length
  var key, prefix
  while (i--) {
    key = keys[i]
    prefix = key.charCodeAt(0)
    if (prefix !== 0x24 && prefix !== 0x5F) { // skip $ or _
      this.convert(key, obj[key])
    }
  }
}

/**
 * Try to carete an observer for a child value,
 * and if value is array, link dep to the array.
 *
 * @param {*} val
 * @return {Dep|undefined}
 */

p.observe = function (val) {
  return Observer.create(val)
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

p.observeArray = function (items) {
  var i = items.length
  while (i--) {
    this.observe(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * @param {String} key
 * @param {*} val
 */

p.convert = function (key, val) {
  var ob = this
  var childOb = ob.observe(val)
  var dep = new Dep()
  if (childOb) {
    childOb.deps.push(dep)
  }
  Object.defineProperty(ob.value, key, {
    enumerable: true,
    configurable: true,
    get: function () {
      // Observer.target is a watcher whose getter is
      // currently being evaluated.
      if (ob.active && Observer.target) {
        Observer.target.addDep(dep)
      }
      return val
    },
    set: function (newVal) {
      if (newVal === val) return
      // remove dep from old value
      var oldChildOb = val && val.__ob__
      if (oldChildOb) {
        var oldDeps = oldChildOb.deps
        oldDeps.splice(oldDeps.indexOf(dep), 1)
      }
      val = newVal
      // add dep to new value
      var newChildOb = ob.observe(newVal)
      if (newChildOb) {
        newChildOb.deps.push(dep)
      }
      dep.notify()
    }
  })
}

/**
 * Notify change on all self deps on an observer.
 * This is called when a mutable value mutates. e.g.
 * when an Array's mutating methods are called, or an
 * Object's $add/$delete are called.
 */

p.notify = function () {
  var deps = this.deps
  for (var i = 0, l = deps.length; i < l; i++) {
    deps[i].notify()
  }
}

/**
 * Add an owner vm, so that when $add/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

p.addVm = function (vm) {
  (this.vms = this.vms || []).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

p.removeVm = function (vm) {
  this.vms.splice(this.vms.indexOf(vm), 1)
}

module.exports = Observer

},{"../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./array":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/array.js","./dep":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/dep.js","./object":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/object.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/object.js":[function(require,module,exports){
var _ = require('../util')
var objProto = Object.prototype

/**
 * Add a new property to an observed object
 * and emits corresponding event
 *
 * @param {String} key
 * @param {*} val
 * @public
 */

_.define(
  objProto,
  '$add',
  function $add (key, val) {
    if (this.hasOwnProperty(key)) return
    var ob = this.__ob__
    if (!ob || _.isReserved(key)) {
      this[key] = val
      return
    }
    ob.convert(key, val)
    if (ob.vms) {
      var i = ob.vms.length
      while (i--) {
        var vm = ob.vms[i]
        vm._proxy(key)
        vm._digest()
      }
    } else {
      ob.notify()
    }
  }
)

/**
 * Deletes a property from an observed object
 * and emits corresponding event
 *
 * @param {String} key
 * @public
 */

_.define(
  objProto,
  '$delete',
  function $delete (key) {
    if (!this.hasOwnProperty(key)) return
    delete this[key]
    var ob = this.__ob__
    if (!ob || _.isReserved(key)) {
      return
    }
    if (ob.vms) {
      var i = ob.vms.length
      while (i--) {
        var vm = ob.vms[i]
        vm._unproxy(key)
        vm._digest()
      }
    } else {
      ob.notify()
    }
  }
)
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/directive.js":[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var cache = new Cache(1000)
var argRE = /^[^\{\?]+$|^'[^']*'$|^"[^"]*"$/
var filterTokenRE = /[^\s'"]+|'[^']+'|"[^"]+"/g

/**
 * Parser state
 */

var str
var c, i, l
var inSingle
var inDouble
var curly
var square
var paren
var begin
var argIndex
var dirs
var dir
var lastFilterIndex
var arg

/**
 * Push a directive object into the result Array
 */

function pushDir () {
  dir.raw = str.slice(begin, i).trim()
  if (dir.expression === undefined) {
    dir.expression = str.slice(argIndex, i).trim()
  } else if (lastFilterIndex !== begin) {
    pushFilter()
  }
  if (i === 0 || dir.expression) {
    dirs.push(dir)
  }
}

/**
 * Push a filter to the current directive object
 */

function pushFilter () {
  var exp = str.slice(lastFilterIndex, i).trim()
  var filter
  if (exp) {
    filter = {}
    var tokens = exp.match(filterTokenRE)
    filter.name = tokens[0]
    filter.args = tokens.length > 1 ? tokens.slice(1) : null
  }
  if (filter) {
    (dir.filters = dir.filters || []).push(filter)
  }
  lastFilterIndex = i + 1
}

/**
 * Parse a directive string into an Array of AST-like
 * objects representing directives.
 *
 * Example:
 *
 * "click: a = a + 1 | uppercase" will yield:
 * {
 *   arg: 'click',
 *   expression: 'a = a + 1',
 *   filters: [
 *     { name: 'uppercase', args: null }
 *   ]
 * }
 *
 * @param {String} str
 * @return {Array<Object>}
 */

exports.parse = function (s) {

  var hit = cache.get(s)
  if (hit) {
    return hit
  }

  // reset parser state
  str = s
  inSingle = inDouble = false
  curly = square = paren = begin = argIndex = 0
  lastFilterIndex = 0
  dirs = []
  dir = {}
  arg = null

  for (i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i)
    if (inSingle) {
      // check single quote
      if (c === 0x27) inSingle = !inSingle
    } else if (inDouble) {
      // check double quote
      if (c === 0x22) inDouble = !inDouble
    } else if (
      c === 0x2C && // comma
      !paren && !curly && !square
    ) {
      // reached the end of a directive
      pushDir()
      // reset & skip the comma
      dir = {}
      begin = argIndex = lastFilterIndex = i + 1
    } else if (
      c === 0x3A && // colon
      !dir.expression &&
      !dir.arg
    ) {
      // argument
      arg = str.slice(begin, i).trim()
      // test for valid argument here
      // since we may have caught stuff like first half of
      // an object literal or a ternary expression.
      if (argRE.test(arg)) {
        argIndex = i + 1
        dir.arg = _.stripQuotes(arg) || arg
      }
    } else if (
      c === 0x7C && // pipe
      str.charCodeAt(i + 1) !== 0x7C &&
      str.charCodeAt(i - 1) !== 0x7C
    ) {
      if (dir.expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        dir.expression = str.slice(argIndex, i).trim()
      } else {
        // already has filter
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break // "
        case 0x27: inSingle = true; break // '
        case 0x28: paren++; break         // (
        case 0x29: paren--; break         // )
        case 0x5B: square++; break        // [
        case 0x5D: square--; break        // ]
        case 0x7B: curly++; break         // {
        case 0x7D: curly--; break         // }
      }
    }
  }

  if (i === 0 || begin !== i) {
    pushDir()
  }

  cache.put(s, dirs)
  return dirs
}
},{"../cache":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js":[function(require,module,exports){
var _ = require('../util')
var Path = require('./path')
var Cache = require('../cache')
var expressionCache = new Cache(1000)

var keywords =
  'Math,break,case,catch,continue,debugger,default,' +
  'delete,do,else,false,finally,for,function,if,in,' +
  'instanceof,new,null,return,switch,this,throw,true,try,' +
  'typeof,var,void,while,with,undefined,abstract,boolean,' +
  'byte,char,class,const,double,enum,export,extends,' +
  'final,float,goto,implements,import,int,interface,long,' +
  'native,package,private,protected,public,short,static,' +
  'super,synchronized,throws,transient,volatile,' +
  'arguments,let,yield'

var wsRE = /\s/g
var newlineRE = /\n/g
var saveRE = /[\{,]\s*[\w\$_]+\s*:|'[^']*'|"[^"]*"/g
var restoreRE = /"(\d+)"/g
var pathTestRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\])*$/
var pathReplaceRE = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g
var keywordsRE = new RegExp('^(' + keywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Save / Rewrite / Restore
 *
 * When rewriting paths found in an expression, it is
 * possible for the same letter sequences to be found in
 * strings and Object literal property keys. Therefore we
 * remove and store these parts in a temporary array, and
 * restore them after the path rewrite.
 */

var saved = []

/**
 * Save replacer
 *
 * @param {String} str
 * @return {String} - placeholder with index
 */

function save (str) {
  var i = saved.length
  saved[i] = str.replace(newlineRE, '\\n')
  return '"' + i + '"'
}

/**
 * Path rewrite replacer
 *
 * @param {String} raw
 * @return {String}
 */

function rewrite (raw) {
  var c = raw.charAt(0)
  var path = raw.slice(1)
  if (keywordsRE.test(path)) {
    return raw
  } else {
    path = path.indexOf('"') > -1
      ? path.replace(restoreRE, restore)
      : path
    return c + 'scope.' + path
  }
}

/**
 * Restore replacer
 *
 * @param {String} str
 * @param {String} i - matched save index
 * @return {String}
 */

function restore (str, i) {
  return saved[i]
}

/**
 * Rewrite an expression, prefixing all path accessors with
 * `scope.` and generate getter/setter functions.
 *
 * @param {String} exp
 * @param {Boolean} needSet
 * @return {Function}
 */

function compileExpFns (exp, needSet) {
  // reset state
  saved.length = 0
  // save strings and object literal keys
  var body = exp
    .replace(saveRE, save)
    .replace(wsRE, '')
  // rewrite all paths
  // pad 1 space here becaue the regex matches 1 extra char
  body = (' ' + body)
    .replace(pathReplaceRE, rewrite)
    .replace(restoreRE, restore)
  var getter = makeGetter(body)
  if (getter) {
    return {
      get: getter,
      body: body,
      set: needSet
        ? makeSetter(body)
        : null
    }
  }
}

/**
 * Compile getter setters for a simple path.
 *
 * @param {String} exp
 * @return {Function}
 */

function compilePathFns (exp) {
  var getter, path
  if (exp.indexOf('[') < 0) {
    // really simple path
    path = exp.split('.')
    getter = Path.compileGetter(path)
  } else {
    // do the real parsing
    path = Path.parse(exp)
    getter = path.get
  }
  return {
    get: getter,
    // always generate setter for simple paths
    set: function (obj, val) {
      Path.set(obj, path, val)
    }
  }
}

/**
 * Build a getter function. Requires eval.
 *
 * We isolate the try/catch so it doesn't affect the
 * optimization of the parse function when it is not called.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeGetter (body) {
  try {
    return new Function('scope', 'return ' + body + ';')
  } catch (e) {
    _.warn(
      'Invalid expression. ' +
      'Generated function body: ' + body
    )
  }
}

/**
 * Build a setter function.
 *
 * This is only needed in rare situations like "a[b]" where
 * a settable path requires dynamic evaluation.
 *
 * This setter function may throw error when called if the
 * expression body is not a valid left-hand expression in
 * assignment.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeSetter (body) {
  try {
    return new Function('scope', 'value', body + '=value;')
  } catch (e) {
    _.warn('Invalid setter function body: ' + body)
  }
}

/**
 * Check for setter existence on a cache hit.
 *
 * @param {Function} hit
 */

function checkSetter (hit) {
  if (!hit.set) {
    hit.set = makeSetter(hit.body)
  }
}

/**
 * Parse an expression into re-written getter/setters.
 *
 * @param {String} exp
 * @param {Boolean} needSet
 * @return {Function}
 */

exports.parse = function (exp, needSet) {
  exp = exp.trim()
  // try cache
  var hit = expressionCache.get(exp)
  if (hit) {
    if (needSet) {
      checkSetter(hit)
    }
    return hit
  }
  // we do a simple path check to optimize for them.
  // the check fails valid paths with unusal whitespaces,
  // but that's too rare and we don't care.
  var res = pathTestRE.test(exp)
    ? compilePathFns(exp)
    : compileExpFns(exp, needSet)
  expressionCache.put(exp, res)
  return res
}

// Export the pathRegex for external use
exports.pathTestRE = pathTestRE
},{"../cache":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./path":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/path.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/path.js":[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var pathCache = new Cache(1000)
var identRE = /^[$_a-zA-Z]+[\w$]*$/

/**
 * Path-parsing algorithm scooped from Polymer/observe-js
 */

var pathStateMachine = {
  'beforePath': {
    'ws': ['beforePath'],
    'ident': ['inIdent', 'append'],
    '[': ['beforeElement'],
    'eof': ['afterPath']
  },

  'inPath': {
    'ws': ['inPath'],
    '.': ['beforeIdent'],
    '[': ['beforeElement'],
    'eof': ['afterPath']
  },

  'beforeIdent': {
    'ws': ['beforeIdent'],
    'ident': ['inIdent', 'append']
  },

  'inIdent': {
    'ident': ['inIdent', 'append'],
    '0': ['inIdent', 'append'],
    'number': ['inIdent', 'append'],
    'ws': ['inPath', 'push'],
    '.': ['beforeIdent', 'push'],
    '[': ['beforeElement', 'push'],
    'eof': ['afterPath', 'push']
  },

  'beforeElement': {
    'ws': ['beforeElement'],
    '0': ['afterZero', 'append'],
    'number': ['inIndex', 'append'],
    "'": ['inSingleQuote', 'append', ''],
    '"': ['inDoubleQuote', 'append', '']
  },

  'afterZero': {
    'ws': ['afterElement', 'push'],
    ']': ['inPath', 'push']
  },

  'inIndex': {
    '0': ['inIndex', 'append'],
    'number': ['inIndex', 'append'],
    'ws': ['afterElement'],
    ']': ['inPath', 'push']
  },

  'inSingleQuote': {
    "'": ['afterElement'],
    'eof': 'error',
    'else': ['inSingleQuote', 'append']
  },

  'inDoubleQuote': {
    '"': ['afterElement'],
    'eof': 'error',
    'else': ['inDoubleQuote', 'append']
  },

  'afterElement': {
    'ws': ['afterElement'],
    ']': ['inPath', 'push']
  }
}

function noop () {}

/**
 * Determine the type of a character in a keypath.
 *
 * @param {Char} char
 * @return {String} type
 */

function getPathCharType (char) {
  if (char === undefined) {
    return 'eof'
  }

  var code = char.charCodeAt(0)

  switch(code) {
    case 0x5B: // [
    case 0x5D: // ]
    case 0x2E: // .
    case 0x22: // "
    case 0x27: // '
    case 0x30: // 0
      return char

    case 0x5F: // _
    case 0x24: // $
      return 'ident'

    case 0x20: // Space
    case 0x09: // Tab
    case 0x0A: // Newline
    case 0x0D: // Return
    case 0xA0:  // No-break space
    case 0xFEFF:  // Byte Order Mark
    case 0x2028:  // Line Separator
    case 0x2029:  // Paragraph Separator
      return 'ws'
  }

  // a-z, A-Z
  if ((0x61 <= code && code <= 0x7A) ||
      (0x41 <= code && code <= 0x5A)) {
    return 'ident'
  }

  // 1-9
  if (0x31 <= code && code <= 0x39) {
    return 'number'
  }

  return 'else'
}

/**
 * Parse a string path into an array of segments
 * Todo implement cache
 *
 * @param {String} path
 * @return {Array|undefined}
 */

function parsePath (path) {
  var keys = []
  var index = -1
  var mode = 'beforePath'
  var c, newChar, key, type, transition, action, typeMap

  var actions = {
    push: function() {
      if (key === undefined) {
        return
      }
      keys.push(key)
      key = undefined
    },
    append: function() {
      if (key === undefined) {
        key = newChar
      } else {
        key += newChar
      }
    }
  }

  function maybeUnescapeQuote () {
    var nextChar = path[index + 1]
    if ((mode === 'inSingleQuote' && nextChar === "'") ||
        (mode === 'inDoubleQuote' && nextChar === '"')) {
      index++
      newChar = nextChar
      actions.append()
      return true
    }
  }

  while (mode) {
    index++
    c = path[index]

    if (c === '\\' && maybeUnescapeQuote()) {
      continue
    }

    type = getPathCharType(c)
    typeMap = pathStateMachine[mode]
    transition = typeMap[type] || typeMap['else'] || 'error'

    if (transition === 'error') {
      return // parse error
    }

    mode = transition[0]
    action = actions[transition[1]] || noop
    newChar = transition[2] === undefined
      ? c
      : transition[2]
    action()

    if (mode === 'afterPath') {
      return keys
    }
  }
}

/**
 * Format a accessor segment based on its type.
 *
 * @param {String} key
 * @return {Boolean}
 */

function formatAccessor(key) {
  if (identRE.test(key)) { // identifier
    return '.' + key
  } else if (+key === key >>> 0) { // bracket index
    return '[' + key + ']'
  } else { // bracket string
    return '["' + key.replace(/"/g, '\\"') + '"]'
  }
}

/**
 * Compiles a getter function with a fixed path.
 *
 * @param {Array} path
 * @return {Function}
 */

exports.compileGetter = function (path) {
  var body =
    'try{return o' +
    path.map(formatAccessor).join('') +
    '}catch(e){};'
  return new Function('o', body)
}

/**
 * External parse that check for a cache hit first
 *
 * @param {String} path
 * @return {Array|undefined}
 */

exports.parse = function (path) {
  var hit = pathCache.get(path)
  if (!hit) {
    hit = parsePath(path)
    if (hit) {
      hit.get = exports.compileGetter(hit)
      pathCache.put(path, hit)
    }
  }
  return hit
}

/**
 * Get from an object from a path string
 *
 * @param {Object} obj
 * @param {String} path
 */

exports.get = function (obj, path) {
  path = exports.parse(path)
  if (path) {
    return path.get(obj)
  }
}

/**
 * Set on an object from a path
 *
 * @param {Object} obj
 * @param {String | Array} path
 * @param {*} val
 */

exports.set = function (obj, path, val) {
  if (typeof path === 'string') {
    path = exports.parse(path)
  }
  if (!path || !_.isObject(obj)) {
    return false
  }
  var last, key
  for (var i = 0, l = path.length - 1; i < l; i++) {
    last = obj
    key = path[i]
    obj = obj[key]
    if (!_.isObject(obj)) {
      obj = {}
      last.$add(key, obj)
    }
  }
  key = path[i]
  if (key in obj) {
    obj[key] = val
  } else {
    obj.$add(key, val)
  }
  return true
}
},{"../cache":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/template.js":[function(require,module,exports){
var _ = require('../util')
var Cache = require('../cache')
var templateCache = new Cache(1000)
var idSelectorCache = new Cache(1000)

var map = {
  _default : [0, '', ''],
  legend   : [1, '<fieldset>', '</fieldset>'],
  tr       : [2, '<table><tbody>', '</tbody></table>'],
  col      : [
    2,
    '<table><tbody></tbody><colgroup>',
    '</colgroup></table>'
  ]
}

map.td =
map.th = [
  3,
  '<table><tbody><tr>',
  '</tr></tbody></table>'
]

map.option =
map.optgroup = [
  1,
  '<select multiple="multiple">',
  '</select>'
]

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>']

map.g =
map.defs =
map.symbol =
map.use =
map.image =
map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [
  1,
  '<svg ' +
    'xmlns="http://www.w3.org/2000/svg" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'xmlns:ev="http://www.w3.org/2001/xml-events"' +
    'version="1.1">',
  '</svg>'
]

var TAG_RE = /<([\w:]+)/

/**
 * Convert a string template to a DocumentFragment.
 * Determines correct wrapping by tag types. Wrapping
 * strategy found in jQuery & component/domify.
 *
 * @param {String} templateString
 * @return {DocumentFragment}
 */

function stringToFragment (templateString) {
  // try a cache hit first
  var hit = templateCache.get(templateString)
  if (hit) {
    return hit
  }

  var frag = document.createDocumentFragment()
  var tagMatch = TAG_RE.exec(templateString)

  if (!tagMatch) {
    // text only, return a single text node.
    frag.appendChild(
      document.createTextNode(templateString)
    )
  } else {

    var tag    = tagMatch[1]
    var wrap   = map[tag] || map._default
    var depth  = wrap[0]
    var prefix = wrap[1]
    var suffix = wrap[2]
    var node   = document.createElement('div')

    node.innerHTML = prefix + templateString.trim() + suffix
    while (depth--) {
      node = node.lastChild
    }

    var child
    /* jshint boss:true */
    while (child = node.firstChild) {
      frag.appendChild(child)
    }
  }

  templateCache.put(templateString, frag)
  return frag
}

/**
 * Convert a template node to a DocumentFragment.
 *
 * @param {Node} node
 * @return {DocumentFragment}
 */

function nodeToFragment (node) {
  var tag = node.tagName
  // if its a template tag and the browser supports it,
  // its content is already a document fragment.
  if (
    tag === 'TEMPLATE' &&
    node.content instanceof DocumentFragment
  ) {
    return node.content
  }
  return tag === 'SCRIPT'
    ? stringToFragment(node.textContent)
    : stringToFragment(node.innerHTML)
}

// Test for the presence of the Safari template cloning bug
// https://bugs.webkit.org/show_bug.cgi?id=137755
var hasBrokenTemplate = _.inBrowser
  ? (function () {
      var a = document.createElement('div')
      a.innerHTML = '<template>1</template>'
      return !a.cloneNode(true).firstChild.innerHTML
    })()
  : false

// Test for IE10/11 textarea placeholder clone bug
var hasTextareaCloneBug = _.inBrowser
  ? (function () {
      var t = document.createElement('textarea')
      t.placeholder = 't'
      return t.cloneNode(true).value === 't'
    })()
  : false

/**
 * 1. Deal with Safari cloning nested <template> bug by
 *    manually cloning all template instances.
 * 2. Deal with IE10/11 textarea placeholder bug by setting
 *    the correct value after cloning.
 *
 * @param {Element|DocumentFragment} node
 * @return {Element|DocumentFragment}
 */

exports.clone = function (node) {
  var res = node.cloneNode(true)
  var i, original, cloned
  /* istanbul ignore if */
  if (hasBrokenTemplate) {
    original = node.querySelectorAll('template')
    if (original.length) {
      cloned = res.querySelectorAll('template')
      i = cloned.length
      while (i--) {
        cloned[i].parentNode.replaceChild(
          original[i].cloneNode(true),
          cloned[i]
        )
      }
    }
  }
  /* istanbul ignore if */
  if (hasTextareaCloneBug) {
    if (node.tagName === 'TEXTAREA') {
      res.value = node.value
    } else {
      original = node.querySelectorAll('textarea')
      if (original.length) {
        cloned = res.querySelectorAll('textarea')
        i = cloned.length
        while (i--) {
          cloned[i].value = original[i].value
        }
      }
    }
  }
  return res
}

/**
 * Process the template option and normalizes it into a
 * a DocumentFragment that can be used as a partial or a
 * instance template.
 *
 * @param {*} template
 *    Possible values include:
 *    - DocumentFragment object
 *    - Node object of type Template
 *    - id selector: '#some-template-id'
 *    - template string: '<div><span>{{msg}}</span></div>'
 * @param {Boolean} clone
 * @param {Boolean} noSelector
 * @return {DocumentFragment|undefined}
 */

exports.parse = function (template, clone, noSelector) {
  var node, frag

  // if the template is already a document fragment,
  // do nothing
  if (template instanceof DocumentFragment) {
    return clone
      ? template.cloneNode(true)
      : template
  }

  if (typeof template === 'string') {
    // id selector
    if (!noSelector && template.charAt(0) === '#') {
      // id selector can be cached too
      frag = idSelectorCache.get(template)
      if (!frag) {
        node = document.getElementById(template.slice(1))
        if (node) {
          frag = nodeToFragment(node)
          // save selector to cache
          idSelectorCache.put(template, frag)
        }
      }
    } else {
      // normal string template
      frag = stringToFragment(template)
    }
  } else if (template.nodeType) {
    // a direct node
    frag = nodeToFragment(template)
  }

  return frag && clone
    ? exports.clone(frag)
    : frag
}
},{"../cache":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js","../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/text.js":[function(require,module,exports){
var Cache = require('../cache')
var config = require('../config')
var dirParser = require('./directive')
var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g
var cache, tagRE, htmlRE, firstChar, lastChar

/**
 * Escape a string so it can be used in a RegExp
 * constructor.
 *
 * @param {String} str
 */

function escapeRegex (str) {
  return str.replace(regexEscapeRE, '\\$&')
}

/**
 * Compile the interpolation tag regex.
 *
 * @return {RegExp}
 */

function compileRegex () {
  config._delimitersChanged = false
  var open = config.delimiters[0]
  var close = config.delimiters[1]
  firstChar = open.charAt(0)
  lastChar = close.charAt(close.length - 1)
  var firstCharRE = escapeRegex(firstChar)
  var lastCharRE = escapeRegex(lastChar)
  var openRE = escapeRegex(open)
  var closeRE = escapeRegex(close)
  tagRE = new RegExp(
    firstCharRE + '?' + openRE +
    '(.+?)' +
    closeRE + lastCharRE + '?',
    'g'
  )
  htmlRE = new RegExp(
    '^' + firstCharRE + openRE +
    '.*' +
    closeRE + lastCharRE + '$'
  )
  // reset cache
  cache = new Cache(1000)
}

/**
 * Parse a template text string into an array of tokens.
 *
 * @param {String} text
 * @return {Array<Object> | null}
 *               - {String} type
 *               - {String} value
 *               - {Boolean} [html]
 *               - {Boolean} [oneTime]
 */

exports.parse = function (text) {
  if (config._delimitersChanged) {
    compileRegex()
  }
  var hit = cache.get(text)
  if (hit) {
    return hit
  }
  if (!tagRE.test(text)) {
    return null
  }
  var tokens = []
  var lastIndex = tagRE.lastIndex = 0
  var match, index, value, first, oneTime, partial
  /* jshint boss:true */
  while (match = tagRE.exec(text)) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      tokens.push({
        value: text.slice(lastIndex, index)
      })
    }
    // tag token
    first = match[1].charCodeAt(0)
    oneTime = first === 0x2A // *
    partial = first === 0x3E // >
    value = (oneTime || partial)
      ? match[1].slice(1)
      : match[1]
    tokens.push({
      tag: true,
      value: value.trim(),
      html: htmlRE.test(match[0]),
      oneTime: oneTime,
      partial: partial
    })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push({
      value: text.slice(lastIndex)
    })
  }
  cache.put(text, tokens)
  return tokens
}

/**
 * Format a list of tokens into an expression.
 * e.g. tokens parsed from 'a {{b}} c' can be serialized
 * into one single expression as '"a " + b + " c"'.
 *
 * @param {Array} tokens
 * @param {Vue} [vm]
 * @return {String}
 */

exports.tokensToExp = function (tokens, vm) {
  return tokens.length > 1
    ? tokens.map(function (token) {
        return formatToken(token, vm)
      }).join('+')
    : formatToken(tokens[0], vm, true)
}

/**
 * Format a single token.
 *
 * @param {Object} token
 * @param {Vue} [vm]
 * @param {Boolean} single
 * @return {String}
 */

function formatToken (token, vm, single) {
  return token.tag
    ? vm && token.oneTime
      ? '"' + vm.$eval(token.value) + '"'
      : single
        ? token.value
        : inlineFilters(token.value)
    : '"' + token.value + '"'
}

/**
 * For an attribute with multiple interpolation tags,
 * e.g. attr="some-{{thing | filter}}", in order to combine
 * the whole thing into a single watchable expression, we
 * have to inline those filters. This function does exactly
 * that. This is a bit hacky but it avoids heavy changes
 * to directive parser and watcher mechanism.
 *
 * @param {String} exp
 * @return {String}
 */

var filterRE = /[^|]\|[^|]/
function inlineFilters (exp) {
  if (!filterRE.test(exp)) {
    return '(' + exp + ')'
  } else {
    var dir = dirParser.parse(exp)[0]
    if (!dir.filters) {
      return '(' + exp + ')'
    } else {
      exp = dir.expression
      for (var i = 0, l = dir.filters.length; i < l; i++) {
        var filter = dir.filters[i]
        var args = filter.args
          ? ',"' + filter.args.join('","') + '"'
          : ''
        exp = 'this.$options.filters["' + filter.name + '"]' +
          '.apply(this,[' + exp + args + '])'
      }
      return exp
    }
  }
}
},{"../cache":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/cache.js","../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","./directive":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/directive.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/css.js":[function(require,module,exports){
var _ = require('../util')
var addClass = _.addClass
var removeClass = _.removeClass
var transDurationProp = _.transitionProp + 'Duration'
var animDurationProp = _.animationProp + 'Duration'

var queue = []
var queued = false

/**
 * Push a job into the transition queue, which is to be
 * executed on next frame.
 *
 * @param {Element} el    - target element
 * @param {Number} dir    - 1: enter, -1: leave
 * @param {Function} op   - the actual dom operation
 * @param {String} cls    - the className to remove when the
 *                          transition is done.
 * @param {Function} [cb] - user supplied callback.
 */

function push (el, dir, op, cls, cb) {
  queue.push({
    el  : el,
    dir : dir,
    cb  : cb,
    cls : cls,
    op  : op
  })
  if (!queued) {
    queued = true
    _.nextTick(flush)
  }
}

/**
 * Flush the queue, and do one forced reflow before
 * triggering transitions.
 */

function flush () {
  /* jshint unused: false */
  var f = document.documentElement.offsetHeight
  queue.forEach(run)
  queue = []
  queued = false
}

/**
 * Run a transition job.
 *
 * @param {Object} job
 */

function run (job) {

  var el = job.el
  var data = el.__v_trans
  var cls = job.cls
  var cb = job.cb
  var op = job.op
  var transitionType = getTransitionType(el, data, cls)

  if (job.dir > 0) { // ENTER
    if (transitionType === 1) {
      // trigger transition by removing enter class
      removeClass(el, cls)
      // only need to listen for transitionend if there's
      // a user callback
      if (cb) setupTransitionCb(_.transitionEndEvent)
    } else if (transitionType === 2) {
      // animations are triggered when class is added
      // so we just listen for animationend to remove it.
      setupTransitionCb(_.animationEndEvent, function () {
        removeClass(el, cls)
      })
    } else {
      // no transition applicable
      removeClass(el, cls)
      if (cb) cb()
    }
  } else { // LEAVE
    if (transitionType) {
      // leave transitions/animations are both triggered
      // by adding the class, just remove it on end event.
      var event = transitionType === 1
        ? _.transitionEndEvent
        : _.animationEndEvent
      setupTransitionCb(event, function () {
        op()
        removeClass(el, cls)
      })
    } else {
      op()
      removeClass(el, cls)
      if (cb) cb()
    }
  }

  /**
   * Set up a transition end callback, store the callback
   * on the element's __v_trans data object, so we can
   * clean it up if another transition is triggered before
   * the callback is fired.
   *
   * @param {String} event
   * @param {Function} [cleanupFn]
   */

  function setupTransitionCb (event, cleanupFn) {
    data.event = event
    var onEnd = data.callback = function transitionCb (e) {
      if (e.target === el) {
        _.off(el, event, onEnd)
        data.event = data.callback = null
        if (cleanupFn) cleanupFn()
        if (cb) cb()
      }
    }
    _.on(el, event, onEnd)
  }
}

/**
 * Get an element's transition type based on the
 * calculated styles
 *
 * @param {Element} el
 * @param {Object} data
 * @param {String} className
 * @return {Number}
 *         1 - transition
 *         2 - animation
 */

function getTransitionType (el, data, className) {
  var type = data.cache && data.cache[className]
  if (type) return type
  var inlineStyles = el.style
  var computedStyles = window.getComputedStyle(el)
  var transDuration =
    inlineStyles[transDurationProp] ||
    computedStyles[transDurationProp]
  if (transDuration && transDuration !== '0s') {
    type = 1
  } else {
    var animDuration =
      inlineStyles[animDurationProp] ||
      computedStyles[animDurationProp]
    if (animDuration && animDuration !== '0s') {
      type = 2
    }
  }
  if (type) {
    if (!data.cache) data.cache = {}
    data.cache[className] = type
  }
  return type
}

/**
 * Apply CSS transition to an element.
 *
 * @param {Element} el
 * @param {Number} direction - 1: enter, -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Object} data - target element's transition data
 */

module.exports = function (el, direction, op, data, cb) {
  var prefix = data.id || 'v'
  var enterClass = prefix + '-enter'
  var leaveClass = prefix + '-leave'
  // clean up potential previous unfinished transition
  if (data.callback) {
    _.off(el, data.event, data.callback)
    removeClass(el, enterClass)
    removeClass(el, leaveClass)
    data.event = data.callback = null
  }
  if (direction > 0) { // enter
    addClass(el, enterClass)
    op()
    push(el, direction, null, enterClass, cb)
  } else { // leave
    addClass(el, leaveClass)
    push(el, direction, op, leaveClass, cb)
  }
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/index.js":[function(require,module,exports){
var _ = require('../util')
var applyCSSTransition = require('./css')
var applyJSTransition = require('./js')

/**
 * Append with transition.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.append = function (el, target, vm, cb) {
  apply(el, 1, function () {
    target.appendChild(el)
  }, vm, cb)
}

/**
 * InsertBefore with transition.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.before = function (el, target, vm, cb) {
  apply(el, 1, function () {
    _.before(el, target)
  }, vm, cb)
}

/**
 * Remove with transition.
 *
 * @oaram {Element} el
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.remove = function (el, vm, cb) {
  apply(el, -1, function () {
    _.remove(el)
  }, vm, cb)
}

/**
 * Remove by appending to another parent with transition.
 * This is only used in block operations.
 *
 * @oaram {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

exports.removeThenAppend = function (el, target, vm, cb) {
  apply(el, -1, function () {
    target.appendChild(el)
  }, vm, cb)
}

/**
 * Append the childNodes of a fragment to target.
 *
 * @param {DocumentFragment} block
 * @param {Node} target
 * @param {Vue} vm
 */

exports.blockAppend = function (block, target, vm) {
  var nodes = _.toArray(block.childNodes)
  for (var i = 0, l = nodes.length; i < l; i++) {
    exports.before(nodes[i], target, vm)
  }
}

/**
 * Remove a block of nodes between two edge nodes.
 *
 * @param {Node} start
 * @param {Node} end
 * @param {Vue} vm
 */

exports.blockRemove = function (start, end, vm) {
  var node = start.nextSibling
  var next
  while (node !== end) {
    next = node.nextSibling
    exports.remove(node, vm)
    node = next
  }
}

/**
 * Apply transitions with an operation callback.
 *
 * @oaram {Element} el
 * @param {Number} direction
 *                  1: enter
 *                 -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Vue} vm
 * @param {Function} [cb]
 */

var apply = exports.apply = function (el, direction, op, vm, cb) {
  var transData = el.__v_trans
  if (
    !transData ||
    !vm._isCompiled ||
    // if the vm is being manipulated by a parent directive
    // during the parent's compilation phase, skip the
    // animation.
    (vm.$parent && !vm.$parent._isCompiled)
  ) {
    op()
    if (cb) cb()
    return
  }
  // determine the transition type on the element
  var jsTransition = vm.$options.transitions[transData.id]
  if (jsTransition) {
    // js
    applyJSTransition(
      el,
      direction,
      op,
      transData,
      jsTransition,
      vm,
      cb
    )
  } else if (_.transitionEndEvent) {
    // css
    applyCSSTransition(
      el,
      direction,
      op,
      transData,
      cb
    )
  } else {
    // not applicable
    op()
    if (cb) cb()
  }
}
},{"../util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js","./css":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/css.js","./js":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/js.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/transition/js.js":[function(require,module,exports){
/**
 * Apply JavaScript enter/leave functions.
 *
 * @param {Element} el
 * @param {Number} direction - 1: enter, -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Object} data - target element's transition data
 * @param {Object} def - transition definition object
 * @param {Vue} vm - the owner vm of the element
 * @param {Function} [cb]
 */

module.exports = function (el, direction, op, data, def, vm, cb) {
  if (data.cancel) {
    data.cancel()
    data.cancel = null
  }
  if (direction > 0) { // enter
    if (def.beforeEnter) {
      def.beforeEnter.call(vm, el)
    }
    op()
    if (def.enter) {
      data.cancel = def.enter.call(vm, el, function () {
        data.cancel = null
        if (cb) cb()
      })
    } else if (cb) {
      cb()
    }
  } else { // leave
    if (def.leave) {
      data.cancel = def.leave.call(vm, el, function () {
        data.cancel = null
        op()
        if (cb) cb()
      })
    } else {
      op()
      if (cb) cb()
    }
  }
}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/debug.js":[function(require,module,exports){
var config = require('../config')

/**
 * Enable debug utilities. The enableDebug() function and
 * all _.log() & _.warn() calls will be dropped in the
 * minified production build.
 */

enableDebug()

function enableDebug () {
  var hasConsole = typeof console !== 'undefined'
  
  /**
   * Log a message.
   *
   * @param {String} msg
   */

  exports.log = function (msg) {
    if (hasConsole && config.debug) {
      console.log('[Vue info]: ' + msg)
    }
  }

  /**
   * We've got a problem here.
   *
   * @param {String} msg
   */

  exports.warn = function (msg) {
    if (hasConsole && !config.silent) {
      console.warn('[Vue warn]: ' + msg)
      if (config.debug && console.trace) {
        console.trace()
      }
    }
  }

  /**
   * Assert asset exists
   */

  exports.assertAsset = function (val, type, id) {
    if (!val) {
      exports.warn('Failed to resolve ' + type + ': ' + id)
    }
  }
}
},{"../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/dom.js":[function(require,module,exports){
var config = require('../config')

/**
 * Check if a node is in the document.
 *
 * @param {Node} node
 * @return {Boolean}
 */

var doc =
  typeof document !== 'undefined' &&
  document.documentElement

exports.inDoc = function (node) {
  return doc && doc.contains(node)
}

/**
 * Extract an attribute from a node.
 *
 * @param {Node} node
 * @param {String} attr
 */

exports.attr = function (node, attr) {
  attr = config.prefix + attr
  var val = node.getAttribute(attr)
  if (val !== null) {
    node.removeAttribute(attr)
  }
  return val
}

/**
 * Insert el before target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.before = function (el, target) {
  target.parentNode.insertBefore(el, target)
}

/**
 * Insert el after target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.after = function (el, target) {
  if (target.nextSibling) {
    exports.before(el, target.nextSibling)
  } else {
    target.parentNode.appendChild(el)
  }
}

/**
 * Remove el from DOM
 *
 * @param {Element} el
 */

exports.remove = function (el) {
  el.parentNode.removeChild(el)
}

/**
 * Prepend el to target
 *
 * @param {Element} el
 * @param {Element} target 
 */

exports.prepend = function (el, target) {
  if (target.firstChild) {
    exports.before(el, target.firstChild)
  } else {
    target.appendChild(el)
  }
}

/**
 * Replace target with el
 *
 * @param {Element} target
 * @param {Element} el
 */

exports.replace = function (target, el) {
  var parent = target.parentNode
  if (parent) {
    parent.replaceChild(el, target)
  }
}

/**
 * Copy attributes from one element to another.
 *
 * @param {Element} from
 * @param {Element} to
 */

exports.copyAttributes = function (from, to) {
  if (from.hasAttributes()) {
    var attrs = from.attributes
    for (var i = 0, l = attrs.length; i < l; i++) {
      var attr = attrs[i]
      to.setAttribute(attr.name, attr.value)
    }
  }
}

/**
 * Add event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 */

exports.on = function (el, event, cb) {
  el.addEventListener(event, cb)
}

/**
 * Remove event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 */

exports.off = function (el, event, cb) {
  el.removeEventListener(event, cb)
}

/**
 * Add class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {Strong} cls
 */

exports.addClass = function (el, cls) {
  if (el.classList) {
    el.classList.add(cls)
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' '
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      el.setAttribute('class', (cur + cls).trim())
    }
  }
}

/**
 * Remove class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {Strong} cls
 */

exports.removeClass = function (el, cls) {
  if (el.classList) {
    el.classList.remove(cls)
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' '
    var tar = ' ' + cls + ' '
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ')
    }
    el.setAttribute('class', cur.trim())
  }
}

/**
 * Extract raw content inside an element into a temporary
 * container div
 *
 * @param {Element} el
 * @return {Element}
 */

exports.extractContent = function (el) {
  var child
  var rawContent
  if (el.hasChildNodes()) {
    rawContent = document.createElement('div')
    /* jshint boss:true */
    while (child = el.firstChild) {
      rawContent.appendChild(child)
    }
  }
  return rawContent
}
},{"../config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/env.js":[function(require,module,exports){
/**
 * Can we use __proto__?
 *
 * @type {Boolean}
 */

exports.hasProto = '__proto__' in {}

/**
 * Indicates we have a window
 *
 * @type {Boolean}
 */

var toString = Object.prototype.toString
var inBrowser = exports.inBrowser =
  typeof window !== 'undefined' &&
  toString.call(window) !== '[object Object]'

/**
 * Defer a task to the start of the next event loop
 *
 * @param {Function} cb
 * @param {Object} ctx
 */

var defer = inBrowser
  ? (window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    setTimeout)
  : setTimeout

exports.nextTick = function (cb, ctx) {
  if (ctx) {
    defer(function () { cb.call(ctx) }, 0)
  } else {
    defer(cb, 0)
  }
}

/**
 * Detect if we are in IE9...
 *
 * @type {Boolean}
 */

exports.isIE9 =
  inBrowser &&
  navigator.userAgent.indexOf('MSIE 9.0') > 0

/**
 * Sniff transition/animation events
 */

if (inBrowser && !exports.isIE9) {
  var isWebkitTrans =
    window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  var isWebkitAnim =
    window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  exports.transitionProp = isWebkitTrans
    ? 'WebkitTransition'
    : 'transition'
  exports.transitionEndEvent = isWebkitTrans
    ? 'webkitTransitionEnd'
    : 'transitionend'
  exports.animationProp = isWebkitAnim
    ? 'WebkitAnimation'
    : 'animation'
  exports.animationEndEvent = isWebkitAnim
    ? 'webkitAnimationEnd'
    : 'animationend'
}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/filter.js":[function(require,module,exports){
var _ = require('./debug')

/**
 * Resolve read & write filters for a vm instance. The
 * filters descriptor Array comes from the directive parser.
 *
 * This is extracted into its own utility so it can
 * be used in multiple scenarios.
 *
 * @param {Vue} vm
 * @param {Array<Object>} filters
 * @param {Object} [target]
 * @return {Object}
 */

exports.resolveFilters = function (vm, filters, target) {
  if (!filters) {
    return
  }
  var res = target || {}
  // var registry = vm.$options.filters
  filters.forEach(function (f) {
    var def = vm.$options.filters[f.name]
    _.assertAsset(def, 'filter', f.name)
    if (!def) return
    var args = f.args
    var reader, writer
    if (typeof def === 'function') {
      reader = def
    } else {
      reader = def.read
      writer = def.write
    }
    if (reader) {
      if (!res.read) res.read = []
      res.read.push(function (value) {
        return args
          ? reader.apply(vm, [value].concat(args))
          : reader.call(vm, value)
      })
    }
    if (writer) {
      if (!res.write) res.write = []
      res.write.push(function (value, oldVal) {
        return args
          ? writer.apply(vm, [value, oldVal].concat(args))
          : writer.call(vm, value, oldVal)
      })
    }
  })
  return res
}

/**
 * Apply filters to a value
 *
 * @param {*} value
 * @param {Array} filters
 * @param {Vue} vm
 * @param {*} oldVal
 * @return {*}
 */

exports.applyFilters = function (value, filters, vm, oldVal) {
  if (!filters) {
    return value
  }
  for (var i = 0, l = filters.length; i < l; i++) {
    value = filters[i].call(vm, value, oldVal)
  }
  return value
}
},{"./debug":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/debug.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js":[function(require,module,exports){
var lang   = require('./lang')
var extend = lang.extend

extend(exports, lang)
extend(exports, require('./env'))
extend(exports, require('./dom'))
extend(exports, require('./filter'))
extend(exports, require('./debug'))
},{"./debug":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/debug.js","./dom":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/dom.js","./env":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/env.js","./filter":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/filter.js","./lang":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/lang.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/lang.js":[function(require,module,exports){
/**
 * Check is a string starts with $ or _
 *
 * @param {String} str
 * @return {Boolean}
 */

exports.isReserved = function (str) {
  var c = str.charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Guard text output, make sure undefined outputs
 * empty string
 *
 * @param {*} value
 * @return {String}
 */

exports.toString = function (value) {
  return value == null
    ? ''
    : value.toString()
}

/**
 * Check and convert possible numeric numbers before
 * setting back to data
 *
 * @param {*} value
 * @return {*|Number}
 */

exports.toNumber = function (value) {
  return (
    isNaN(value) ||
    value === null ||
    typeof value === 'boolean'
  ) ? value
    : Number(value)
}

/**
 * Strip quotes from a string
 *
 * @param {String} str
 * @return {String | false}
 */

exports.stripQuotes = function (str) {
  var a = str.charCodeAt(0)
  var b = str.charCodeAt(str.length - 1)
  return a === b && (a === 0x22 || a === 0x27)
    ? str.slice(1, -1)
    : false
}

/**
 * Camelize a hyphen-delmited string.
 *
 * @param {String} str
 * @return {String}
 */

var camelRE = /[-_](\w)/g
var capitalCamelRE = /(?:^|[-_])(\w)/g

exports.camelize = function (str, cap) {
  var RE = cap ? capitalCamelRE : camelRE
  return str.replace(RE, function (_, c) {
    return c ? c.toUpperCase () : ''
  })
}

/**
 * Simple bind, faster than native
 *
 * @param {Function} fn
 * @param {Object} ctx
 * @return {Function}
 */

exports.bind = function (fn, ctx) {
  return function () {
    return fn.apply(ctx, arguments)
  }
}

/**
 * Convert an Array-like object to a real Array.
 *
 * @param {Array-like} list
 * @param {Number} [start] - start index
 * @return {Array}
 */

exports.toArray = function (list, start) {
  start = start || 0
  var i = list.length - start
  var ret = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 *
 * @param {Object} to
 * @param {Object} from
 */

exports.extend = function (to, from) {
  for (var key in from) {
    to[key] = from[key]
  }
  return to
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 *
 * @param {*} obj
 * @return {Boolean}
 */

exports.isObject = function (obj) {
  return obj && typeof obj === 'object'
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 *
 * @param {*} obj
 * @return {Boolean}
 */

var toString = Object.prototype.toString
exports.isPlainObject = function (obj) {
  return toString.call(obj) === '[object Object]'
}

/**
 * Array type check.
 *
 * @param {*} obj
 * @return {Boolean}
 */

exports.isArray = function (obj) {
  return Array.isArray(obj)
}

/**
 * Define a non-enumerable property
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 * @param {Boolean} [enumerable]
 */

exports.define = function (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value        : val,
    enumerable   : !!enumerable,
    writable     : true,
    configurable : true
  })
}
},{}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/merge-option.js":[function(require,module,exports){
var _ = require('./index')
var extend = _.extend

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 *
 * All strategy functions follow the same signature:
 *
 * @param {*} parentVal
 * @param {*} childVal
 * @param {Vue} [vm]
 */

var strats = Object.create(null)

/**
 * Helper that recursively merges two data objects together.
 */

function mergeData (to, from) {
  var key, toVal, fromVal
  for (key in from) {
    toVal = to[key]
    fromVal = from[key]
    if (!to.hasOwnProperty(key)) {
      to.$add(key, fromVal)
    } else if (_.isObject(toVal) && _.isObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */

strats.data = function (parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (typeof childVal !== 'function') {
      _.warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.'
      )
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        childVal.call(this),
        parentVal.call(this)
      )
    }
  } else {
    // instance merge, return raw object
    var instanceData = typeof childVal === 'function'
      ? childVal.call(vm)
      : childVal
    var defaultData = typeof parentVal === 'function'
      ? parentVal.call(vm)
      : undefined
    if (instanceData) {
      return mergeData(instanceData, defaultData)
    } else {
      return defaultData
    }
  }
}

/**
 * El
 */

strats.el = function (parentVal, childVal, vm) {
  if (!vm && childVal && typeof childVal !== 'function') {
    _.warn(
      'The "el" option should be a function ' +
      'that returns a per-instance value in component ' +
      'definitions.'
    )
    return
  }
  var ret = childVal || parentVal
  // invoke the element factory if this is instance merge
  return vm && typeof ret === 'function'
    ? ret.call(vm)
    : ret
}

/**
 * Hooks and param attributes are merged as arrays.
 */

strats.created =
strats.ready =
strats.attached =
strats.detached =
strats.beforeCompile =
strats.compiled =
strats.beforeDestroy =
strats.destroyed =
strats.paramAttributes = function (parentVal, childVal) {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : _.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */

strats.directives =
strats.filters =
strats.partials =
strats.transitions =
strats.components = function (parentVal, childVal, vm, key) {
  var ret = Object.create(
    vm && vm.$parent
      ? vm.$parent.$options[key]
      : _.Vue.options[key]
  )
  if (parentVal) {
    var keys = Object.keys(parentVal)
    var i = keys.length
    var field
    while (i--) {
      field = keys[i]
      ret[field] = parentVal[field]
    }
  }
  if (childVal) extend(ret, childVal)
  return ret
}

/**
 * Events & Watchers.
 *
 * Events & watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

strats.watch =
strats.events = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = {}
  extend(ret, parentVal)
  for (var key in childVal) {
    var parent = ret[key]
    var child = childVal[key]
    ret[key] = parent
      ? parent.concat(child)
      : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */

strats.methods =
strats.computed = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = Object.create(parentVal)
  extend(ret, childVal)
  return ret
}

/**
 * Default strategy.
 */

var defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Make sure component options get converted to actual
 * constructors.
 *
 * @param {Object} components
 */

function guardComponents (components) {
  if (components) {
    var def
    for (var key in components) {
      def = components[key]
      if (_.isPlainObject(def)) {
        def.name = key
        components[key] = _.Vue.extend(def)
      }
    }
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 *
 * @param {Object} parent
 * @param {Object} child
 * @param {Vue} [vm] - if vm is present, indicates this is
 *                     an instantiation merge.
 */

module.exports = function mergeOptions (parent, child, vm) {
  guardComponents(child.components)
  var options = {}
  var key
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
  for (key in parent) {
    merge(key)
  }
  for (key in child) {
    if (!(parent.hasOwnProperty(key))) {
      merge(key)
    }
  }
  function merge (key) {
    var strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}
},{"./index":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/vue.js":[function(require,module,exports){
var _ = require('./util')
var extend = _.extend

/**
 * The exposed Vue constructor.
 *
 * API conventions:
 * - public API methods/properties are prefiexed with `$`
 * - internal methods/properties are prefixed with `_`
 * - non-prefixed properties are assumed to be proxied user
 *   data.
 *
 * @constructor
 * @param {Object} [options]
 * @public
 */

function Vue (options) {
  this._init(options)
}

/**
 * Mixin global API
 */

extend(Vue, require('./api/global'))

/**
 * Vue and every constructor that extends Vue has an
 * associated options object, which can be accessed during
 * compilation steps as `this.constructor.options`.
 *
 * These can be seen as the default options of every
 * Vue instance.
 */

Vue.options = {
  directives  : require('./directives'),
  filters     : require('./filters'),
  partials    : {},
  transitions : {},
  components  : {}
}

/**
 * Build up the prototype
 */

var p = Vue.prototype

/**
 * $data has a setter which does a bunch of
 * teardown/setup work
 */

Object.defineProperty(p, '$data', {
  get: function () {
    return this._data
  },
  set: function (newData) {
    this._setData(newData)
  }
})

/**
 * Mixin internal instance methods
 */

extend(p, require('./instance/init'))
extend(p, require('./instance/events'))
extend(p, require('./instance/scope'))
extend(p, require('./instance/compile'))

/**
 * Mixin public API methods
 */

extend(p, require('./api/data'))
extend(p, require('./api/dom'))
extend(p, require('./api/events'))
extend(p, require('./api/child'))
extend(p, require('./api/lifecycle'))

module.exports = _.Vue = Vue
},{"./api/child":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/child.js","./api/data":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/data.js","./api/dom":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/dom.js","./api/events":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/events.js","./api/global":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/global.js","./api/lifecycle":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/api/lifecycle.js","./directives":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/directives/index.js","./filters":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/filters/index.js","./instance/compile":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/compile.js","./instance/events":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/events.js","./instance/init":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/init.js","./instance/scope":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/instance/scope.js","./util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/watcher.js":[function(require,module,exports){
var _ = require('./util')
var config = require('./config')
var Observer = require('./observer')
var expParser = require('./parsers/expression')
var Batcher = require('./batcher')

var batcher = new Batcher()
var uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 *
 * @param {Vue} vm
 * @param {String} expression
 * @param {Function} cb
 * @param {Array} [filters]
 * @param {Boolean} [needSet]
 * @param {Boolean} [deep]
 * @constructor
 */

function Watcher (vm, expression, cb, filters, needSet, deep) {
  this.vm = vm
  vm._watcherList.push(this)
  this.expression = expression
  this.cbs = [cb]
  this.id = ++uid // uid for batching
  this.active = true
  this.deep = deep
  this.deps = Object.create(null)
  // setup filters if any.
  // We delegate directive filters here to the watcher
  // because they need to be included in the dependency
  // collection process.
  this.readFilters = filters && filters.read
  this.writeFilters = filters && filters.write
  // parse expression for getter/setter
  var res = expParser.parse(expression, needSet)
  this.getter = res.get
  this.setter = res.set
  this.value = this.get()
}

var p = Watcher.prototype

/**
 * Add a dependency to this directive.
 *
 * @param {Dep} dep
 */

p.addDep = function (dep) {
  var id = dep.id
  if (!this.newDeps[id]) {
    this.newDeps[id] = dep
    if (!this.deps[id]) {
      this.deps[id] = dep
      dep.addSub(this)
    }
  }
}

/**
 * Evaluate the getter, and re-collect dependencies.
 */

p.get = function () {
  this.beforeGet()
  var vm = this.vm
  var value
  try {
    value = this.getter.call(vm, vm)
  } catch (e) {
    _.warn(e)
  }
  // "touch" every property so they are all tracked as
  // dependencies for deep watching
  if (this.deep) {
    traverse(value)
  }
  value = _.applyFilters(value, this.readFilters, vm)
  this.afterGet()
  return value
}

/**
 * Set the corresponding value with the setter.
 *
 * @param {*} value
 */

p.set = function (value) {
  var vm = this.vm
  value = _.applyFilters(
    value, this.writeFilters, vm, this.value
  )
  try {
    this.setter.call(vm, vm, value)
  } catch (e) {}
}

/**
 * Prepare for dependency collection.
 */

p.beforeGet = function () {
  Observer.target = this
  this.newDeps = {}
}

/**
 * Clean up for dependency collection.
 */

p.afterGet = function () {
  Observer.target = null
  for (var id in this.deps) {
    if (!this.newDeps[id]) {
      this.deps[id].removeSub(this)
    }
  }
  this.deps = this.newDeps
}

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */

p.update = function () {
  if (config.async) {
    batcher.push(this)
  } else {
    this.run()
  }
}

/**
 * Batcher job interface.
 * Will be called by the batcher.
 */

p.run = function () {
  if (this.active) {
    var value = this.get()
    if (
      (typeof value === 'object' && value !== null) ||
      value !== this.value
    ) {
      var oldValue = this.value
      this.value = value
      var cbs = this.cbs
      for (var i = 0, l = cbs.length; i < l; i++) {
        cbs[i](value, oldValue)
        // if a callback also removed other callbacks,
        // we need to adjust the loop accordingly.
        var removed = l - cbs.length
        if (removed) {
          i -= removed
          l -= removed
        }
      }
    }
  }
}

/**
 * Add a callback.
 *
 * @param {Function} cb
 */

p.addCb = function (cb) {
  this.cbs.push(cb)
}

/**
 * Remove a callback.
 *
 * @param {Function} cb
 */

p.removeCb = function (cb) {
  var cbs = this.cbs
  if (cbs.length > 1) {
    var i = cbs.indexOf(cb)
    if (i > -1) {
      cbs.splice(i, 1)
    }
  } else if (cb === cbs[0]) {
    this.teardown()
  }
}

/**
 * Remove self from all dependencies' subcriber list.
 */

p.teardown = function () {
  if (this.active) {
    // remove self from vm's watcher list
    // we can skip this if the vm if being destroyed
    // which can improve teardown performance.
    if (!this.vm._isBeingDestroyed) {
      var list = this.vm._watcherList
      list.splice(list.indexOf(this))
    }
    for (var id in this.deps) {
      this.deps[id].removeSub(this)
    }
    this.active = false
    this.vm = this.cbs = this.value = null
  }
}


/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 *
 * @param {Object} obj
 */

function traverse (obj) {
  var key, val, i
  for (key in obj) {
    val = obj[key]
    if (_.isArray(val)) {
      i = val.length
      while (i--) traverse(val[i])
    } else if (_.isObject(val)) {
      traverse(val)
    }
  }
}

module.exports = Watcher
},{"./batcher":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/batcher.js","./config":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/config.js","./observer":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/observer/index.js","./parsers/expression":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/parsers/expression.js","./util":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/util/index.js"}],"/Users/evan/Personal/vue-hackernews/node_modules/watchify/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"/Users/evan/Personal/vue-hackernews/src/app.vue":[function(require,module,exports){
require("insert-css")("body,html{font-family:Verdana;font-size:13px;margin:0;height:100%;background-color:#f6f6ef}ul{list-style-type:none;padding:0;margin:0}a{color:#000;cursor:pointer;text-decoration:none}#header{background-color:#f60;height:24px;position:relative}#header h1{font-weight:700;font-size:13px;display:inline-block;vertical-align:middle;margin:0}#header .source{color:#fff;font-size:11px;position:absolute;top:4px;right:4px}#header .source a{color:#fff}#header .source a:hover{text-decoration:underline}#yc{border:1px solid #fff;margin:2px;display:inline-block;vertical-align:middle}#yc img{vertical-align:middle}.view{position:absolute;width:100%;transition:opacity .1s ease;box-sizing:border-box;padding:8px 20px}.view.v-enter,.view.v-leave{opacity:0}");
var __vue_template__ = "<!-- header -->\n  <div id=\"header\">\n    <a id=\"yc\" href=\"http://www.ycombinator.com\">\n      <img src=\"https://news.ycombinator.com/y18.gif\">\n    </a>\n    <h1><a href=\"#\">Hacker News</a></h1>\n    <span class=\"source\">\n      Built with <a href=\"http://vuejs.org\" target=\"_blank\">Vue.js</a> |\n      <a href=\"https://github.com/yyx990803/vue-hackernews\" target=\"_blank\">Source</a>\n    </span>\n  </div>\n  <!-- main view -->\n  <div v-component=\"{{view}}\" v-with=\"params:params\" v-transition=\"\"></div>";
module.exports = {
  el: '#app',
  data: {
    view: '',
    params: {
      page: 1,
      userId: null,
      itemId: null
    }
  },
  filters: {
    fromNow: require('./filters/from-now'),
    domain: require('./filters/domain')
  },
  components: {
    'news-view': require('./views/news-view.vue'),
    'item-view': require('./views/item-view.vue'),
    'user-view': require('./views/user-view.vue')
  }
}
module.exports.template = __vue_template__;

},{"./filters/domain":"/Users/evan/Personal/vue-hackernews/src/filters/domain.js","./filters/from-now":"/Users/evan/Personal/vue-hackernews/src/filters/from-now.js","./views/item-view.vue":"/Users/evan/Personal/vue-hackernews/src/views/item-view.vue","./views/news-view.vue":"/Users/evan/Personal/vue-hackernews/src/views/news-view.vue","./views/user-view.vue":"/Users/evan/Personal/vue-hackernews/src/views/user-view.vue","insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}],"/Users/evan/Personal/vue-hackernews/src/components/comment.vue":[function(require,module,exports){
require("insert-css")(".comhead{color:#828282;font-size:11px;margin-bottom:8px}.comhead a{color:#828282}.comhead a:hover{text-decoration:underline}.comhead .toggle{margin-right:4px}.comment-content{margin:0 0 16px 24px}.child-comments{margin:8px 0 8px 22px}");
var __vue_template__ = "<li v-show=\"text\">\n    <div class=\"comhead\">\n      <a class=\"toggle\" v-on=\"click:open = !open\">{{open ? '[-]' : '[+]'}}</a>\n      <a href=\"#/user/{{by}}\">{{by}}</a>\n      {{time | fromNow}} ago\n    </div>\n    <div class=\"comment-content\" v-html=\"text\" v-show=\"open\"></div>\n    <ul class=\"child-comments\" v-if=\"kids\" v-show=\"open\">\n      <li v-repeat=\"comments\" v-component=\"comment\"></li>\n    </ul>\n  </li>";
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      open: true,
      comments: null
    }
  },
  created: function () {
    if (this.kids) {
      store.fetchItems(this.kids, function (comments) {
        this.comments = comments
      }.bind(this))
    }
  }
}
module.exports.template = __vue_template__;

},{"../store":"/Users/evan/Personal/vue-hackernews/src/store.js","insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}],"/Users/evan/Personal/vue-hackernews/src/components/item.vue":[function(require,module,exports){
require("insert-css")(".item{padding:2px 0 2px 40px;position:relative;transition:background-color .2s ease}.item p{margin:2px 0}.item .title:visited{color:#828282}.item .index{color:#828282;position:absolute;width:30px;text-align:right;left:0;top:4px}.item .domain,.item .subtext{font-size:11px;color:#828282}.item .domain a,.item .subtext a{color:#828282}.item .subtext a:hover{text-decoration:underline}");
var __vue_template__ = "<span class=\"index\">{{index}}.</span>\n  <p>\n    <a class=\"title\" href=\"{{href}}\" target=\"_blank\">{{title}}</a>\n    <span class=\"domain\" v-show=\"showDomain\">\n      ({{url | domain}})\n    </span>\n  </p>\n  <p class=\"subtext\">\n    <span v-show=\"showInfo\">\n      {{score}} points by\n      <a href=\"#/user/{{by}}\">{{by}}</a>\n    </span>\n    {{time | fromNow}} ago\n    <span class=\"comments-link\" v-show=\"showInfo\">\n      | <a href=\"#/item/{{id}}\">comments</a>\n    </span>\n  </p>";
module.exports = {
  computed: {
    index: function () {
      if (this.$parent.displayPage) {
        return (this.$parent.displayPage - 1) * 30 + this.$index + 1
      }
    },
    href: function () {
      return this.url || ('#/item/' + this.id)
    },
    showInfo: function () {
      return this.type === 'story' || this.type === 'poll'
    },
    showDomain: function () {
      return this.type === 'story'
    }
  }
}
module.exports.template = __vue_template__;

},{"insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}],"/Users/evan/Personal/vue-hackernews/src/filters/domain.js":[function(require,module,exports){
var parser = document.createElement('a')

module.exports = function (url) {
  parser.href = url
  return parser.hostname
}
},{}],"/Users/evan/Personal/vue-hackernews/src/filters/from-now.js":[function(require,module,exports){
module.exports = function (time) {
  var between = Date.now() / 1000 - Number(time)
  if (between < 3600) {
    return ~~(between / 60) + ' minutes'
  } else if (between < 86400) {
    return ~~(between / 3600) + ' hours'
  } else {
    return ~~(between / 86400) + ' days'
  }
}
},{}],"/Users/evan/Personal/vue-hackernews/src/main.js":[function(require,module,exports){
/**
 * Boot up the Vue instance and wire up the router.
 */

var Vue = require('vue')
var Router = require('director').Router
var app = new Vue(require('./app.vue'))
var router = new Router()

router.on('/news/:page', function (page) {
  window.scrollTo(0, 0)
  app.view = 'news-view'
  app.params.page = +page
})

router.on('/user/:id', function (id) {
  window.scrollTo(0, 0)
  app.view = 'user-view'
  app.params.userId = id
})

router.on('/item/:id', function (id) {
  window.scrollTo(0, 0)
  app.view = 'item-view'
  app.params.itemId = id
})

router.configure({
  notfound: function () {
    router.setRoute('/news/1')
  }
})

router.init('/news/1')
},{"./app.vue":"/Users/evan/Personal/vue-hackernews/src/app.vue","director":"/Users/evan/Personal/vue-hackernews/node_modules/director/build/director.js","vue":"/Users/evan/Personal/vue-hackernews/node_modules/vue/src/vue.js"}],"/Users/evan/Personal/vue-hackernews/src/store.js":[function(require,module,exports){
var Firebase = require('firebase')
var api = new Firebase('https://hacker-news.firebaseio.com/v0')
var storiesPerPage = 30
var cachedStoryIds = []
var Emitter = require('events').EventEmitter
var store = module.exports = new Emitter()

/**
 * Subscribe to real time updates of the top 100 stories,
 * and cache the IDs locally.
 */

api.child('topstories').on('value', function (snapshot) {
  cachedStoryIds = snapshot.val()
  store.emit('update')
})

/**
 * Fetch an item data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(item)
 */

store.fetchItem = function (id, cb) {
  api.child('item/' + id).once('value', function (snapshot) {
    cb(snapshot.val())
  })
}

/**
 * Fetch a user data with given id.
 *
 * @param {Number} id
 * @param {Function} cb(user)
 */

store.fetchUser = function (id, cb) {
  api.child('user/' + id).once('value', function (snapshot) {
    cb(snapshot.val())
  })
}

/**
 * Fetch the given list of items.
 *
 * @param {Array<Number>} ids
 * @param {Function} cb(items)
 */

store.fetchItems = function (ids, cb) {
  if (!ids || !ids.length) return cb([])
  var items = []
  ids.forEach(function (id) {
    store.fetchItem(id, addItem)
  })
  function addItem (item) {
    items.push(item)
    if (items.length >= ids.length) {
      cb(items)
    }
  }
}

/**
 * Fetch items for the given page.
 *
 * @param {Number} page
 * @param {Function} cb(stories)
 */

store.fetchItemsByPage = function (page, cb) {
  var start = (page - 1) * storiesPerPage
  var end = page * storiesPerPage
  var ids = cachedStoryIds.slice(start, end)
  store.fetchItems(ids, cb)
}
},{"events":"/Users/evan/Personal/vue-hackernews/node_modules/watchify/node_modules/browserify/node_modules/events/events.js","firebase":"/Users/evan/Personal/vue-hackernews/node_modules/firebase/lib/firebase-web.js"}],"/Users/evan/Personal/vue-hackernews/src/views/item-view.vue":[function(require,module,exports){
require("insert-css")(".item-view .item{padding-left:0;margin-bottom:30px}.item-view .item .comments-link,.item-view .item .index{display:none}.item-view .poll-options{margin-left:30px;margin-bottom:40px}.item-view .poll-options li{margin:12px 0}.item-view .poll-options p{margin:8px 0}.item-view .poll-options .subtext{color:#828282;font-size:11px}");
var __vue_template__ = "<div class=\"view item-view\" v-show=\"item\">\n    <div class=\"item\" v-component=\"item\" v-with=\"item\"></div>\n    <ul class=\"poll-options\" v-if=\"pollOptions\">\n      <li v-repeat=\"pollOptions\">\n        <p>{{text}}</p>\n        <p class=\"subtext\">{{score}} points</p>\n      </li>\n    </ul>\n    <ul class=\"comments\" v-if=\"comments\">\n      <li v-repeat=\"comments\" v-component=\"comment\"></li>\n    </ul>\n    <p v-show=\"!comments.length\">No comments yet.</p>\n  </div>";
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      params: {
        itemId: null
      },
      item: null,
      pollOptions: null,
      comments: []
    }
  },
  watch: {
    'params.itemId': 'update'
  },
  compiled: function () {
    this.update()
  },
  methods: {
    update: function () {
      store.fetchItem(this.params.itemId, function (item) {
        this.item = item
        this.fetchComments()
        if (item.type === 'poll') {
          this.fetchPollOptions()
        }
      }.bind(this))
    },
    fetchComments: function () {
      store.fetchItems(this.item.kids, function (comments) {
        this.comments = comments
      }.bind(this))
    },
    fetchPollOptions: function () {
      store.fetchItems(this.item.parts, function (options) {
        this.pollOptions = options
      }.bind(this))
    }
  },
  components: {
    item: require('../components/item.vue'),
    comment: require('../components/comment.vue')
  }
}
module.exports.template = __vue_template__;

},{"../components/comment.vue":"/Users/evan/Personal/vue-hackernews/src/components/comment.vue","../components/item.vue":"/Users/evan/Personal/vue-hackernews/src/components/item.vue","../store":"/Users/evan/Personal/vue-hackernews/src/store.js","insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}],"/Users/evan/Personal/vue-hackernews/src/views/news-view.vue":[function(require,module,exports){
require("insert-css")(".news-view{padding-left:0;padding-right:0}.news-view.loading:before{content:\"Loading...\";position:absolute;top:16px;left:20px}.news-view .nav{padding:10px 10px 10px 40px;margin-top:10px;border-top:2px solid #f60}.news-view .nav a{margin-right:10px}.news-view .nav a:hover{text-decoration:underline}");
var __vue_template__ = "<div class=\"view news-view\" v-class=\"loading:!items.length\">\n  <!-- item list -->\n  <ul>\n    <li class=\"item\" v-repeat=\"items\" v-component=\"item\" track-by=\"id\"></li>\n  </ul>\n  <!-- navigation -->\n  <div class=\"nav\" v-show=\"items.length > 0\">\n    <a v-if=\"params.page > 1\" href=\"#/news/{{params.page - 1}}\">&lt; prev</a>\n    <a v-if=\"params.page < 4\" href=\"#/news/{{params.page + 1}}\">more...</a>\n  </div>\n</div>";
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      params: {
        page: 1
      },
      displayPage: 1,
      items: []
    }
  },
  watch: {
    'params.page': 'update'
  },
  compiled: function () {
    this.update()
    store.on('update', this.update)
  },
  destroyed: function () {
    store.removeListener('update', this.update)
  },
  components: {
    item: require('../components/item.vue')
  },
  methods: {
    update: function () {
      store.fetchItemsByPage(this.params.page, function (items) {
        this.items = items
        this.displayPage = this.params.page
      }.bind(this))
    }
  }
}
module.exports.template = __vue_template__;

},{"../components/item.vue":"/Users/evan/Personal/vue-hackernews/src/components/item.vue","../store":"/Users/evan/Personal/vue-hackernews/src/store.js","insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}],"/Users/evan/Personal/vue-hackernews/src/views/user-view.vue":[function(require,module,exports){
require("insert-css")(".user-view{color:$gray}.user-view li{margin:5px 0}.user-view .label{display:inline-block;min-width:60px}.user-view .about{margin-top:1em}.user-view .links a{text-decoration:underline}");
var __vue_template__ = "<div class=\"view user-view\" v-show=\"user\">\n    <ul>\n      <li><span class=\"label\">user:</span> {{user.id}}</li>\n      <li><span class=\"label\">created:</span> {{user.created | fromNow}} ago</li>\n      <li><span class=\"label\">karma:</span> {{user.karma}}</li>\n      <li>\n        <span class=\"label\">about:</span>\n        <div class=\"about\" v-html=\"user.about\"></div>\n      </li>\n    </ul>\n    <p class=\"links\">\n      <a href=\"https://news.ycombinator.com/submitted?id={{user.id}}\">submissions</a><br>\n      <a href=\"https://news.ycombinator.com/threads?id={{user.id}}\">comments</a>\n    </p>\n  </div>";
var store = require('../store')

module.exports = {
  replace: true,
  data: function () {
    return {
      params: {
        userId: null
      },
      user: {}
    }
  },
  watch: {
    'params.userId': 'update'
  },
  compiled: function () {
    this.update()
  },
  methods: {
    update: function () {
      store.fetchUser(this.id, function (user) {
        this.user = user
      }.bind(this))
    }
  }
}
module.exports.template = __vue_template__;

},{"../store":"/Users/evan/Personal/vue-hackernews/src/store.js","insert-css":"/Users/evan/Personal/vue-hackernews/node_modules/insert-css/index.js"}]},{},["/Users/evan/Personal/vue-hackernews/src/main.js"]);
