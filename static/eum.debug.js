(function () {
  'use strict';

  var pageLoad = 'pl';

  // aliasing globals for improved minifications
  var win = window;
  var doc = win.document;
  var nav = navigator;
  var encodeURIComponent = win.encodeURIComponent;
  var XMLHttpRequest = win.XMLHttpRequest;
  var originalFetch = win.fetch;
  var localStorage = function () {
    try {
      return win.localStorage;
    } catch (e) {
      // localStorage access is not permitted in certain security modes, e.g.
      // when cookies are completely disabled in web browsers.
      return null;
    }
  }();
  /**
   * Leverage's browser behavior to load image sources. Exposed via this module
   * to enable testing.
   */

  function executeImageRequest(url) {
    var image = new Image();
    image.src = url;
  }
  /**
   * Exposed via this module to enable testing.
   */

  function sendBeacon(url, data) {
    return nav.sendBeacon(url, data);
  }

  // protection against hasOwnProperty overrides.

  var globalHasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwnProperty(obj, key) {
    return globalHasOwnProperty.call(obj, key);
  }
  function now() {
    return new Date().getTime();
  }
  function noop() {} // We are trying to stay close to common tracing architectures and use
  // a hex encoded 64 bit random ID.

  var validIdCharacters = '0123456789abcdef'.split('');

  var generateUniqueIdImpl = function generateUniqueIdViaRandom() {
    var result = '';

    for (var i = 0; i < 16; i++) {
      result += validIdCharacters[Math.round(Math.random() * 15)];
    }

    return result;
  };

  if (win.crypto && win.crypto.getRandomValues && win.Uint32Array) {
    generateUniqueIdImpl = function generateUniqueIdViaCrypto() {
      var array = new win.Uint32Array(2);
      win.crypto.getRandomValues(array);
      return array[0].toString(16) + array[1].toString(16);
    };
  }

  var generateUniqueId = generateUniqueIdImpl;
  function addEventListener$1(target, eventType, callback) {
    if (target.addEventListener) {
      target.addEventListener(eventType, callback, false);
    } else if (target.attachEvent) {
      target.attachEvent('on' + eventType, callback);
    }
  }
  function removeEventListener(target, eventType, callback) {
    if (target.removeEventListener) {
      target.removeEventListener(eventType, callback, false);
    } else if (target.detachEvent) {
      target.detachEvent('on' + eventType, callback);
    }
  }
  function matchesAny(regexp, s) {
    for (var i = 0, len = regexp.length; i < len; i++) {
      if (regexp[i].test(s)) {
        return true;
      }
    }

    return false;
  }

  /* eslint-disable no-console */
  // $FlowFixMe The function is never going to be used when it is a bool
  var log =  createLogger('log'); // $FlowFixMe The function is never going to be used when it is a bool

  var info =  createLogger('info'); // $FlowFixMe The function is never going to be used when it is a bool

  var warn =  createLogger('warn'); // $FlowFixMe The function is never going to be used when it is a bool

  var error =  createLogger('error'); // $FlowFixMe The function is never going to be used when it is a bool

  var debug =  createLogger('debug');

  function createLogger(method) {
    if (typeof console === 'undefined' || typeof console.log !== 'function' || typeof console.log.apply !== 'function') {
      return noop;
    }

    if (console[method] && typeof console[method].apply === 'function') {
      return function () {
        console[method].apply(console, arguments);
      };
    }

    return function () {
      console.log.apply(console, arguments);
    };
  }

  // ensure that execution of timers happens outside of any Angular specific zones. This in turn
  // means that this script will never disturb Angular's stabilization phase.
  // https://angular.io/api/core/ApplicationRef#isStable
  // Please note that it may sometimes be necessary to deliberately execute code inside of
  // Angular's Zones. Always take care to make a deliberate decision when to use and when not to
  // use these wrappers.
  // We take a copy of all globals to ensure that no other script will change them all of a sudden.
  // This ensures that when we register a timeout/interval on one global, that we will be able to
  // de-register it again in all cases.

  var globals = {
    'setTimeout': win.setTimeout,
    'clearTimeout': win.clearTimeout,
    'setInterval': win.setInterval,
    'clearInterval': win.clearInterval
  }; // If the globals don't exist at execution time of this file, then we know that the globals stored
  // above are not wrapped by Zone.js. This in turn can mean better performance for Angular users.

  var isRunningZoneJs = win['Zone'] != null && win['Zone']['root'] != null && typeof win['Zone']['root']['run'] === 'function';

  if ( isRunningZoneJs) {
    info('Discovered Zone.js globals. Will attempt to register all timers inside the root Zone.');
  }

  function setTimeout() {
    return executeGlobally.apply('setTimeout', arguments);
  }
  function clearTimeout() {
    return executeGlobally.apply('clearTimeout', arguments);
  }
  function setInterval() {
    return executeGlobally.apply('setInterval', arguments);
  }

  function executeGlobally() {
    // We don't want to incur a performance penalty for all users just because some
    // users are relying on zone.js. This API looks quite ridiculous, but it
    // allows for concise and efficient code, e.g. arguments does not need to be
    // translated into an array.
    var globalFunctionName = this;

    if (isRunningZoneJs) {
      try {
        // Incurr a performance overhead for Zone.js users that we just cannot avoid:
        // Copy the arguments passed in here so that we can use them inside the root
        // zone.
        var args = Array.prototype.slice.apply(arguments);
        return win['Zone']['root']['run'](globals[globalFunctionName], win, args);
      } catch (e) {
        {
          warn('Failed to execute %s inside of zone (via Zone.js). Falling back to execution inside currently ' + 'active zone.', globalFunctionName, e);
        } // failure – maybe zone js not properly initialized? Fall back to execution
        // outside of Zone.js as a last resort (outside of try/catch and if)

      }
    } // Note: Explicitly passing win as 'this' even though we are getting the function from 'globals'


    return globals[globalFunctionName].apply(win, arguments);
  }

  var bus = {};
  function on(name, fn) {
    var listeners = bus[name] = bus[name] || [];
    listeners.push(fn);
  }
  function emit(name, value) {
    var listeners = bus[name];

    if (!listeners) {
      return;
    }

    for (var i = 0, length = listeners.length; i < length; i++) {
      listeners[i](value);
    }
  }

  var event = {
    name: 'e:onLoad',
    time: null,
    initialize: function () {
      if (document.readyState === 'complete') {
        return onReady();
      }

      addEventListener$1(win, 'load', function () {
        // we want to get timing data for loadEventEnd,
        // so asynchronously process this
        setTimeout(onReady, 0);
      });
    }
  };

  function onReady() {
    event.time = now();
    emit(event.name, event.time);
  }

  var states = {};
  var currentStateName;
  function registerState(name, impl) {
    states[name] = impl;
  }
  function transitionTo(nextStateName) {
    {
      info('Transitioning from %s to %s', currentStateName || '<no state>', nextStateName);
    }

    currentStateName = nextStateName;
    states[nextStateName].onEnter();
  }
  function getActiveTraceId() {
    return states[currentStateName].getActiveTraceId();
  }
  function getActivePhase() {
    return states[currentStateName].getActivePhase();
  }

  var performance = win.performance || win.webkitPerformance || win.msPerformance || win.mozPerformance;
  var isTimingAvailable = performance && performance.timing;
  var isResourceTimingAvailable = performance && performance.getEntriesByType;
  var isPerformanceObserverAvailable = performance && typeof win['PerformanceObserver'] === 'function' && typeof performance['now'] === 'function';

  var defaultVars = {
    nameOfLongGlobal: 'EumObject',
    trackingSnippetVersion: null,
    pageLoadTraceId: generateUniqueId(),
    pageLoadBackendTraceId: null,
    serverTimingBackendTraceIdEntryName: 'intid',
    referenceTimestamp: now(),
    highResTimestampReference: performance && performance.now ? performance.now() : 0,
    initializerExecutionTimestamp: now(),
    reportingUrl: 'http://169.53.56.203:30001/report',
    beaconBatchingTime: 500,
    maxWaitForResourceTimingsMillis: 10000,
    maxMaitForPageLoadMetricsMillis: 5000,
    apiKey: null,
    meta: {},
    ignoreUrls: [],
    ignorePings: true,
    ignoreErrorMessages: [],
    xhrTransmissionTimeout: 20000,
    allowedOrigins: ['*'],
    page: undefined,
    wrapEventHandlers: false,
    wrappedEventHandlersOriginalFunctionStorageKey: '__weaselOriginalFunctions__',
    wrapTimers: false,
    secretPropertyKey: '__weaselSecretData__',
    userId: undefined,
    userName: undefined,
    userEmail: undefined,
    sessionId: undefined,
    sessionStorageKey: 'session',
    defaultSessionInactivityTimeoutMillis: 1000 * 60 * 60 * 3,
    defaultSessionTerminationTimeoutMillis: 1000 * 60 * 60 * 6,
    maxAllowedSessionTimeoutMillis: 1000 * 60 * 60 * 24,
    // The default ignore rules cover specific React and Angular patterns:
    //
    // React has a whole lot of user timings. Luckily all of them start with
    // the emojis for easy filtering. Let's ignore them by default as most of
    // them won't be valuable to many of our users (in production).
    //
    // Similar for Angular which uses zones with a ton of custom user
    // timings. https://angular.io/guide/zone
    //
    // We have also seen people use 'start xyz' / 'end xyz' as a common pattern to
    // name marks used to create measures. This is surely not a comprehensive
    // solution to identify these cases, but should for now be sufficient.
    ignoreUserTimings: [/^\u269B/, /^\u26D4/, /^Zone(:|$)/, /^start /i, /^end /i],
    urlsToCheckForGraphQlInsights: [/\/graphql/i]
  };

  var state = {
    onEnter: function () {
      on(event.name, onLoad);
      event.initialize();
    },
    getActiveTraceId: function () {
      return defaultVars.pageLoadTraceId;
    },
    getActivePhase: function () {
      return pageLoad;
    }
  };

  function onLoad() {
    transitionTo('pageLoaded');
  }

  var maximumNumberOfMetaDataFields = 25;
  var maximumLengthPerMetaDataField = 1024;
  var languages = determineLanguages();
  function addCommonBeaconProperties(beacon) {
    beacon['k'] = defaultVars.apiKey;
    beacon['sv'] = defaultVars.trackingSnippetVersion;
    beacon['r'] = defaultVars.referenceTimestamp;
    beacon['p'] = defaultVars.page;
    beacon['l'] = win.location.href;
    beacon['pl'] = defaultVars.pageLoadTraceId;
    beacon['ui'] = defaultVars.userId;
    beacon['un'] = defaultVars.userName;
    beacon['ue'] = defaultVars.userEmail;
    beacon['ul'] = languages;
    beacon['ph'] = getActivePhase();
    beacon['sid'] = defaultVars.sessionId;
    beacon['ww'] = win.innerWidth;
    beacon['wh'] = win.innerHeight; // Google Closure compiler is not yet aware of these globals. Make sure it doesn't
    // mangle them.

    if (nav['connection'] && nav['connection']['effectiveType']) {
      beacon['ct'] = nav['connection']['effectiveType'];
    }

    if (doc.visibilityState) {
      beacon['h'] = doc.visibilityState === 'hidden' ? 1 : 0;
    }

    addMetaDataToBeacon(beacon, defaultVars.meta);
  }

  function determineLanguages() {
    if (nav.languages && nav.languages.length > 0) {
      return nav.languages.slice(0, 5).join(',');
    }

    if (typeof nav.userLanguage === 'string') {
      return [nav.userLanguage].join(',');
    }

    return undefined;
  }

  function addMetaDataToBeacon(beacon, meta) {
    var i = 0;

    for (var key in meta) {
      if (hasOwnProperty(meta, key)) {
        i++;

        if (i > maximumNumberOfMetaDataFields) {
          {
            warn('Maximum number of meta data fields exceeded. Not all meta data fields will be transmitted.');
          }

          return;
        }

        var serializedValue = null;

        if (typeof meta[key] === 'string') {
          serializedValue = meta[key];
        } else if (meta[key] === undefined) {
          serializedValue = 'undefined';
        } else if (meta[key] === null) {
          serializedValue = 'null';
        } else if (win.JSON) {
          try {
            serializedValue = win.JSON.stringify(meta[key]);
          } catch (e) {
            {
              warn('JSON serialization of meta data', key, meta[key], 'failed due to', e, '. This value will not be transmitted.');
            }

            continue;
          }
        } else {
          serializedValue = String(meta[key]);
        }

        beacon['m_' + key] = serializedValue.substring(0, maximumLengthPerMetaDataField);
      }
    }
  }

  var urlMaxLength = 255;
  var initiatorTypes = {
    'other': 0,
    'img': 1,
    // IMAGE element inside a SVG
    'image': 1,
    'link': 2,
    'script': 3,
    'css': 4,
    'xmlhttprequest': 5,
    'fetch': 5,
    'beacon': 5,
    'html': 6,
    'navigation': 6
  };
  var cachingTypes = {
    unknown: 0,
    cached: 1,
    validated: 2,
    fullLoad: 3
  };

  function serializeEntryToArray(entry) {
    var result = [Math.round(entry['startTime'] - defaultVars.highResTimestampReference), Math.round(entry['duration']), initiatorTypes[entry['initiatorType']] || initiatorTypes['other']]; // When timing data is available, we can provide additional information about
    // caching and resource sizes.

    if (typeof entry['transferSize'] === 'number' && typeof entry['encodedBodySize'] === 'number' && // All this information may not be available due to the timing allow origin check.
    entry['encodedBodySize'] > 0) {
      if (entry['transferSize'] === 0) {
        result.push(cachingTypes.cached);
      } else if (entry['transferSize'] > 0 && (entry['encodedBodySize'] === 0 || entry['transferSize'] < entry['encodedBodySize'])) {
        result.push(cachingTypes.validated);
      } else {
        result.push(cachingTypes.fullLoad);
      }

      if (entry['encodedBodySize'] != null) {
        result.push(entry['encodedBodySize']);
      } else {
        result.push('');
      }

      if (entry['decodedBodySize'] != null) {
        result.push(entry['decodedBodySize']);
      } else {
        result.push('');
      }

      if (entry['transferSize'] != null) {
        result.push(entry['transferSize']);
      } else {
        result.push('');
      }
    } else {
      result.push('');
      result.push('');
      result.push('');
      result.push('');
    }

    var hasValidTimings = entry['responseStart'] != null && // timing allow origin check may have failed
    entry['responseStart'] >= entry['fetchStart'];

    if (hasValidTimings) {
      result.push(calculateTiming(entry['redirectEnd'], entry['redirectStart']));
      result.push(calculateTiming(entry['domainLookupStart'], entry['fetchStart']));
      result.push(calculateTiming(entry['domainLookupEnd'], entry['domainLookupStart']));

      if (entry['connectStart'] > 0 && entry['connectEnd'] > 0) {
        if (entry['secureConnectionStart'] != null && entry['secureConnectionStart'] > 0) {
          result.push(calculateTiming(entry['secureConnectionStart'], entry['connectStart']));
          result.push(calculateTiming(entry['connectEnd'], entry['secureConnectionStart']));
        } else {
          result.push(calculateTiming(entry['connectEnd'], entry['connectStart']));
          result.push('');
        }
      } else {
        result.push('');
        result.push('');
      }

      result.push(calculateTiming(entry['responseStart'], entry['requestStart']));
      result.push(calculateTiming(entry['responseEnd'], entry['responseStart']));
    }

    var backendTraceId = '';

    try {
      var serverTimings = entry['serverTiming'];

      if (serverTimings instanceof Array) {
        for (var i = 0; i < serverTimings.length; i++) {
          var serverTiming = serverTimings[i];

          if (serverTiming['name'] === defaultVars.serverTimingBackendTraceIdEntryName) {
            backendTraceId = serverTiming['description'];
          }
        }
      }
    } catch (e) {// Some browsers may not grant access to the field when the Timing-Allow-Origin
      // check fails. Better be safe than sorry here.
    }

    result.push(backendTraceId);

    if (hasValidTimings) {
      result.push(calculateTiming(entry['responseStart'], entry['startTime']));
    } else {
      result.push('');
    }

    return result;
  }
  function serializeEntry(entry) {
    return serializeEntryToArray(entry).join(',') // remove empty trailing timings
    .replace(/,+$/, '');
  }

  function calculateTiming(a, b) {
    if (a == null || b == null || // the values being equal indicates for example that a network connection didn't need
    // to be established. Do not report a timing of '0' as this will skew the statistics.
    a === b) {
      return '';
    }

    var diff = Math.round(a - b);

    if (diff < 0) {
      return '';
    }

    return diff;
  }

  var dataUrlPrefix = 'data:';
  var ignorePingsRegex = /.*\/ping(\/?$|\?.*)/i;
  function isUrlIgnored(url) {
    if (!url) {
      return true;
    } // Force string conversion. During runtime we have seen that some URLs passed into this code path aren't actually
    // strings. Reason currently unknown.


    url = String(url);

    if (!url) {
      return true;
    } // We never want to track data URLs. Instead of matching these via regular expressions (which might be expensive),
    // we are explicitly doing a startsWith ignore case check
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs


    if (url.substring == null || url.substring(0, dataUrlPrefix.length).toLowerCase() === dataUrlPrefix) {
      return true;
    }

    if (defaultVars.ignorePings && ignorePingsRegex.test(url)) {
      return true;
    } // Disable monitoring of data transmission requests. The data transmission strategy already ensures
    // that data transmission requests are not picked up internally. However we have seen some users
    // leverage custom (broken) XMLHttpRequest instrumentations to implement application code which
    // then break the detection of data transmission requests.


    if (defaultVars.reportingUrl && (url === defaultVars.reportingUrl || url === defaultVars.reportingUrl + '/')) {
      return true;
    }

    return matchesAny(defaultVars.ignoreUrls, url);
  }
  function isErrorMessageIgnored(message) {
    return !message || matchesAny(defaultVars.ignoreErrorMessages, message);
  }

  var INTERNAL_END_MARKER = '<END>';
  function createTrie() {
    return new Trie();
  }

  function Trie() {
    this.root = {};
  }

  Trie.prototype.addItem = function addItem(key, value) {
    this.insertItem(this.root, key.split(''), 0, value);
    return this;
  };

  Trie.prototype.insertItem = function insertItem(node, keyCharacters, keyCharacterIndex, value) {
    var character = keyCharacters[keyCharacterIndex]; // Characters exhausted, add value to node

    if (character == null) {
      var values = node[INTERNAL_END_MARKER] = node[INTERNAL_END_MARKER] || [];
      values.push(value);
      return;
    }

    var nextNode = node[character] = node[character] || {};
    this.insertItem(nextNode, keyCharacters, keyCharacterIndex + 1, value);
  };

  Trie.prototype.toJs = function toJs(node) {
    node = node || this.root;
    var keys = getKeys(node);

    if (keys.length === 1 && keys[0] === INTERNAL_END_MARKER) {
      return node[INTERNAL_END_MARKER].slice();
    }

    var result = {};

    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = node[key];

      if (key === INTERNAL_END_MARKER) {
        result['$'] = value.slice();
        continue;
      }

      var combinedKeys = key;
      var child = node[key];
      var childKeys = getKeys(child);

      while (childKeys.length === 1 && childKeys[0] !== INTERNAL_END_MARKER) {
        combinedKeys += childKeys[0];
        child = child[childKeys[0]];
        childKeys = getKeys(child);
      }

      result[combinedKeys] = this.toJs(child);
    }

    return result;
  };

  function getKeys(obj) {
    var result = [];

    for (var key in obj) {
      if (hasOwnProperty(obj, key)) {
        result.push(key);
      }
    }

    return result;
  }

  // See https://www.w3.org/TR/hr-time/

  function addResourceTimings(beacon, minStartTime) {
    if (isResourceTimingAvailable && win.JSON) {
      var entries = getEntriesTransferFormat(performance.getEntriesByType('resource'), minStartTime);
      beacon['res'] = win.JSON.stringify(entries);
    } else {
      info('Resource timing not supported.');
    }
  }

  function getEntriesTransferFormat(performanceEntries, minStartTime) {
    var trie = createTrie();
    var lowerCaseReportingUrl = defaultVars.reportingUrl != null ? defaultVars.reportingUrl.toLowerCase() : null;

    for (var i = 0, len = performanceEntries.length; i < len; i++) {
      var entry = performanceEntries[i];

      if (minStartTime != null && entry['startTime'] - defaultVars.highResTimestampReference + defaultVars.referenceTimestamp < minStartTime) {
        continue;
      } else if (entry['duration'] < 0) {
        // Some old browsers do not properly implement resource timing. They report negative durations.
        // Ignore instead of reporting these, as the data isn't usable.
        continue;
      }

      var url = entry.name;

      if (isUrlIgnored(url)) {
        {
          info('Will not include data about resource because resource URL is ignored via ignore rules.', entry);
        }

        continue;
      }

      var lowerCaseUrl = url.toLowerCase();
      var initiatorType = entry['initiatorType'];

      if (lowerCaseUrl === 'about:blank' || lowerCaseUrl.indexOf('javascript:') === 0 || // some iframe cases
      // Data transmission can be visible as a resource. Do not report it.
      lowerCaseReportingUrl != null && lowerCaseUrl.indexOf(lowerCaseReportingUrl) === 0) {
        continue;
      }

      if (url.length > urlMaxLength) {
        url = url.substring(0, urlMaxLength);
      } // We provide more detailed XHR insights via our XHR instrumentation.
      // The XHR instrumentation is available once the initialization was executed
      // (which is completely synchronous).


      if (initiatorType !== 'xmlhttprequest' || entry['startTime'] < defaultVars.highResTimestampReference) {
        trie.addItem(url, serializeEntry(entry));
      }
    }

    return trie.toJs();
  }

  // https://www.w3.org/TR/navigation-timing/

  var pageLoadStartTimestamp = getPageLoadStartTimestamp();

  function getPageLoadStartTimestamp() {
    if (!isTimingAvailable) {
      return defaultVars.initializerExecutionTimestamp;
    }

    return performance.timing.navigationStart;
  }

  function addTimingToPageLoadBeacon(beacon) {
    if (!isTimingAvailable) {
      // This is our absolute fallback mode where we only have
      // approximations for speed information.
      beacon['ts'] = pageLoadStartTimestamp - defaultVars.referenceTimestamp;
      beacon['d'] = Number(event.time) - defaultVars.initializerExecutionTimestamp; // We add this as an extra property to the beacon so that
      // a backend can decide whether it should include timing
      // information in aggregated metrics. Since they are only
      // approximations, this is not always desirable.

      if (!isTimingAvailable) {
        beacon['tim'] = '0';
      }

      return;
    }

    var timing = performance.timing;
    var redirectTime = timing.redirectEnd - timing.redirectStart; // We don't use navigationStart since that includes unload times for the previous page.

    var start = pageLoadStartTimestamp;
    beacon['ts'] = start - defaultVars.referenceTimestamp; // This can happen when the user aborts the page load. In this case, the load event
    // timing information is not available and will have the default value of "0".

    if (timing.loadEventStart > 0) {
      beacon['d'] = timing.loadEventStart - (timing.fetchStart || timing.navigationStart);
    } else {
      beacon['d'] = Number(event.time) - defaultVars.initializerExecutionTimestamp; // We have partial timing information, but since the load was aborted, we will
      // mark it as missing to indicate that the information should be ignored in
      // statistics.

      beacon['tim'] = '0';
    }

    beacon['t_unl'] = timing.unloadEventEnd - timing.unloadEventStart;
    beacon['t_red'] = redirectTime;
    beacon['t_apc'] = timing.domainLookupStart - (timing.fetchStart || timing.redirectEnd || timing.unloadEventEnd || timing.navigationStart);
    beacon['t_dns'] = timing.domainLookupEnd - timing.domainLookupStart;

    if (timing.connectStart > 0 && timing.connectEnd > 0) {
      if (timing.secureConnectionStart != null && timing.secureConnectionStart > 0 // Issue in the navigation timing spec: Secure connection start does not take
      // connection reuse into consideration. At the time of writing (2020-07-11)
      // the latest W3C Navigation Timing recommendation still contains this issue.
      // The latest editor draft has these fixed (by linking to the resource timing
      // spec instead of duplicating the information).
      // For now a workaround to avoid these wrong timings seems to be the following.
      && timing.secureConnectionStart >= timing.connectStart) {
        beacon['t_tcp'] = timing.secureConnectionStart - timing.connectStart;
        beacon['t_ssl'] = timing.connectEnd - timing.secureConnectionStart;
      } else {
        beacon['t_tcp'] = timing.connectEnd - timing.connectStart;
        beacon['t_ssl'] = 0;
      }
    }

    beacon['t_req'] = timing.responseStart - timing.requestStart;
    beacon['t_rsp'] = timing.responseEnd - timing.responseStart;
    beacon['t_dom'] = timing.domContentLoadedEventStart - timing.domLoading;
    beacon['t_chi'] = timing.loadEventEnd - timing.domContentLoadedEventStart;
    beacon['t_bac'] = timing.responseStart - start;
    beacon['t_fro'] = timing.loadEventEnd - timing.responseStart;
    beacon['t_pro'] = timing.loadEventStart - timing.domLoading;
    beacon['t_loa'] = timing.loadEventEnd - timing.loadEventStart;
    beacon['t_ttfb'] = timing.responseStart - start;
    addFirstPaintTimings(beacon, start);
  }

  function addFirstPaintTimings(beacon, start) {
    if (!isResourceTimingAvailable) {
      addFirstPaintFallbacks(beacon, start);
      return;
    }

    var paintTimings = performance.getEntriesByType('paint');
    var firstPaintFound = false;

    for (var i = 0; i < paintTimings.length; i++) {
      var paintTiming = paintTimings[i];

      switch (paintTiming.name) {
        case 'first-paint':
          beacon['t_fp'] = paintTiming.startTime | 0;
          firstPaintFound = true;
          break;

        case 'first-contentful-paint':
          beacon['t_fcp'] = paintTiming.startTime | 0;
          break;
      }
    }

    if (!firstPaintFound) {
      addFirstPaintFallbacks(beacon, start);
    }
  }

  function addFirstPaintFallbacks(beacon, start) {
    var firstPaint = null; // Chrome

    if (win.chrome && win.chrome.loadTimes) {
      // Convert to ms
      firstPaint = win.chrome.loadTimes()['firstPaintTime'] * 1000;
    } // IE
    else if (typeof win.performance.timing['msFirstPaint'] === 'number') {
        firstPaint = win.performance.timing['msFirstPaint'];
      } // standard
      else if (typeof win.performance.timing['firstPaint'] === 'number') {
          firstPaint = win.performance.timing['firstPaint'];
        } // First paint may not be available -OR- the browser may have never
    // painted anything and thereby kept this value at 0.


    if (firstPaint != null && firstPaint !== 0) {
      beacon['t_fp'] = Math.round(firstPaint - start);
    }
  }

  var isUnloading = false;
  function onLastChance(fn) {
    if (isUnloading) {
      fn();
    }

    addEventListener$1(doc, 'visibilitychange', function () {
      if (doc.visibilityState !== 'visible') {
        fn();
      }
    }); // $FlowFixMe The type is correct, but flow doesn't think so. Ignore for now.

    addEventListener$1(win, 'pagehide', function (event) {
      if (event.persisted) {
        isUnloading = true;
        fn();
      }
    }); // Unload is needed to fix this bug:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=987409

    addEventListener$1(win, 'unload', function () {}); // According to the spec visibilitychange should be a replacement for
    // beforeunload, but the reality is different (as of 2019-04-17). Chrome will
    // close tabs without firing visibilitychange. beforeunload on the other hand
    // is fired.

    addEventListener$1(win, 'beforeunload', function () {
      isUnloading = true;
      fn();
    });
  }

  /*
   * This file exists to resolve circular dependencies between
   * lib/transmission/index.js -> lib/transmission/batched.js -> lib/hooks/XMLHttpRequest.js -> lib/transmission/index.js
   */

  function disableMonitoringForXMLHttpRequest(xhr) {
    var state = xhr[defaultVars.secretPropertyKey] = xhr[defaultVars.secretPropertyKey] || {};
    state.ignored = true;
  }
  function addResourceTiming(beacon, resource) {
    var timings = serializeEntryToArray(resource);
    beacon['s_ty'] = getTimingValue(timings[3]);
    beacon['s_eb'] = getTimingValue(timings[4]);
    beacon['s_db'] = getTimingValue(timings[5]);
    beacon['s_ts'] = getTimingValue(timings[6]);
    beacon['t_red'] = getTimingValue(timings[7]);
    beacon['t_apc'] = getTimingValue(timings[8]);
    beacon['t_dns'] = getTimingValue(timings[9]);
    beacon['t_tcp'] = getTimingValue(timings[10]);
    beacon['t_ssl'] = getTimingValue(timings[11]);
    beacon['t_req'] = getTimingValue(timings[12]);
    beacon['t_rsp'] = getTimingValue(timings[13]);

    if (timings[14]) {
      beacon['bt'] = timings[14];
      beacon['bc'] = 1;
    }

    beacon['t_ttfb'] = getTimingValue(timings[15]);
  }

  function getTimingValue(timing) {
    if (typeof timing === 'number') {
      return timing;
    }

    return undefined;
  }

  function addCorrelationHttpHeaders(fn, ctx, traceId) {
    fn.call(ctx, 'X-INSTANA-T', traceId);
    fn.call(ctx, 'X-INSTANA-S', traceId);
    fn.call(ctx, 'X-INSTANA-L', '1,correlationType=web;correlationId=' + traceId);
  }

  // very easy to parse in a streaming fashion on the server-side. This format is a basic
  // line-based encoding of key/value pairs. Each line contains a key/value pair.
  //
  // In contrast to form encoding, this encoding handles JSON much better.

  function encode(beacons) {
    var str = '';

    for (var i = 0; i < beacons.length; i++) {
      var beacon = beacons[i]; // Multiple beacons are separated by an empty line

      str += '\n';

      for (var key in beacon) {
        if (hasOwnProperty(beacon, key)) {
          var value = beacon[key];

          if (value != null) {
            str += '\n' + encodePart(key) + '\t' + encodePart(value);
          }
        }
      }
    }

    return str.substring(2);
  }

  function encodePart(part) {
    return String(part).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  }

  var maxBatchedBeacons = 15;
  var pendingBeacons = [];
  var pendingBeaconTransmittingTimeout;
  var isVisibilityApiSupported = typeof doc.visibilityState === 'string';
  var isSupported = !!XMLHttpRequest && isVisibilityApiSupported && isSendBeaconApiSupported();
  function isEnabled() {
    return isSupported && defaultVars.beaconBatchingTime > 0;
  } // We attempt batching of messages to be more efficient on the client, network and
  // server-side. While the connection is either a persistent HTTP 2 connection or
  // a HTTP 1.1 connection with keep-alive, there is still some overhead involved
  // in having many small messages.
  //
  // For this reason we attempt batching. When batching we must be careful to
  // force a transmission when the document is unloaded.

  if (isSupported) {
    onLastChance(transmit);
  }

  function sendBeacon$1(beacon) {
    pendingBeacons.push(beacon);

    if (pendingBeacons.length >= maxBatchedBeacons) {
      transmit();
    } else if (!isWindowHidden() && defaultVars.beaconBatchingTime > 0) {
      // We cannot guarantee that we will ever get time to transmit data in a batched
      // format when the window is hidden, as this might occur while the document is
      // being unloaded. Immediately force a transmission in these cases.
      if (pendingBeaconTransmittingTimeout == null) {
        pendingBeaconTransmittingTimeout = setTimeout(transmit, defaultVars.beaconBatchingTime);
      }
    } else {
      transmit();
    }
  }

  function transmit() {
    if (pendingBeaconTransmittingTimeout != null) {
      clearTimeout(pendingBeaconTransmittingTimeout);
      pendingBeaconTransmittingTimeout = null;
    }

    if (pendingBeacons.length === 0) {
      return;
    }

    var serializedBeacons = encode(pendingBeacons); // clear the array

    pendingBeacons.length = 0; // Empty beacons. Should never happen, but better be safe.

    if (serializedBeacons.length === 0) {
      return;
    } // This will transmit a text/plain;charset=UTF-8 content type. This may not be what we
    // want, but changing the content type via the Blob constructor currently
    // breaks for cross-origin requests.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=490015


    var sendBeaconState = isSendBeaconApiSupported() && sendBeacon(String(defaultVars.reportingUrl), serializedBeacons); // There are limits to the amount of data transmittable via the sendBeacon API.
    // If it doesn't work via the sendBeacon, try it via plain old AJAX APIs
    // as a last resort.

    if (sendBeaconState === false) {
      var xhr = new XMLHttpRequest();
      disableMonitoringForXMLHttpRequest(xhr);
      xhr.open('POST', String(defaultVars.reportingUrl), true);
      xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8'); // Ensure that browsers do not try to automatically parse the response.

      xhr.responseType = 'text';
      xhr.timeout = defaultVars.xhrTransmissionTimeout;
      xhr.send(serializedBeacons);
    }
  }

  function isWindowHidden() {
    return doc.visibilityState !== 'visible';
  }

  function isSendBeaconApiSupported() {
    return typeof nav.sendBeacon === 'function';
  }

  function createExcessiveUsageIdentifier(opts) {
    var maxCalls = opts.maxCalls || 4096;
    var maxCallsPerTenMinutes = opts.maxCallsPerTenMinutes || 128;
    var maxCallsPerTenSeconds = opts.maxCallsPerTenSeconds || 32;
    var totalCalls = 0;
    var totalCallsInLastTenMinutes = 0;
    var totalCallsInLastTenSeconds = 0;
    setInterval(function () {
      totalCallsInLastTenMinutes = 0;
    }, 1000 * 60 * 10);
    setInterval(function () {
      totalCallsInLastTenSeconds = 0;
    }, 1000 * 10);
    return function isExcessiveUsage() {
      return ++totalCalls > maxCalls || ++totalCallsInLastTenMinutes > maxCallsPerTenMinutes || ++totalCallsInLastTenSeconds > maxCallsPerTenSeconds;
    };
  }

  var maxLengthForImgRequest = 2000;
  function sendBeacon$2(data) {
    var str = stringify(data);

    if (str.length === 0) {
      return;
    }

    if (XMLHttpRequest && str.length > maxLengthForImgRequest) {
      var xhr = new XMLHttpRequest();
      disableMonitoringForXMLHttpRequest(xhr);
      xhr.open('POST', String(defaultVars.reportingUrl), true);
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=UTF-8'); // Ensure that browsers do not try to automatically parse the response.

      xhr.responseType = 'text';
      xhr.timeout = defaultVars.xhrTransmissionTimeout;
      xhr.send(str);
    } else {
      // Older browsers do not support the XMLHttpRequest API. This sucks and may
      // result in a variety of issues, e.g. URL length restrictions. "Luckily", older
      // browsers also lack support for advanced features such as resource timing.
      // This should make this transmission via a GET request possible.
      executeImageRequest(String(defaultVars.reportingUrl) + '?' + str);
    }
  }

  function stringify(data) {
    var str = '';

    for (var key in data) {
      if (hasOwnProperty(data, key)) {
        var value = data[key];

        if (value != null) {
          str += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(data[key]));
        }
      }
    }

    return str.substring(1);
  }

  var isExcessiveUsage = createExcessiveUsageIdentifier({
    maxCalls: 8096,
    maxCallsPerTenMinutes: 4096,
    maxCallsPerTenSeconds: 128
  });
  function sendBeacon$3(data) {
    if (isUrlIgnored(data['l'])) {
      // data['l'] is a standardized property across all beacons to ensure that we do not accidentally transmit data
      // about a page such as this.
      {
        info('Skipping transmission of beacon because document URL associated to the beacon is ignored by ignore rule.', data);
      }

      return;
    }

    {
      info('Transmitting beacon', data);
    }

    if (isExcessiveUsage()) {
      {
        info('Reached the maximum number of beacons to transmit.');
      }

      return;
    }

    try {
      if (isEnabled()) {
        sendBeacon$1(data);
      } else {
        sendBeacon$2(data);
      }
    } catch (e) {
      {
        error('Failed to transmit beacon', e);
      }
    }
  }

  // $FlowFixMe: Find a way to define all properties beforehand so that flow doesn't complain about missing props.

  var beacon = {
    'ty': 'pl'
  };
  var state$1 = {
    onEnter: function () {
      addCommonBeaconProperties(beacon);
      beacon['t'] = defaultVars.pageLoadTraceId;
      beacon['bt'] = defaultVars.pageLoadBackendTraceId;
      beacon['u'] = win.location.href;
      beacon['ph'] = pageLoad;
      addTimingToPageLoadBeacon(beacon);
      addResourceTimings(beacon);
      var beaconSent = false;

      if (doc.visibilityState !== 'visible') {
        {
          info('Will not wait for additional page load beacon data because document.visibilityState is', doc.visibilityState);
        }

        sendPageLoadBeacon();
        return;
      }

      setTimeout(sendPageLoadBeacon, defaultVars.maxMaitForPageLoadMetricsMillis);
      onLastChance(sendPageLoadBeacon);

      function sendPageLoadBeacon() {
        if (!beaconSent) {
          beaconSent = true;
          sendBeacon$3(beacon);
        }
      }
    },
    getActiveTraceId: function () {
      return null;
    },
    getActivePhase: function () {
      return undefined;
    }
  };

  var maxErrorsToReport = 100;
  var maxStackSize = 30;
  var reportedErrors = 0;
  var maxSeenErrorsTracked = 20;
  var numberOfDifferentErrorsSeen = 0;
  var seenErrors = {};
  var scheduledTransmissionTimeoutHandle; // We are wrapping global listeners. In these, we are catching and rethrowing errors.
  // In older browsers, rethrowing errors actually manipulates the error objects. As a
  // result, it is not possible to just mark an error as reported. The simplest way to
  // avoid double reporting is to temporarily disable the global onError handler…

  var ignoreNextOnError = false;
  function ignoreNextOnErrorEvent() {
    ignoreNextOnError = true;
  }
  function hookIntoGlobalErrorEvent() {
    var globalOnError = win.onerror;

    win.onerror = function (message, fileName, lineNumber, columnNumber, error) {
      if (ignoreNextOnError) {
        ignoreNextOnError = false;

        if (typeof globalOnError === 'function') {
          return globalOnError.apply(this, arguments);
        }

        return;
      }

      var stack = error && error.stack;

      if (!stack) {
        stack = 'at ' + fileName + ' ' + lineNumber;

        if (columnNumber != null) {
          stack += ':' + columnNumber;
        }
      }

      onUnhandledError(message, stack);

      if (typeof globalOnError === 'function') {
        return globalOnError.apply(this, arguments);
      }
    };
  }
  function reportError(error, opts) {
    if (!error) {
      return;
    }

    if (typeof error === 'string') {
      onUnhandledError(error, '', opts);
    } else {
      onUnhandledError(error['message'], error['stack'], opts);
    }
  }

  function onUnhandledError(message, stack, opts) {
    if (!message || reportedErrors > maxErrorsToReport) {
      return;
    }

    if (isErrorMessageIgnored(message)) {
      return;
    }

    if (numberOfDifferentErrorsSeen >= maxSeenErrorsTracked) {
      seenErrors = {};
      numberOfDifferentErrorsSeen = 0;
    }

    message = String(message).substring(0, 300);
    stack = shortenStackTrace(stack);
    var location = win.location.href;
    var parentId = getActiveTraceId();
    var key = message + stack + location + (parentId || '');
    var trackedError = seenErrors[key];

    if (trackedError) {
      trackedError.seenCount++;
    } else {
      var componentStack = undefined;

      if (opts && opts['componentStack']) {
        componentStack = String(opts['componentStack']).substring(0, 4096);
      }

      trackedError = seenErrors[key] = {
        message: message,
        stack: stack,
        componentStack: componentStack,
        // $FlowFixMe Flow assumes that this value can be a string due to the bracket notation.
        meta: opts ? opts['meta'] : undefined,
        location: location,
        parentId: parentId,
        seenCount: 1,
        transmittedCount: 0
      };
      numberOfDifferentErrorsSeen++;
    }

    scheduleTransmission();
  }

  function shortenStackTrace(stack) {
    return String(stack || '').split('\n').slice(0, maxStackSize).join('\n');
  }

  function scheduleTransmission() {
    if (scheduledTransmissionTimeoutHandle) {
      return;
    }

    scheduledTransmissionTimeoutHandle = setTimeout(send, 1000);
  }

  function send() {
    clearTimeout(scheduledTransmissionTimeoutHandle);
    scheduledTransmissionTimeoutHandle = null;

    for (var _key in seenErrors) {
      if (seenErrors.hasOwnProperty(_key)) {
        var seenError = seenErrors[_key];

        if (seenError.seenCount > seenError.transmittedCount) {
          sendBeaconForError(seenError);
          reportedErrors++;
        }
      }
    }

    seenErrors = {};
    numberOfDifferentErrorsSeen = 0;
  }

  function sendBeaconForError(error) {
    var spanId = generateUniqueId();
    var traceId = error.parentId || spanId; // $FlowFixMe

    var beacon = {
      'ty': 'err',
      's': spanId,
      't': traceId,
      'ts': now(),
      // error beacon specific data
      'l': error.location,
      'e': error.message,
      'st': error.stack,
      'cs': error.componentStack,
      'c': error.seenCount - error.transmittedCount
    };
    addCommonBeaconProperties(beacon);

    if (error.meta) {
      addMetaDataToBeacon(beacon, error.meta);
    }

    sendBeacon$3(beacon);
  }

  var messagePrefix = 'Unhandled promise rejection: ';
  var stackUnavailableMessage = '<unavailable because Promise wasn\'t rejected with an Error object>';
  function hookIntoGlobalUnhandledRejectionEvent() {
    if (typeof win.addEventListener === 'function') {
      win.addEventListener('unhandledrejection', onUnhandledRejection);
    }
  }
  function onUnhandledRejection(event) {
    if (event.reason == null) {
      reportError({
        message: messagePrefix + '<no reason defined>',
        stack: stackUnavailableMessage
      });
    } else if (typeof event.reason.message === 'string') {
      reportError({
        message: messagePrefix + event.reason.message,
        stack: typeof event.reason.stack === 'string' ? event.reason.stack : stackUnavailableMessage
      });
    } else if (typeof event.reason !== 'object') {
      reportError({
        message: messagePrefix + event.reason,
        stack: stackUnavailableMessage
      });
    }
  }

  var ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
  // Implements the capability to observe the performance data for a single entry on the performance timeline.
  // This is especially useful to make a connection between our beacon data and the performance timeline data.
  // Also see https://w3c.github.io/performance-timeline/#dom-performanceentrylist
  function observeResourcePerformance(opts) {
    if (!isPerformanceObserverAvailable) {
      return observeWithoutPerformanceObserverSupport(opts.onEnd);
    } // Used to calculate the duration when no resource was found.


    var startTime;
    var endTime; // The identified resource. To be used when calling opts.onEnd

    var resource; // global resources that will need to be disposed

    var observer;
    var fallbackNoResourceFoundTimerHandle;
    var fallbackEndNeverCalledTimerHandle;
    return {
      onBeforeResourceRetrieval: onBeforeResourceRetrieval,
      onAfterResourceRetrieved: onAfterResourceRetrieved,
      cancel: disposeGlobalResources
    };

    function onBeforeResourceRetrieval() {
      startTime = performance.now();

      try {
        observer = new win['PerformanceObserver'](onResource);
        observer['observe']({
          'entryTypes': opts.entryTypes
        });
      } catch (e) {// Some browsers may not support the passed entryTypes and decide to throw an error.
        // This would then result in an error with a message like:
        //
        // entryTypes only contained unsupported types
        //
        // Swallow and ignore the error. Treat it like unavailable performance observer data.
      }

      fallbackEndNeverCalledTimerHandle = setTimeout(disposeGlobalResources, 1000 * 60 * 10);
    }

    function onAfterResourceRetrieved() {
      endTime = performance.now();
      cancelFallbackEndNeverCalledTimerHandle();

      if (resource || !isWaitingAcceptable()) {
        end();
      } else {
        addEventListener$1(doc, 'visibilitychange', onVisibilityChanged);
        fallbackNoResourceFoundTimerHandle = setTimeout(end, opts.maxWaitForResourceMillis);
      }
    }

    function end() {
      disposeGlobalResources();
      var duration;

      if (resource && resource.duration != null && // In some old web browsers, e.g. Chrome 31, the value provided as the duration
      // can be very wrong. We have seen cases where this value is measured in years.
      // If this does seem be the case, then we will ignore the duration property and
      // instead prefer our approximation.
      resource.duration < ONE_DAY_IN_MILLIS) {
        duration = Math.round(resource.duration);
      } else {
        duration = Math.round(endTime - startTime);
      }

      opts.onEnd({
        resource: resource,
        duration: duration
      });
    }

    function onResource(list) {
      var entries = list.getEntries();

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (entry.startTime >= startTime && (!endTime || endTime >= entry.responseEnd) && opts.resourceMatcher(entry)) {
          resource = entry;
          disconnectResourceObserver();

          if (endTime) {
            // End as quickly as possible to ensure that the data is transmitted to the server.
            end();
          }

          return;
        }
      }
    }

    function onVisibilityChanged() {
      if (!isWaitingAcceptable()) {
        end();
      }
    }

    function disposeGlobalResources() {
      disconnectResourceObserver();
      cancelFallbackNoResourceFoundTimer();
      cancelFallbackEndNeverCalledTimerHandle();
      stopVisibilityObservation();
    }

    function disconnectResourceObserver() {
      if (observer) {
        try {
          observer['disconnect']();
        } catch (e) {// Observer disconnect may throw when connect attempt wasn't successful. Ignore this.
        }

        observer = null;
      }
    }

    function cancelFallbackNoResourceFoundTimer() {
      if (fallbackNoResourceFoundTimerHandle) {
        clearTimeout(fallbackNoResourceFoundTimerHandle);
        fallbackNoResourceFoundTimerHandle = null;
      }
    }

    function cancelFallbackEndNeverCalledTimerHandle() {
      if (fallbackEndNeverCalledTimerHandle) {
        clearTimeout(fallbackEndNeverCalledTimerHandle);
        fallbackEndNeverCalledTimerHandle = null;
      }
    }

    function stopVisibilityObservation() {
      removeEventListener(doc, 'visibilitychange', onVisibilityChanged);
    }
  } // This variant of the performance observer is only used when the performance-timeline features
  // are not supported. See isPerformanceObserverAvailable

  function observeWithoutPerformanceObserverSupport(onEnd) {
    var start;
    return {
      onBeforeResourceRetrieval: onBeforeResourceRetrieval,
      onAfterResourceRetrieved: onAfterResourceRetrieved,
      cancel: noop
    };

    function onBeforeResourceRetrieval() {
      start = now();
    }

    function onAfterResourceRetrieved() {
      var end = now();
      onEnd({
        duration: end - start
      });
    }
  } // We may only wait for resource data to arrive as long as the document is visible or in the process
  // of becoming visible. In all other cases we might lose data when waiting, e.g. when the document
  // is in the process of being disposed.


  function isWaitingAcceptable() {
    return doc.visibilityState === 'visible' || doc.visibilityState === 'prerender';
  }

  function isAllowedOrigin(url) {
    return matchesAny(defaultVars.allowedOrigins, url);
  }

  var maximumHttpRequestUrlLength = 4096; // Asynchronously created a tag.

  var urlAnalysisElement = null;

  try {
    urlAnalysisElement = document.createElement('a');
  } catch (e) {
    {
      debug('Failed to create URL analysis element. Will not be able to normalize URLs.', e);
    }
  }

  function normalizeUrl(url) {
    if (urlAnalysisElement) {
      try {
        // "a"-elements normalize the URL when setting a relative URL or URLs
        // that are missing a scheme
        urlAnalysisElement.href = url;
        url = urlAnalysisElement.href;
      } catch (e) {
        {
          debug('Failed to normalize URL' + url);
        }
      }
    } // Hashes are never transmitted to the server and they are also not included in resource
    // timings. Do not include them in the normalized URL.


    var hashIndex = url.indexOf('#');

    if (hashIndex >= 0) {
      url = url.substring(0, hashIndex);
    }

    if (url.length > maximumHttpRequestUrlLength) {
      url = url.substring(0, maximumHttpRequestUrlLength);
    }

    return url;
  }

  // document.createElement('a')

  var urlAnalysisElement$1 = null;
  var documentOriginAnalysisElement = null;

  try {
    urlAnalysisElement$1 = document.createElement('a');
    documentOriginAnalysisElement = document.createElement('a');
    documentOriginAnalysisElement.href = win.location.href;
  } catch (e) {
    {
      debug('Failed to create URL analysis elements. Will not be able to execute same-origin check, i.e. all same-origin checks will fail.', e);
    }
  }

  function isSameOrigin(url) {
    if (!urlAnalysisElement$1 || !documentOriginAnalysisElement) {
      return false;
    }

    try {
      urlAnalysisElement$1.href = url;
      return (// Most browsers support this fallback logic out of the box. Not so the Internet explorer.
        // To make it work in Internet explorer, we need to add the fallback manually.
        // IE 9 uses a colon as the protocol when no protocol is defined
        (urlAnalysisElement$1.protocol && urlAnalysisElement$1.protocol !== ':' ? urlAnalysisElement$1.protocol : documentOriginAnalysisElement.protocol) === documentOriginAnalysisElement.protocol && (urlAnalysisElement$1.hostname || documentOriginAnalysisElement.hostname) === documentOriginAnalysisElement.hostname && (urlAnalysisElement$1.port || documentOriginAnalysisElement.port) === documentOriginAnalysisElement.port
      );
    } catch (e) {
      return false;
    }
  }

  var isExcessiveUsage$1 = createExcessiveUsageIdentifier({
    maxCallsPerTenMinutes: 256,
    maxCallsPerTenSeconds: 32
  }); // In addition to the common HTTP status codes, a bunch of
  // additional outcomes are possible. Mainly errors, the following
  // status codes denote internal codes which are used for beacons
  // to describe the XHR result.

  var additionalStatuses = {
    // https://xhr.spec.whatwg.org/#the-timeout-attribute
    timeout: -100,
    // Used when the request is aborted:
    // https://xhr.spec.whatwg.org/#the-abort()-method
    abort: -101,
    // Errors may occur when opening an XHR object for a variety of
    // reasons.
    // https://xhr.spec.whatwg.org/#the-open()-method
    openError: -102,
    // Non-HTTP errors, e.g. failed to establish connection.
    // https://xhr.spec.whatwg.org/#events
    error: -103
  };
  var traceIdHeaderRegEx = /^X-INSTANA-T$/i;
  function instrumentXMLHttpRequest() {
    if (!XMLHttpRequest || !new XMLHttpRequest().addEventListener) {
      {
        info('Browser does not support the features required for XHR instrumentation.');
      }

      return;
    }

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    var originalSend = XMLHttpRequest.prototype.send;

    if (!originalOpen || !originalSetRequestHeader || !originalSend) {
      {
        warn('The XMLHttpRequest prototype is in an unsupported state due to some missing XMLHttpRequest.prototype ' + 'properties. This is most likely caused by third-party libraries that are instrumenting/changing the ' + 'XMLHttpRequest API in a specification incompliant way.');
      }

      return;
    }

    XMLHttpRequest.prototype.open = function open(method, url, async) {
      var xhr = this;

      if (isExcessiveUsage$1()) {
        {
          info('Reached the maximum number of XMLHttpRequests to monitor.');
        }

        return originalOpen.apply(xhr, arguments);
      }

      var state = xhr[defaultVars.secretPropertyKey] = xhr[defaultVars.secretPropertyKey] || {}; // probably ignored due to disableMonitoringForXMLHttpRequest calls

      if (state.ignored) {
        return originalOpen.apply(xhr, arguments);
      }

      state.ignored = isUrlIgnored(url);

      if (state.ignored) {
        {
          debug('Not generating XHR beacon because it should be ignored according to user configuration. URL: ' + url);
        }

        return originalOpen.apply(xhr, arguments);
      }

      state.spanAndTraceId = generateUniqueId();
      state.setBackendCorrelationHeaders = isSameOrigin(url) || isAllowedOrigin(url); // $FlowFixMe: Some properties deliberately left our for js file size reasons.

      var beacon = {
        'ty': 'xhr',
        // general beacon data
        't': state.spanAndTraceId,
        's': state.spanAndTraceId,
        'ts': 0,
        'd': 0,
        // xhr beacon specific data
        // 's': '',
        'm': method,
        'u': normalizeUrl(url),
        'a': async === undefined || async ? 1 : 0,
        'st': 0,
        'e': undefined,
        'bc': state.setBackendCorrelationHeaders ? 1 : 0
      };
      state.beacon = beacon;
      state.performanceObserver = observeResourcePerformance({
        entryTypes: ['resource'],
        resourceMatcher: function resourceMatcher(resource) {
          return (resource.initiatorType === 'fetch' || resource.initiatorType === 'xmlhttprequest') && // $FlowFixMe We know that beacon['u'] is now set
          !!resource.name && resource.name.indexOf(beacon['u']) === 0;
        },
        maxWaitForResourceMillis: defaultVars.maxWaitForResourceTimingsMillis,
        onEnd: function onEnd(args) {
          beacon['d'] = args.duration;

          if (args.resource) {
            addResourceTiming(beacon, args.resource);
          }

          sendBeacon$3(beacon);
        }
      });

      try {
        var result = originalOpen.apply(xhr, arguments);
        xhr.addEventListener('timeout', onTimeout);
        xhr.addEventListener('error', onError);
        xhr.addEventListener('abort', onAbort);
        xhr.addEventListener('readystatechange', onReadystatechange);
        return result;
      } catch (e) {
        state.performanceObserver.cancel();
        beacon['ts'] = now() - defaultVars.referenceTimestamp;
        beacon['st'] = additionalStatuses.openError;
        beacon['e'] = e.message;
        addCommonBeaconProperties(beacon);
        sendBeacon$3(beacon);
        xhr[defaultVars.secretPropertyKey] = null;
        throw e;
      }

      function onFinish(status) {
        if (state.ignored) {
          return;
        }

        if (beacon['st'] !== 0) {
          // Multiple finish events. Should only happen when we setup the event handlers
          // in a wrong way or when the XHR object is reused. We don't support this use
          // case.
          return;
        }

        beacon['st'] = status; // When accessing object properties as object['property'] instead of
        // object.property flow does not know the type and assumes string.
        // Arithmetic operations like addition are only allowed on numbers. OTOH,
        // we can not safely use beacon.property as the compilation/minification
        // step will rename the properties which results in JSON payloads with
        // wrong property keys.
        // $FlowFixMe: see above

        beacon['d'] = Math.max(0, now() - (beacon['ts'] + defaultVars.referenceTimestamp));

        if (state.performanceObserver && status > 0) {
          state.performanceObserver.onAfterResourceRetrieved();
        } else {
          if (state.performanceObserver) {
            state.performanceObserver.cancel();
          }

          sendBeacon$3(beacon);
        }
      }

      function onTimeout() {
        onFinish(additionalStatuses.timeout);
      }

      function onError(e) {
        if (state.ignored) {
          return;
        }

        var message = e && (e.error && e.error.message || e.message);

        if (typeof message === 'string') {
          beacon['e'] = message.substring(0, 300);
        }

        onFinish(additionalStatuses.error);
      }

      function onAbort() {
        onFinish(additionalStatuses.abort);
      }

      function onReadystatechange() {
        if (xhr.readyState === 4) {
          var status;

          try {
            status = xhr.status;
          } catch (e) {
            // IE 9 will throw errors when trying to access the status property
            // on aborted requests and timeouts. We can swallow the error
            // since we have separate event listeners for these types of
            // situations.
            onFinish(additionalStatuses.error);
            return;
          }

          if (status !== 0) {
            onFinish(status);
          }
        }
      }
    };

    XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(header) {
      var state = this[defaultVars.secretPropertyKey]; // If this request was initiated by a fetch polyfill, the Instana headers
      // will be set before xhr.send is called (by the fetch polyfill,
      // translating the headers from the request definition object into
      // XHR.setRequestHeader calls). We need to keep track of this so we can
      // set this XHR to ignored in xhr.send.

      if (state && traceIdHeaderRegEx.test(header)) {
        {
          debug('Not generating XHR beacon because correlation header is already set (possibly fetch polyfill applied).');
        }

        state.ignored = true;

        if (state.performanceObserver) {
          state.performanceObserver.cancel();
          state.performanceObserver = null;
        }
      }

      return originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function send() {
      var state = this[defaultVars.secretPropertyKey];

      if (!state || state.ignored) {
        return originalSend.apply(this, arguments);
      }

      if (state.setBackendCorrelationHeaders) {
        addCorrelationHttpHeaders(originalSetRequestHeader, this, state.spanAndTraceId);
      }

      state.beacon['ts'] = now() - defaultVars.referenceTimestamp;
      addCommonBeaconProperties(state.beacon);
      state.performanceObserver.onBeforeResourceRetrieval();
      return originalSend.apply(this, arguments);
    };
  }

  function getPageLoadBackendTraceId() {
    if (!isResourceTimingAvailable) {
      return null;
    }

    var entries = performance.getEntriesByType('navigation');

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];

      if (entry['serverTiming'] != null) {
        for (var j = 0; j < entry['serverTiming'].length; j++) {
          var serverTiming = entry['serverTiming'][j];

          if (serverTiming['name'] === defaultVars.serverTimingBackendTraceIdEntryName) {
            {
              info('Found page load backend trace ID %s in Server-Timing header.', serverTiming['description']);
            }

            return serverTiming['description'];
          }
        }
      }
    }

    return null;
  }

  // https://github.com/facebook/flow/blob/master/lib/dom.js

  // Asynchronous function wrapping: The process of wrapping a listener which goes into one function, e.g.
  //
  //  - EventTarget#addEventListener
  //  - EventEmitter#on
  //
  // and is removed via another function, e.g.
  //
  //  - EventTarget#removeEventListener
  //  - EventEmitter#off
  //
  // What is complicated about this, is that these methods identify registered listeners by function reference.
  // When we wrap a function, we naturally change the reference. We must therefore keep track of which
  // original function belongs to what wrapped function.
  //
  // This file provides helpers that help in the typical cases. It is removed from all browser specific APIs
  // in order to allow simple unit test execution.
  //
  // Note that this file follows the behavior outlined in DOM specification. Among others, this means that it is not
  // possible to register the same listener twice.
  // http://dom.spec.whatwg.org
  function addWrappedFunction(storageTarget, wrappedFunction, valuesForEqualityCheck) {
    var storage = storageTarget[defaultVars.wrappedEventHandlersOriginalFunctionStorageKey] = storageTarget[defaultVars.wrappedEventHandlersOriginalFunctionStorageKey] || [];
    var index = findInStorage(storageTarget, valuesForEqualityCheck);

    if (index !== -1) {
      // already registered. Do not allow re-registration
      return storage[index].wrappedFunction;
    }

    storage.push({
      wrappedFunction: wrappedFunction,
      valuesForEqualityCheck: valuesForEqualityCheck
    });
    return wrappedFunction;
  }

  function findInStorage(storageTarget, valuesForEqualityCheck) {
    var storage = storageTarget[defaultVars.wrappedEventHandlersOriginalFunctionStorageKey];

    for (var i = 0; i < storage.length; i++) {
      var storageItem = storage[i];

      if (matchesEqualityCheck(storageItem.valuesForEqualityCheck, valuesForEqualityCheck)) {
        return i;
      }
    }

    return -1;
  }

  function popWrappedFunction(storageTarget, valuesForEqualityCheck, fallback) {
    var storage = storageTarget[defaultVars.wrappedEventHandlersOriginalFunctionStorageKey];

    if (storage == null) {
      return fallback;
    }

    var index = findInStorage(storageTarget, valuesForEqualityCheck);

    if (index === -1) {
      return fallback;
    }

    var storageItem = storage[index];
    storage.splice(index, 1);
    return storageItem.wrappedFunction;
  }

  function matchesEqualityCheck(valuesForEqualityCheckA, valuesForEqualityCheckB) {
    if (valuesForEqualityCheckA.length !== valuesForEqualityCheckB.length) {
      return false;
    }

    for (var i = 0; i < valuesForEqualityCheckA.length; i++) {
      if (valuesForEqualityCheckA[i] !== valuesForEqualityCheckB[i]) {
        return false;
      }
    }

    return true;
  }

  function addWrappedDomEventListener(storageTarget, wrappedFunction, eventName, eventListener, optionsOrCapture) {
    return addWrappedFunction(storageTarget, wrappedFunction, getDomEventListenerValuesForEqualityCheck(eventName, eventListener, optionsOrCapture));
  }

  function getDomEventListenerValuesForEqualityCheck(eventName, eventListener, optionsOrCapture) {
    return [eventName, eventListener, getDomEventListenerCaptureValue(optionsOrCapture)];
  }

  function getDomEventListenerCaptureValue(optionsOrCapture) {
    // > Let capture, passive, and once be the result of flattening more options.
    // https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener
    //
    // > To flatten more options, run these steps:
    // > 1. Let capture be the result of flattening options.
    // https://dom.spec.whatwg.org/#event-flatten-more
    //
    // > To flatten options, run these steps:
    // > 1. If options is a boolean, then return options.
    // > 2. Return options’s capture.
    // https://dom.spec.whatwg.org/#concept-flatten-options
    //
    // > dictionary EventListenerOptions {
    // >   boolean capture = false;
    // > };
    // https://dom.spec.whatwg.org/#dom-eventlisteneroptions-capture
    if (optionsOrCapture == null) {
      return false;
    } else if (typeof optionsOrCapture === 'object') {
      return Boolean(optionsOrCapture.capture);
    }

    return Boolean(optionsOrCapture);
  }
  function popWrappedDomEventListener(storageTarget, eventName, eventListener, optionsOrCapture, fallback) {
    return popWrappedFunction(storageTarget, getDomEventListenerValuesForEqualityCheck(eventName, eventListener, optionsOrCapture), fallback);
  }

  function wrapEventHandlers() {
    if (defaultVars.wrapEventHandlers) {
      wrapEventTarget(win.EventTarget);
    }
  }

  function wrapEventTarget(EventTarget) {
    if (!EventTarget || typeof EventTarget.prototype.addEventListener !== 'function' || typeof EventTarget.prototype.removeEventListener !== 'function') {
      return;
    }

    var originalAddEventListener = EventTarget.prototype.addEventListener;
    var originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function wrappedAddEventListener(eventName, fn, optionsOrCapture) {
      if (typeof fn !== 'function') {
        return originalAddEventListener.apply(this, arguments);
      } // non-deopt arguments copy


      var args = new Array(arguments.length);

      for (var i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      args[1] = function wrappedEventListener() {
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          reportError(e);
          ignoreNextOnErrorEvent();
          throw e;
        }
      };

      args[1] = addWrappedDomEventListener(this, args[1], eventName, fn, optionsOrCapture);
      return originalAddEventListener.apply(this, args);
    };

    EventTarget.prototype.removeEventListener = function wrappedRemoveEventListener(eventName, fn, optionsOrCapture) {
      if (typeof fn !== 'function') {
        return originalRemoveEventListener.apply(this, arguments);
      } // non-deopt arguments copy


      var args = new Array(arguments.length);

      for (var i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      args[1] = popWrappedDomEventListener(this, eventName, fn, optionsOrCapture, fn);
      return originalRemoveEventListener.apply(this, args);
    };
  }

  var isExcessiveUsage$2 = createExcessiveUsageIdentifier({
    maxCallsPerTenMinutes: 128,
    maxCallsPerTenSeconds: 32
  });
  function reportCustomEvent(eventName, opts) {
    if (isExcessiveUsage$2()) {
      {
        info('Reached the maximum number of custom events to monitor');
      }

      return;
    }

    var traceId = getActiveTraceId();
    var spanId = generateUniqueId();

    if (!traceId) {
      traceId = spanId;
    } // $FlowFixMe: Some properties deliberately left our for js file size reasons.


    var beacon = {
      'ty': 'cus',
      's': spanId,
      't': traceId,
      'ts': now(),
      'n': eventName
    };
    addCommonBeaconProperties(beacon);

    if (opts) {
      enrich(beacon, opts);
    }

    sendBeacon$3(beacon);
  }

  function enrich(beacon, opts) {
    if (opts['meta']) {
      addMetaDataToBeacon(beacon, opts['meta']);
    }

    if (typeof opts['duration'] === 'number' && !isNaN(opts['duration'])) {
      beacon['d'] = opts['duration']; // $FlowFixMe: We know that both properties are numbers. Flow thinks they are strings because we access them via […].

      beacon['ts'] = beacon['ts'] - opts['duration'];
    }

    if (typeof opts['timestamp'] === 'number' && !isNaN(opts['timestamp'])) {
      beacon['ts'] = opts['timestamp'];
    }

    if (typeof opts['backendTraceId'] === 'string') {
      beacon['bt'] = opts['backendTraceId'].substring(0, 64);
    }

    if (opts['error']) {
      beacon['e'] = String(opts['error']['message']).substring(0, 300);
      beacon['st'] = shortenStackTrace(opts['error']['stack']);
    }

    if (typeof opts['componentStack'] === 'string') {
      beacon['cs'] = opts['componentStack'].substring(0, 4096);
    }
  }

  function hookIntoUserTimings() {
    if (performance && performance['timeOrigin'] && isResourceTimingAvailable) {
      drainExistingPerformanceEntries();
      observeNewUserTimings();
    }
  }

  function drainExistingPerformanceEntries() {
    onUserTimings(performance.getEntriesByType('mark'));
    onUserTimings(performance.getEntriesByType('measure'));
  }

  function onUserTimings(performanceEntries) {
    for (var i = 0; i < performanceEntries.length; i++) {
      onUserTiming(performanceEntries[i]);
    }
  }

  function onUserTiming(performanceEntry) {
    if (matchesAny(defaultVars.ignoreUserTimings, performanceEntry.name)) {
      {
        info('Ignoring user timing "%s" because it is ignored via the configuration.', performanceEntry.name);
      }

      return;
    }

    var duration;

    if (performanceEntry.entryType !== 'mark') {
      duration = Math.round(performanceEntry.duration);
    } // $FlowFixMe: Flow cannot detect that this is a proper usage of the function. We have to write it this way because of the Closure compiler advanced mode.


    reportCustomEvent(performanceEntry.name, {
      // Do not allow the timestamp to be before our Notion of page load start.
      'timestamp': Math.max(pageLoadStartTimestamp, Math.round(performance['timeOrigin'] + performanceEntry.startTime)),
      'duration': duration,
      'meta': {
        'userTimingType': performanceEntry.entryType
      }
    });
  }

  function observeNewUserTimings() {
    if (isPerformanceObserverAvailable) {
      try {
        var observer = new win['PerformanceObserver'](onObservedPerformanceEntries);
        observer['observe']({
          'entryTypes': ['mark', 'measure']
        });
      } catch (e) {// Some browsers may not support the passed entryTypes and decide to throw an error.
        // This would then result in an error with a message like:
        //
        // entryTypes only contained unsupported types
        //
        // Swallow and ignore the error. Treat it like unavailable performance observer data.
      }
    }
  }

  function onObservedPerformanceEntries(list) {
    onUserTimings(list.getEntries());
  }

  var isExcessiveUsage$3 = createExcessiveUsageIdentifier({
    maxCallsPerTenMinutes: 256,
    maxCallsPerTenSeconds: 32
  });
  function instrumentFetch() {
    if (!win.fetch || !win.Request) {
      {
        info('Browser does not support the Fetch API.');
      }

      return;
    }

    win.fetch = function (input, init) {
      var request = new Request(input, init);

      if (isExcessiveUsage$3()) {
        {
          info('Reached the maximum number of fetch calls to monitor.');
        }

        return originalFetch(request);
      }

      var url = request.url;

      if (isUrlIgnored(url)) {
        {
          debug('Not generating XHR beacon for fetch call because it is to be ignored according to user configuration. URL: ' + url);
        }

        return originalFetch(request);
      } // $FlowFixMe: Some properties deliberately left our for js file size reasons.


      var beacon = {
        'ty': 'xhr',
        // 't': '',
        'ts': now() - defaultVars.referenceTimestamp,
        'd': 0,
        // xhr beacon specific data
        // 's': '',
        'm': '',
        'u': '',
        'a': 1,
        'st': 0,
        'e': undefined
      };
      addCommonBeaconProperties(beacon);
      addGraphQlProperties(beacon, input, init);
      var spanAndTraceId = generateUniqueId();
      var setBackendCorrelationHeaders = isSameOrigin(url) || isAllowedOrigin(url);
      beacon['t'] = spanAndTraceId;
      beacon['s'] = spanAndTraceId;
      beacon['m'] = request.method;
      beacon['u'] = normalizeUrl(url);
      beacon['a'] = 1;
      beacon['bc'] = setBackendCorrelationHeaders ? 1 : 0;

      if (setBackendCorrelationHeaders) {
        addCorrelationHttpHeaders(request.headers.append, request.headers, spanAndTraceId);
      }

      var performanceObserver = observeResourcePerformance({
        entryTypes: ['resource'],
        resourceMatcher: resourceMatcher,
        maxWaitForResourceMillis: defaultVars.maxWaitForResourceTimingsMillis,
        onEnd: onEnd
      });
      performanceObserver.onBeforeResourceRetrieval();
      return originalFetch(request).then(function (response) {
        beacon['st'] = response.status; // When accessing object properties as object['property'] instead of
        // object.property flow does not know the type and assumes string.
        // Arithmetic operations like addition are only allowed on numbers. OTOH,
        // we can not safely use beacon.property as the compilation/minification
        // step will rename the properties which results in JSON payloads with
        // wrong property keys.
        // $FlowFixMe: see above

        performanceObserver.onAfterResourceRetrieved();
        return response;
      }, function (e) {
        performanceObserver.cancel(); // $FlowFixMe: see above

        beacon['d'] = now() - (beacon['ts'] + defaultVars.referenceTimestamp);
        beacon['e'] = e.message;
        beacon['st'] = -103;
        sendBeacon$3(beacon);
        throw e;
      });

      function resourceMatcher(resource) {
        return (resource.initiatorType === 'fetch' || resource.initiatorType === 'xmlhttprequest') && // $FlowFixMe We know that beacon['u'] is now set
        Boolean(resource.name) && resource.name.indexOf(beacon['u']) === 0;
      }

      function onEnd(args) {
        beacon['d'] = args.duration;

        if (args.resource) {
          addResourceTiming(beacon, args.resource);
        }

        sendBeacon$3(beacon);
      }
    };
  }
  var queryIdentification = /^\s*query(\s|\{)/i;
  var mutationIdentification = /^\s*mutation(\s|\{)/i;

  function addGraphQlProperties(beacon, input, init) {
    try {
      if (typeof input !== 'string' || !init || init.method !== 'POST' || typeof init.body !== 'string' || !matchesAny(defaultVars.urlsToCheckForGraphQlInsights, input)) {
        return;
      }

      var body = JSON.parse(init.body);

      if (typeof body['operationName'] === 'string') {
        beacon['gon'] = body['operationName'];
      }

      if (typeof body['query'] === 'string') {
        if (queryIdentification.test(body['query'])) {
          beacon['got'] = 'query';
        } else if (mutationIdentification.test(body['query'])) {
          beacon['got'] = 'mutation';
        } else if (body['query'].indexOf('{') === 0 && body['operationName'] === null) {
          beacon['got'] = 'query';
        }
      }
    } catch (e) {
      {
        debug('Failed to analyze request for GraphQL insights.', input, init);
      }
    }
  }

  // localStorage API re-exposed to allow testing.
  var isSupported$1 = localStorage != null && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function';
  function getItem(k) {
    if (isSupported$1 && localStorage) {
      return localStorage.getItem(k);
    }
  }
  function setItem(k, v) {
    if (isSupported$1 && localStorage) {
      localStorage.setItem(k, v);
    }
  }
  function removeItem(k) {
    if (isSupported$1 && localStorage) {
      localStorage.removeItem(k);
    }
  }

  var storageSeparatorKey = '#';
  function trackSessions(sessionInactivityTimeoutMillis, sessionTerminationTimeoutMillis) {
    if (!isSupported$1) {
      {
        info('Storage API is not available and session tracking is therefore not supported.');
      }

      return;
    }

    if (!sessionInactivityTimeoutMillis) {
      sessionInactivityTimeoutMillis = defaultVars.defaultSessionInactivityTimeoutMillis;
    }

    if (!sessionTerminationTimeoutMillis) {
      sessionTerminationTimeoutMillis = defaultVars.defaultSessionTerminationTimeoutMillis;
    }

    sessionInactivityTimeoutMillis = Math.min(sessionInactivityTimeoutMillis, defaultVars.maxAllowedSessionTimeoutMillis);
    sessionTerminationTimeoutMillis = Math.min(sessionTerminationTimeoutMillis, defaultVars.maxAllowedSessionTimeoutMillis);

    try {
      var storedValue = getItem(defaultVars.sessionStorageKey);
      var session = parseSession(storedValue);

      if (session && !isSessionValid(session, sessionInactivityTimeoutMillis, sessionTerminationTimeoutMillis)) {
        session = null;
      }

      if (session) {
        session.lastActivityTime = now();
      } else {
        session = {
          id: generateUniqueId(),
          startTime: now(),
          lastActivityTime: now()
        };
      }

      setItem(defaultVars.sessionStorageKey, serializeSession(session));
      defaultVars.sessionId = session.id;
    } catch (e) {
      {
        warn('Failed to record session information', e);
      }
    }
  }
  function terminateSession() {
    defaultVars.sessionId = undefined;

    if (!isSupported$1) {
      return;
    }

    try {
      removeItem(defaultVars.sessionStorageKey);
    } catch (e) {
      {
        info('Failed to terminate session', e);
      }
    }
  }

  function parseSession(storedValue) {
    if (!storedValue) {
      return null;
    }

    var values = storedValue.split(storageSeparatorKey);

    if (values.length < 3) {
      return null;
    }

    var id = values[0];
    var startTime = parseInt(values[1], 10);
    var lastActivityTime = parseInt(values[2], 10);

    if (!id || isNaN(startTime) || isNaN(lastActivityTime)) {
      return null;
    }

    return {
      id: id,
      startTime: startTime,
      lastActivityTime: lastActivityTime
    };
  }

  function serializeSession(session) {
    return session.id + storageSeparatorKey + session.startTime + storageSeparatorKey + session.lastActivityTime;
  }

  function isSessionValid(session, sessionInactivityTimeoutMillis, sessionTerminationTimeoutMillis) {
    var minAllowedLastActivityTime = now() - sessionInactivityTimeoutMillis;

    if (session.lastActivityTime < minAllowedLastActivityTime) {
      return false;
    }

    var minAllowedStartTime = now() - sessionTerminationTimeoutMillis;

    if (session.startTime < minAllowedStartTime) {
      return false;
    }

    return true;
  }

  var isExcessiveUsage$4 = createExcessiveUsageIdentifier({
    maxCallsPerTenMinutes: 128,
    maxCallsPerTenSeconds: 32
  });
  function setPage(page) {
    var previousPage = defaultVars.page;
    defaultVars.page = page;
    var isInitialPageDefinition = getActivePhase() === pageLoad && previousPage == null;

    if (!isInitialPageDefinition && previousPage !== page) {
      if (isExcessiveUsage$4()) {
        {
          info('Reached the maximum number of page changes to monitor.');
        }
      } else {
        reportPageChange();
      }
    }
  }

  function reportPageChange() {
    // $FlowFixMe: Some properties deliberately left our for js file size reasons.
    var beacon = {
      'ty': 'pc',
      'ts': now()
    };
    addCommonBeaconProperties(beacon);
    sendBeacon$3(beacon);
  }

  function processCommand(command) {
    switch (command[0]) {
      case 'apiKey':
        defaultVars.apiKey = command[1];
        break;

      case 'key':
        defaultVars.apiKey = command[1];
        break;

      case 'reportingUrl':
        defaultVars.reportingUrl = command[1];
        break;

      case 'meta':
        defaultVars.meta[command[1]] = command[2];
        break;

      case 'traceId':
        defaultVars.pageLoadBackendTraceId = command[1];
        break;

      case 'ignoreUrls':
        {
          validateRegExpArray('ignoreUrls', command[1]);
        }

        defaultVars.ignoreUrls = command[1];
        break;

      case 'ignoreErrorMessages':
        {
          validateRegExpArray('ignoreErrorMessages', command[1]);
        }

        defaultVars.ignoreErrorMessages = command[1];
        break;

      case 'allowedOrigins':
      case 'whitelistedOrigins':
        // a deprecated alias for allowedOrigins
        {
          validateRegExpArray('allowedOrigins', command[1]);
        }

        defaultVars.allowedOrigins = command[1];
        break;

      case 'ignoreUserTimings':
        {
          validateRegExpArray('ignoreUserTimings', command[1]);
        }

        defaultVars.ignoreUserTimings = command[1];
        break;

      case 'xhrTransmissionTimeout':
        defaultVars.xhrTransmissionTimeout = command[1];
        break;

      case 'page':
        setPage(command[1]);
        break;

      case 'ignorePings':
        defaultVars.ignorePings = command[1];
        break;

      case 'reportError':
        reportError(command[1], command[2]);
        break;

      case 'wrapEventHandlers':
        defaultVars.wrapEventHandlers = command[1];
        break;

      case 'wrapTimers':
        defaultVars.wrapTimers = command[1];
        break;

      case 'getPageLoadId':
        return defaultVars.pageLoadTraceId;

      case 'user':
        if (command[1]) {
          defaultVars.userId = String(command[1]).substring(0, 128);
        }

        if (command[2]) {
          defaultVars.userName = String(command[2]).substring(0, 128);
        }

        if (command[3]) {
          defaultVars.userEmail = String(command[3]).substring(0, 128);
        }

        break;

      case 'reportEvent':
        reportCustomEvent(command[1], command[2]);
        break;

      case 'beaconBatchingTime':
        defaultVars.beaconBatchingTime = command[1];
        break;

      case 'maxWaitForResourceTimingsMillis':
        defaultVars.maxWaitForResourceTimingsMillis = command[1];
        break;

      case 'maxMaitForPageLoadMetricsMillis':
        defaultVars.maxMaitForPageLoadMetricsMillis = command[1];
        break;

      case 'trackSessions':
        trackSessions(command[1], command[2]);
        break;

      case 'terminateSession':
        terminateSession();
        break;

      case 'urlsToCheckForGraphQlInsights':
        {
          validateRegExpArray('urlsToCheckForGraphQlInsights', command[1]);
        }

        defaultVars.urlsToCheckForGraphQlInsights = command[1];
        break;

      default:
        {
          warn('Unsupported command: ' + command[0]);
        }

        break;
    }
  }

  function validateRegExpArray(name, arr) {
    if (!(arr instanceof Array)) {
      return warn(name + ' is not an array. This will result in errors.');
    }

    for (var i = 0, len = arr.length; i < len; i++) {
      if (!(arr[i] instanceof RegExp)) {
        return warn(name + '[' + i + '] is not a RegExp. This will result in errors.');
      }
    }
  }

  function wrapTimers() {
    if (defaultVars.wrapTimers) {
      if (isRunningZoneJs) {
        {
          warn('We discovered a usage of Zone.js. In order to avoid any incompatibility issues timer wrapping is not going to be enabled.');
        }

        return;
      }

      wrapTimer('setTimeout');
      wrapTimer('setInterval');
    }
  }

  function wrapTimer(name) {
    var original = win[name];

    if (typeof original !== 'function') {
      // cannot wrap because fn is not a function – should actually never happen
      return;
    }

    win[name] = function wrappedTimerSetter(fn) {
      // non-deopt arguments copy
      var args = new Array(arguments.length);

      for (var i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      args[0] = wrap(fn);
      return original.apply(this, args);
    };
  }

  function wrap(fn) {
    if (typeof fn !== 'function') {
      // cannot wrap because fn is not a function
      return fn;
    }

    return function wrappedTimerHandler() {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        reportError(e);
        ignoreNextOnErrorEvent();
        throw e;
      }
    };
  }

  var t,n,e=function(){return "".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12)},i=function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:-1;return {name:t,value:n,delta:0,entries:[],id:e(),isFinal:!1}},a=function(t,n){try{if(PerformanceObserver.supportedEntryTypes.includes(t)){var e=new PerformanceObserver((function(t){return t.getEntries().map(n)}));return e.observe({type:t,buffered:!0}),e}}catch(t){}},r=!1,o=!1,s=function(t){r=!t.persisted;},u=function(){addEventListener("pagehide",s),addEventListener("unload",(function(){}));},c=function(t){var n=arguments.length>1&&void 0!==arguments[1]&&arguments[1];o||(u(),o=!0),addEventListener("visibilitychange",(function(n){var e=n.timeStamp;"hidden"===document.visibilityState&&t({timeStamp:e,isUnloading:r});}),{capture:!0,once:n});},l=function(t,n,e,i){var a;return function(){e&&n.isFinal&&e.disconnect(),n.value>=0&&(i||n.isFinal||"hidden"===document.visibilityState)&&(n.delta=n.value-(a||0),(n.delta||n.isFinal||void 0===a)&&(t(n),a=n.value));}},p=function(t){var n,e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],r=i("CLS",0),o=function(t){t.hadRecentInput||(r.value+=t.value,r.entries.push(t),n());},s=a("layout-shift",o);s&&(n=l(t,r,s,e),c((function(t){var e=t.isUnloading;s.takeRecords().map(o),e&&(r.isFinal=!0),n();})));},d=function(){return void 0===t&&(t="hidden"===document.visibilityState?0:1/0,c((function(n){var e=n.timeStamp;return t=e}),!0)),{get timeStamp(){return t}}},m=function(t){var n=i("FID"),e=d(),r=function(t){t.startTime<e.timeStamp&&(n.value=t.processingStart-t.startTime,n.entries.push(t),n.isFinal=!0,s());},o=a("first-input",r),s=l(t,n,o);o?c((function(){o.takeRecords().map(r),o.disconnect();}),!0):window.perfMetrics&&window.perfMetrics.onFirstInputDelay&&window.perfMetrics.onFirstInputDelay((function(t,i){i.timeStamp<e.timeStamp&&(n.value=t,n.isFinal=!0,n.entries=[{entryType:"first-input",name:i.type,target:i.target,cancelable:i.cancelable,startTime:i.timeStamp,processingStart:i.timeStamp+t}],s());}));},f=function(){return n||(n=new Promise((function(t){return ["scroll","keydown","pointerdown"].map((function(n){addEventListener(n,t,{once:!0,passive:!0,capture:!0});}))}))),n},g=function(t){var n,e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],r=i("LCP"),o=d(),s=function(t){var e=t.startTime;e<o.timeStamp?(r.value=e,r.entries.push(t)):r.isFinal=!0,n();},u=a("largest-contentful-paint",s);if(u){n=l(t,r,u,e);var p=function(){r.isFinal||(u.takeRecords().map(s),r.isFinal=!0,n());};f().then(p),c(p,!0);}};

  // $FlowFixMe Flow doesn't find the file. Let's ignore this for now.
  function addWebVitals(beacon) {
    g(onMetric, true);
    m(onMetric);
    p(onMetricWithoutRounding, true);

    function onMetric(metric) {
      beacon['t_' + metric.name.toLocaleLowerCase()] = Math.round(metric.value);
    }

    function onMetricWithoutRounding(metric) {
      beacon['t_' + metric.name.toLocaleLowerCase()] = metric.value;
    }
  }

  var state$2 = {
    onEnter: function () {
      if ( !fulfillsPrerequisites()) {
        warn('Browser does not have all the required features for web monitoring.');
      }

      var globalObjectName = win[defaultVars.nameOfLongGlobal];
      var globalObject = win[globalObjectName];

      if (!globalObject) {
        {
          warn('global ' + defaultVars.nameOfLongGlobal + ' not found. Did you use the initializer?');
        }

        return;
      }

      if (!globalObject.q) {
        {
          warn('Command queue not defined. Did you add the tracking script multiple times to your website?');
        }

        return;
      }

      if (typeof globalObject['l'] !== 'number') {
        {
          warn('Reference timestamp not set via EUM initializer. Was the initializer modified?');
        }

        return;
      }

      if (typeof globalObject['v'] === 'number') {
        var version = String(Math.round(globalObject['v']));

        {
          info('Identified version of snippet to be:', version);
        }

        defaultVars.trackingSnippetVersion = version;
      } // Start observing web vitals as early as possible as it registers performance observers.


      try {
        addWebVitals(beacon);
      } catch (e) {
        {
          warn('Failed to capture web vitals. Will continue without web vitals', e);
        }
      }

      processCommands(globalObject.q); // prefer the backend trace ID which was explicitly set

      defaultVars.pageLoadBackendTraceId = defaultVars.pageLoadBackendTraceId || getPageLoadBackendTraceId();
      defaultVars.initializerExecutionTimestamp = globalObject['l'];
      addCommandAfterInitializationSupport();

      if (!defaultVars.reportingUrl) {
        {
          error('No reporting URL configured. Aborting EUM initialization.');
        }

        return;
      }

      hookIntoUserTimings();
      instrumentXMLHttpRequest();
      instrumentFetch();
      hookIntoGlobalErrorEvent();
      wrapTimers();
      wrapEventHandlers();
      hookIntoGlobalUnhandledRejectionEvent();
      transitionTo('waitForPageLoad');
    },
    getActiveTraceId: function () {
      return defaultVars.pageLoadTraceId;
    },
    getActivePhase: function () {
      return pageLoad;
    }
  };

  function processCommands(commands) {
    for (var i = 0, len = commands.length; i < len; i++) {
      processCommand(commands[i]);
    }
  }

  function addCommandAfterInitializationSupport() {
    var globalObjectName = win[defaultVars.nameOfLongGlobal];

    win[globalObjectName] = function () {
      return processCommand(arguments);
    };
  }

  function fulfillsPrerequisites() {
    return win.XMLHttpRequest && win.JSON;
  }

  registerState('init', state$2);
  registerState('waitForPageLoad', state);
  registerState('pageLoaded', state$1);
  transitionTo('init');

}());
//# sourceMappingURL=eum.debug.js.map
