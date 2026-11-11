/* ==========================================================================
   Know Meet — shared runtime (km.js)
   Plain ES5 IIFE, no dependencies. Attaches window.KM.

   Every page must include this pre-paint theme script inline in <head>
   (before km.css paints) so there is no flash of the wrong theme:

     <script>(function(){var t=null;try{t=localStorage.getItem('km-meet-theme')}catch(_){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t})();</script>

   Then load:  <link rel="stylesheet" href="assets/km.css">
               <script src="assets/km.js"></script>   (end of <body>, or with defer)

   Reference revision v2 (2026-11-11): adaptive primary navigation. km.js sets
   <html data-nav-class="bar|rail|inline"> from the window tokens in km.css
   (--window-medium 600, --window-expanded 1024) and morphs once per crossing
   with a View Transition (instant under prefers-reduced-motion). The hamburger
   is retired. [data-tooltip] gets the toast-style tooltip (KM.tooltip).

   Safety: every user/data string reaches the DOM through textContent (KM.h).
   innerHTML is never used with data. No secrets are stored anywhere; the
   LiveKit/Telnyx config below names environment variables only.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var KM = {};
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var THEME_KEY = 'km-meet-theme';
  var AUTH_KEY = 'km-auth';

  /* ---------------------------------------------------------------- utils */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isArray(x) { return Object.prototype.toString.call(x) === '[object Array]'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      if (val === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, val);
    } catch (_) { /* storage unavailable (private mode / file://) */ }
    return null;
  }
  function initials(name) {
    var parts = String(name || '').replace(/^\s+|\s+$/g, '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  /* ---------------------------------------------------------------- KM.h */
  /* h(tag, props, ...children)
     props: class, text (textContent), dataset {}, on<event> listeners,
     any other key → attribute (true → empty attribute; null/false skipped).
     children: nodes, strings, numbers, arrays (nested), null/false skipped. */
  function append(el, c) {
    if (c == null || c === false) return;
    if (isArray(c)) { for (var i = 0; i < c.length; i++) append(el, c[i]); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function h(tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v == null || v === false) return;
      if (k === 'class' || k === 'className') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { if (v[d] != null) el.dataset[d] = v[d]; });
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  /* ---------------------------------------------------------------- icons */
  function icon(name, extraClass) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('class', 'ic' + (extraClass ? ' ' + extraClass : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = document.createElementNS(SVG_NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  function brandMark() {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('class', 'brand-mark');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = document.createElementNS(SVG_NS, 'use');
    u.setAttribute('href', '#km-mark');
    s.appendChild(u);
    return s;
  }
  function setIcon(host, name) {
    var u = host && host.querySelector('use');
    if (u) u.setAttribute('href', '#i-' + name);
    else if (host) host.insertBefore(icon(name), host.firstChild);
  }

  /* Outline family: 24 viewBox, stroke from CSS (.ic → 1.75, round caps/joins).
     Static constant markup — never mixed with data. */
  var DOT = ' fill="currentColor" stroke="none"';
  var ICONS = {
    'mic': '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    'mic-off': '<path d="M15 9.5V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 4.6 2.5M5 11a7 7 0 0 0 11.4 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18"/>',
    'cam': '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    'cam-off': '<path d="M10 6h4a2 2 0 0 1 2 2v4M16 16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M16 10l5-3v10M3 3l18 18"/>',
    'screen': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M12 13V7M9 10l3-3 3 3"/>',
    'cc': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10a2.5 2.5 0 1 0 0 4M17 10a2.5 2.5 0 1 0 0 4"/>',
    'chat': '<path d="M4 5h16v11H9l-5 4z"/>',
    'book': '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/><path d="M9 7h7M9 11h5"/>',
    'agent-add': '<rect x="3" y="7" width="12" height="11" rx="3"/><path d="M9 4v3M7 12h.01M11 12h.01M19 8v6M16 11h6"/>',
    'dot': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"' + DOT + '/>',
    'leave': '<path d="M3 14.5c5-4.5 13-4.5 18 0l-1.8 2.8-3.7-1v-2.8c-2.9-.9-5.1-.9-7 0v2.8l-3.7 1z"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'moon': '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    'x': '<path d="M6 6l12 12M18 6L6 18"/>',
    'upload': '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'alert': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    'pause': '<path d="M9 5v14M15 5v14"/>',
    'play': '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    'send': '<path d="M4 12l16-8-6 16-3-7z"/>',
    'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'refresh': '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    'remove': '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'calendar': '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    'sms': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/>',
    'phone': '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z"/>',
    'phone-in': '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z"/><path d="M21 3l-5.5 5.5M15 4v5h5"/>',
    'link': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    'copy': '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    'record': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"' + DOT + '/>',
    'stop': '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    'download': '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    'cloud': '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10a4.3 4.3 0 0 1-.5 8.5z"/>',
    'database': '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
    'server': '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5"/>',
    'key': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    'home': '<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
    'film': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'search': '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    'chevron-down': '<path d="M5 9l7 7 7-7"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'external': '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    'shield': '<path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/>',
    'wave': '<path d="M3 10.5v3M7 8v8M11 4.5v15M15 8v8M19 10v4"/>',
    'bolt': '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
    'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    'log-out': '<path d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4M16 16l4-4-4-4M20 12H9"/>',
    'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/>',
    'filter': '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>'
  };
  /* Know Meet mark — "Gathering": an ember core (the meeting's shared memory)
     with five participants around it; one cyan agent among the people. */
  var KM_MARK =
    '<symbol id="km-mark" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="11" style="fill: var(--ember)" stroke="none"/>' +
      '<circle cx="32.00" cy="11.00" r="6" style="fill: currentColor" stroke="none"/>' +
      '<circle cx="51.97" cy="25.51" r="6" style="fill: var(--cyan)" stroke="none"/>' +
      '<circle cx="44.34" cy="48.99" r="6" style="fill: currentColor" stroke="none"/>' +
      '<circle cx="19.66" cy="48.99" r="6" style="fill: currentColor" stroke="none"/>' +
      '<circle cx="12.03" cy="25.51" r="6" style="fill: currentColor" stroke="none"/>' +
    '</symbol>';

  function injectSprite() {
    if (document.getElementById('km-sprite') || !document.body) return;
    var src = '<svg xmlns="' + SVG_NS + '"><defs>';
    Object.keys(ICONS).forEach(function (name) {
      src += '<symbol id="i-' + name + '" viewBox="0 0 24 24">' + ICONS[name] + '</symbol>';
    });
    src += KM_MARK + '</defs></svg>';
    var parsed = new DOMParser().parseFromString(src, 'image/svg+xml');
    var sprite = document.importNode(parsed.documentElement, true);
    sprite.setAttribute('id', 'km-sprite');
    sprite.setAttribute('width', '0');
    sprite.setAttribute('height', '0');
    sprite.setAttribute('aria-hidden', 'true');
    sprite.setAttribute('focusable', 'false');
    sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    document.body.insertBefore(sprite, document.body.firstChild);
  }

  /* ---------------------------------------------------------------- theme */
  var theme = {
    get: function () { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; },
    set: function (t) {
      t = t === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      store(THEME_KEY, t);
      theme.sync();
      return t;
    },
    toggle: function () { return theme.set(theme.get() === 'dark' ? 'light' : 'dark'); },
    /* Refresh label + icon on every .theme-toggle (call after injecting new ones). */
    sync: function () {
      var t = theme.get();
      $$('.theme-toggle').forEach(function (b) {
        b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        b.setAttribute('title', t === 'dark' ? 'Light theme' : 'Dark theme');
        setIcon(b, t === 'dark' ? 'sun' : 'moon');
      });
    }
  };
  /* Delegated: works for toggles rendered later too. */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.theme-toggle') : null;
    if (b) { e.preventDefault(); theme.toggle(); }
  });

  /* ---------------------------------------------------------------- auth (simulated) */
  var authListeners = [];
  function readAuth() {
    var raw = store(AUTH_KEY);
    if (!raw) return null;
    try {
      var u = JSON.parse(raw);
      if (!u || typeof u.email !== 'string' || !u.email) return null;
      var name = typeof u.name === 'string' && u.name ? u.name : u.email.split('@')[0];
      return { name: name, email: u.email, initials: initials(name) };
    } catch (_) { return null; }
  }
  function emitAuth() {
    var u = readAuth();
    authListeners.slice().forEach(function (fn) { try { fn(u); } catch (err) { if (window.console) console.error(err); } });
  }
  var auth = {
    get: readAuth,
    isSignedIn: function () { return !!readAuth(); },
    signIn: function (o) {
      o = o || {};
      var email = String(o.email || '').replace(/^\s+|\s+$/g, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required.');
      var name = String(o.name || '').replace(/^\s+|\s+$/g, '') || email.split('@')[0];
      store(AUTH_KEY, JSON.stringify({ name: name.slice(0, 80), email: email.slice(0, 254), since: new Date().toISOString() }));
      emitAuth();
      return readAuth();
    },
    signOut: function () { store(AUTH_KEY, null); emitAuth(); },
    onChange: function (fn) {
      authListeners.push(fn);
      return function off() { var i = authListeners.indexOf(fn); if (i > -1) authListeners.splice(i, 1); };
    }
  };
  window.addEventListener('storage', function (e) { if (e.key === AUTH_KEY) emitAuth(); if (e.key === THEME_KEY && e.newValue) { document.documentElement.dataset.theme = e.newValue; theme.sync(); } });

  function signInUrl(next) {
    return 'auth.html#sign-in?next=' + encodeURIComponent(next || location.pathname.split('/').pop() + location.hash);
  }

  /* ---------------------------------------------------------------- toasts */
  var TOAST_MS = 3400;
  function toastRegion() {
    var r = $('.toasts');
    if (!r && document.body) {
      r = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' });
      document.body.appendChild(r);
    }
    return r;
  }
  function toast(msg, iconName) {
    var region = toastRegion();
    if (!region) return null;
    var t = h('div', { class: 'toast' }, iconName ? icon(iconName, 'ic-sm') : null, h('span', { text: msg }));
    region.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, TOAST_MS);
    return t;
  }

  /* ---------------------------------------------------------------- clipboard */
  function copy(text) {
    var value = String(text == null ? '' : text);
    function fallback() {
      var ta = h('textarea', { 'aria-hidden': 'true', readonly: true, style: 'position:fixed;top:-1000px;opacity:0' });
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    function done(ok) { toast(ok ? 'Copied' : 'Couldn’t copy — select and copy manually', ok ? 'check' : 'alert'); return ok; }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { return done(true); }, function () { return done(fallback()); });
    }
    return Promise.resolve(done(fallback()));
  }

  /* ---------------------------------------------------------------- formatters */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function toDate(d) { return d instanceof Date ? d : new Date(d); }
  var fmt = {
    bytes: function (n) {
      n = Number(n) || 0;
      if (n < 1024) return n + ' B';
      var units = ['KB', 'MB', 'GB', 'TB'];
      var i = -1;
      do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
      return (n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)) + ' ' + units[i];
    },
    /* mm:ss, or h:mm:ss when ≥ 1 hour */
    dur: function (ms) {
      var s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
      var m = Math.floor(s / 60);
      var hr = Math.floor(m / 60);
      return hr ? hr + ':' + pad(m % 60) + ':' + pad(s % 60) : pad(m) + ':' + pad(s % 60);
    },
    /* "46 min" / "1 h 12 min" */
    mins: function (min) {
      min = Math.round(Number(min) || 0);
      if (min < 60) return min + ' min';
      return Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
    },
    time: function (d) {
      d = toDate(d);
      var hr = d.getHours();
      return ((hr % 12) || 12) + ':' + pad(d.getMinutes()) + ' ' + (hr < 12 ? 'AM' : 'PM');
    },
    day: function (d) { d = toDate(d); return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); },
    /* "Mon, Oct 20 · 10:00 AM" */
    date: function (d) { return fmt.day(d) + ' · ' + fmt.time(d); },
    /* "Today" / "Tomorrow" / "Mon, Oct 20" */
    relDay: function (d) {
      d = toDate(d);
      var a = new Date(); a.setHours(0, 0, 0, 0);
      var b = new Date(d.getTime()); b.setHours(0, 0, 0, 0);
      var diff = Math.round((b - a) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      return fmt.day(d);
    },
    number: function (n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    initials: initials
  };

  /* ---------------------------------------------------------------- dialogs */
  function dialog(dlg) {
    if (!dlg) return null;
    if (!dlg.dataset.kmWired) {
      dlg.dataset.kmWired = 'true';
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) { dlg.close(); return; }
        var c = e.target.closest ? e.target.closest('[data-close]') : null;
        if (c && dlg.contains(c)) { e.preventDefault(); dlg.close(); }
      });
    }
    return {
      el: dlg,
      open: function () { if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } },
      close: function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    };
  }

  var dlgUid = 0;
  /* KM.confirm({title, body, confirmLabel, cancelLabel, danger}) → Promise<boolean> */
  function confirmDialog(o) {
    o = o || {};
    dlgUid += 1;
    var tid = 'km-confirm-' + dlgUid;
    return new Promise(function (resolve) {
      var result = false;
      var okBtn = h('button', { class: 'btn ' + (o.danger ? 'btn-danger' : 'btn-primary'), type: 'button', text: o.confirmLabel || 'Confirm',
        onclick: function () { result = true; dlg.close(); } });
      var dlg = h('dialog', { 'aria-labelledby': tid },
        h('div', { class: 'dlg' },
          h('div', { class: 'dlg-head' },
            h('div', null, h('h2', { id: tid, text: o.title || 'Are you sure?' })),
            h('button', { class: 'icon-btn', type: 'button', 'data-close': true, 'aria-label': 'Close' }, icon('x'))),
          h('div', { class: 'dlg-body' }, o.body ? (typeof o.body === 'string' ? h('p', { text: o.body }) : o.body) : null),
          h('div', { class: 'dlg-foot' },
            h('button', { class: 'btn', type: 'button', 'data-close': true, text: o.cancelLabel || 'Cancel' }),
            okBtn)));
      document.body.appendChild(dlg);
      dialog(dlg);
      dlg.addEventListener('close', function () {
        setTimeout(function () { if (dlg.parentNode) dlg.parentNode.removeChild(dlg); }, 0);
        resolve(result);
      });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      (o.danger ? dlg.querySelector('[data-close].btn') : okBtn).focus();
    });
  }

  /* ---------------------------------------------------------------- sheet */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function sheet(el, opts) {
    if (!el) return null;
    if (el._kmSheet) return el._kmSheet;
    opts = opts || {};
    var scrim = el.previousElementSibling && el.previousElementSibling.classList.contains('sheet-scrim') ? el.previousElementSibling : null;
    if (!scrim) {
      scrim = h('div', { class: 'sheet-scrim', 'data-open': 'false', 'aria-hidden': 'true' });
      el.parentNode.insertBefore(scrim, el);
    }
    if (!el.getAttribute('role')) el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('data-open', 'false');
    el.setAttribute('aria-hidden', 'true');
    var lastFocus = null;
    var isOpen = false;

    function onKey(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); api.close(); return; }
      if (e.key === 'Tab') {
        var f = $$(FOCUSABLE, el).filter(function (n) { return n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    var api = {
      el: el,
      isOpen: function () { return isOpen; },
      open: function () {
        if (isOpen) return;
        isOpen = true;
        lastFocus = document.activeElement;
        el.setAttribute('data-open', 'true');
        el.setAttribute('aria-hidden', 'false');
        scrim.setAttribute('data-open', 'true');
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        var target = el.querySelector('[autofocus]') || $$(FOCUSABLE, el)[0] || el;
        if (target === el) el.setAttribute('tabindex', '-1');
        setTimeout(function () { target.focus(); }, 30);
        if (opts.onOpen) opts.onOpen(api);
      },
      close: function () {
        if (!isOpen) return;
        isOpen = false;
        el.setAttribute('data-open', 'false');
        el.setAttribute('aria-hidden', 'true');
        scrim.setAttribute('data-open', 'false');
        document.documentElement.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
        if (opts.onClose) opts.onClose(api);
      },
      toggle: function () { if (isOpen) api.close(); else api.open(); }
    };
    scrim.addEventListener('click', api.close);
    el.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-close]') : null;
      if (c && el.contains(c)) { e.preventDefault(); api.close(); }
    });
    el._kmSheet = api;
    return api;
  }

  /* ---------------------------------------------------------------- router */
  /* Hash forms: #view   #view:arg   #view:arg?x=1&y=2 */
  function parseHash(hash) {
    var raw = String(hash == null ? location.hash : hash).replace(/^#/, '');
    var qi = raw.indexOf('?');
    var path = qi > -1 ? raw.slice(0, qi) : raw;
    var query = qi > -1 ? raw.slice(qi + 1) : '';
    var ci = path.indexOf(':');
    var view = ci > -1 ? path.slice(0, ci) : path;
    var arg = ci > -1 ? path.slice(ci + 1) : null;
    var params = {};
    query.split('&').forEach(function (pair) {
      if (!pair) return;
      var ei = pair.indexOf('=');
      var k = ei > -1 ? pair.slice(0, ei) : pair;
      var v = ei > -1 ? pair.slice(ei + 1) : '';
      try { params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (_) { params[k] = v; }
    });
    try { view = decodeURIComponent(view); if (arg != null) arg = decodeURIComponent(arg); } catch (_) { /* keep raw */ }
    return { view: view, arg: arg, params: params };
  }
  function focusHeading() {
    var h1 = $('main h1') || $('h1');
    if (!h1) return;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    try { h1.focus({ preventScroll: true }); } catch (_) { h1.focus(); }
  }
  function route(handlers, fallbackKey) {
    var first = true;
    function run() {
      var r = parseHash();
      var key = r.view && Object.prototype.hasOwnProperty.call(handlers, r.view) ? r.view : fallbackKey;
      var fn = handlers[key];
      if (typeof fn === 'function') fn(key === r.view ? r.arg : null, r.params, key);
      window.scrollTo(0, 0);
      if (!first) focusHeading();
      first = false;
    }
    window.addEventListener('hashchange', run);
    run();
    return {
      go: function (hash) {
        var next = '#' + String(hash || '').replace(/^#/, '');
        if (location.hash === next) run(); else location.hash = next;
      },
      current: function () { return parseHash(); },
      refresh: run
    };
  }

  /* ---------------------------------------------------------------- gate + lock badge */
  function gate(container, o) {
    o = o || {};
    var card = h('section', { class: 'gate', 'aria-labelledby': 'km-gate-title' },
      h('div', { class: 'gate-icon' }, icon('lock', 'ic-lg')),
      h('h2', { id: 'km-gate-title', text: o.title || 'Sign in to continue' }),
      h('p', { text: o.reason || 'This part of Know Meet is tied to your account.' }),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn-primary', href: signInUrl(o.next) }, icon('user'), h('span', { text: 'Sign in' })),
        h('a', { class: 'btn', href: 'meet.html#start' }, icon('cam'), h('span', { text: 'Start a guest meeting' }))));
    if (container) { clear(container); container.appendChild(card); }
    return card;
  }
  function lockBadge(label) {
    return h('span', { class: 'lock-badge' }, icon('lock'), h('span', { text: label || 'Sign in required' }));
  }

  /* ---------------------------------------------------------------- adaptive navigation */
  /* DESIGN.md "Adaptive layout": bar < window-medium, rail < window-expanded,
     inline links otherwise. The class is a data attribute so one DOM commit
     can run inside document.startViewTransition(); the nav DOM never changes,
     so a focused destination keeps focus through the morph. */
  var WINDOW = { medium: 600, expanded: 1024 };
  var navMorph = null;
  function readWindowTokens() {
    try {
      var cs = window.getComputedStyle(document.documentElement);
      var m = parseFloat(cs.getPropertyValue('--window-medium'));
      var e = parseFloat(cs.getPropertyValue('--window-expanded'));
      if (m > 0) WINDOW.medium = m;
      if (e > 0) WINDOW.expanded = e;
    } catch (_) { /* keep the token defaults */ }
  }
  function navClassFor(width) { return width < WINDOW.medium ? 'bar' : (width < WINDOW.expanded ? 'rail' : 'inline'); }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  /* DESIGN.md "Resize motion": transform and opacity only. The UA group
     animation also tweens width/height (and backdrop-filter); keep its
     transform path (the indicator still travels) and drop the rest, so each
     group snaps to its new box while its snapshots crossfade. Durations and
     easing stay on the ::view-transition-* rules in km.css. */
  var COMPOSITOR = { transform: 1, opacity: 1, offset: 1, computedOffset: 1, easing: 1, composite: 1 };
  function compositorOnlyGroups() {
    document.getAnimations().forEach(function (a) {
      var fx = a.effect;
      if (!fx || !fx.pseudoElement || fx.pseudoElement.indexOf('::view-transition-group') !== 0) return;
      fx.setKeyframes(fx.getKeyframes().map(function (frame) {
        var kept = {};
        Object.keys(frame).forEach(function (k) { if (COMPOSITOR[k] && k !== 'computedOffset') kept[k] = frame[k]; });
        return kept;
      }));
    });
  }
  function applyNavClass(animate) {
    var root = document.documentElement;
    var next = navClassFor(window.innerWidth);
    if (root.dataset.navClass === next) return;
    /* The class swap itself never transitions (no 150ms colour fades on the
       links): transitions are off while the new class is committed and the
       style flushed, so turning them back on starts nothing. */
    function commit() {
      root.setAttribute('data-nav-committing', '');
      root.dataset.navClass = next;
      void window.getComputedStyle(root).color;
      var probe = $('.appnav a'); if (probe) void window.getComputedStyle(probe).color;
      root.removeAttribute('data-nav-committing');
    }
    if (navMorph) { navMorph.skipTransition(); navMorph = null; commit(); return; }
    if (!animate || reducedMotion()) { commit(); return; }
    if (document.startViewTransition) {
      navMorph = document.startViewTransition(commit);
      navMorph.ready.then(compositorOnlyGroups, function () {});
      navMorph.finished.then(function () { navMorph = null; }, function () { navMorph = null; });
      return;
    }
    commit();
    var nav = $('.appnav');
    if (nav) { nav.classList.remove('is-swapping'); void nav.offsetWidth; nav.classList.add('is-swapping'); }
  }
  readWindowTokens();
  applyNavClass(false);
  window.addEventListener('resize', function () { applyNavClass(true); });

  /* ---------------------------------------------------------------- tooltip */
  /* Toast style (operator 2026-11-11): after 500ms hover or on focus; Escape
     dismisses. It never holds interactive content or the only copy of
     information (SC 1.4.13). The trigger keeps its own accessible name. */
  var TIP_DELAY = 500;
  var tip = { el: null, timer: 0, owner: null };
  function hideTooltip() {
    clearTimeout(tip.timer);
    if (tip.el && tip.el.parentNode) tip.el.parentNode.removeChild(tip.el);
    if (tip.owner) tip.owner.removeAttribute('aria-describedby');
    tip.el = null; tip.owner = null;
  }
  function showTooltip(owner) {
    hideTooltip();
    var text = owner.getAttribute('data-tooltip');
    if (!text) return;
    var el = h('div', { class: 'tooltip', role: 'tooltip', id: 'km-tooltip', text: text });
    document.body.appendChild(el);
    var r = owner.getBoundingClientRect();
    var top = r.bottom + 8;
    if (top + el.offsetHeight > window.innerHeight - 8) top = r.top - 8 - el.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - el.offsetWidth / 2), window.innerWidth - 8 - el.offsetWidth);
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    owner.setAttribute('aria-describedby', 'km-tooltip');
    tip.el = el; tip.owner = owner;
  }
  function tooltipOwner(e) { return e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null; }
  document.addEventListener('mouseover', function (e) {
    var o = tooltipOwner(e);
    if (!o || o === tip.owner) return;
    clearTimeout(tip.timer);
    tip.timer = setTimeout(function () { showTooltip(o); }, TIP_DELAY);
  });
  document.addEventListener('mouseout', function (e) { var o = tooltipOwner(e); if (o && !o.contains(e.relatedTarget)) hideTooltip(); });
  document.addEventListener('focusin', function (e) { var o = tooltipOwner(e); if (o) showTooltip(o); });
  document.addEventListener('focusout', function (e) { if (tooltipOwner(e)) hideTooltip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tip.el) hideTooltip(); });

  /* ---------------------------------------------------------------- slider fill */
  /* input[type=range] paints its `selected` range from --pct (km.css). */
  function syncRange(input) {
    var min = parseFloat(input.min) || 0, max = parseFloat(input.max), val = parseFloat(input.value);
    if (!(max > min)) max = 100;
    input.style.setProperty('--pct', ((Math.min(Math.max(val, min), max) - min) / (max - min) * 100) + '%');
  }
  document.addEventListener('input', function (e) { if (e.target && e.target.type === 'range') syncRange(e.target); });
  function syncAllRanges() { $$('input[type="range"]').forEach(syncRange); }

  /* ---------------------------------------------------------------- app bar */
  var NAV = [
    { key: 'home', label: 'Home', href: 'index.html', icon: 'home' },
    { key: 'meetings', label: 'Meetings', href: 'dashboard.html', icon: 'calendar' },
    { key: 'recordings', label: 'Recordings', href: 'recordings.html', icon: 'film' },
    { key: 'agents', label: 'Agents', href: 'agents.html', icon: 'agent-add' },
    { key: 'settings', label: 'Settings', href: 'settings.html', icon: 'settings' }
  ];
  function mountAppBar(el, opts) {
    if (!el) return null;
    opts = opts || {};
    el.classList.add('appbar');
    var state = { menuOpen: false };

    function q(sel) { return el.querySelector(sel); }
    function setMenu(open, returnFocus) {
      var menu = q('.acct-menu'), btn = q('.acct-btn');
      if (!menu || !btn) return;
      state.menuOpen = open;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var first = menu.querySelector('a, button'); if (first) first.focus(); }
      if (!open && returnFocus) btn.focus();
    }

    function accountCluster(user) {
      if (!user) {
        return h('a', { class: 'btn btn-ghost btn-sm', href: signInUrl() }, icon('user', 'ic-sm hide-sm'), h('span', { text: 'Sign in' }));
      }
      var menuId = 'km-acct-menu';
      return h('div', { class: 'menu-wrap' },
        h('button', { class: 'acct-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': menuId,
            'aria-label': 'Account: ' + user.name,
            onclick: function (e) { e.stopPropagation(); setMenu(!state.menuOpen); } },
          h('span', { class: 'avatar', 'aria-hidden': 'true', text: user.initials })),
        h('div', { class: 'menu acct-menu', id: menuId, hidden: true },
          h('div', { class: 'menu-id' },
            h('strong', { text: user.name }),
            h('span', { text: user.email })),
          h('a', { class: 'menu-item', href: 'settings.html' }, icon('settings'), h('span', { text: 'Settings' })),
          h('button', { class: 'menu-item', type: 'button',
              onclick: function () { auth.signOut(); location.reload(); } },
            icon('log-out'), h('span', { text: 'Sign out' }))));
    }

    function render() {
      state.menuOpen = false;
      var user = auth.get();
      clear(el);
      var navId = 'km-appnav';
      el.appendChild(h('div', { class: 'appbar-inner' },
        h('a', { class: 'brand', href: 'index.html', 'aria-label': 'Know Meet home' },
          brandMark(),
          h('span', { class: 'brand-word', 'aria-hidden': 'true' }, 'Know ', h('b', { text: 'Meet' }))),
        h('nav', { class: 'appnav', id: navId, 'aria-label': 'Primary' },
          h('ul', null, NAV.map(function (n) {
            return h('li', null,
              h('a', { href: n.href, 'aria-current': n.key === opts.active ? 'page' : null },
                h('span', { class: 'nav-ind', 'aria-hidden': 'true' }, icon(n.icon)),
                h('span', { class: 'nav-label', text: n.label })));
          }))),
        h('div', { class: 'appbar-right' },
          h('a', { class: 'btn btn-primary btn-sm btn-start', href: 'meet.html#start' }, icon('cam'), h('span', { class: 'btn-label', text: 'Start meeting' })),
          h('button', { class: 'icon-btn theme-toggle', type: 'button', 'aria-label': 'Switch theme' }, icon('sun')),
          accountCluster(user))));
      theme.sync();
      applyNavClass(false);
    }

    if (!el._kmAppBar) {
      el._kmAppBar = true;
      document.addEventListener('click', function (e) {
        if (state.menuOpen) { var m = q('.menu-wrap'); if (m && !m.contains(e.target)) setMenu(false); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (state.menuOpen) setMenu(false, true);
      });
      auth.onChange(render);
    }
    render();
    return { render: render, closeMenus: function () { setMenu(false); } };
  }

  /* ---------------------------------------------------------------- sample data (fictional) */
  function buildData() {
    var now = new Date();
    var MIN = 60000;
    function at(dayOffset, hh, mm) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hh, mm, 0, 0);
      return d;
    }
    /* live now: started ~18 min ago, rounded down to 5 min */
    var liveStart = new Date(Math.floor((now.getTime() - 18 * MIN) / (5 * MIN)) * 5 * MIN);
    /* later today: ~90 min from now, on a 15-min boundary; stays today */
    var laterStart = new Date(Math.ceil((now.getTime() + 90 * MIN) / (15 * MIN)) * 15 * MIN);
    if (laterStart.getDate() !== now.getDate()) laterStart = new Date(now.getTime() + 10 * MIN);
    var dialIn = { number: '+1 (415) 555-0199', pin: '482 913 07' };

    var people = [
      { id: 'avery', name: 'Avery Chen', email: 'avery.chen@northwind.io', phone: '+1 415 555 0142', org: 'Northwind', initials: 'AC' },
      { id: 'marcus', name: 'Marcus Oyelaran', email: 'marcus@northwind.io', phone: '+1 312 555 0190', org: 'Northwind', initials: 'MO' },
      { id: 'priya', name: 'Priya Natarajan', email: 'priya.n@lumenlabs.co', phone: '+1 646 555 0117', org: 'Lumen Labs', initials: 'PN' },
      { id: 'dana', name: 'Dana Whitfield', email: 'dana@lumenlabs.co', phone: '+1 206 555 0163', org: 'Lumen Labs', initials: 'DW' }
    ];

    var agents = [
      { id: 'concierge', name: 'Concierge', role: 'Guide', worker: 'knowme-concierge', mono: 'CG', system: true, status: 'online', owner: 'KnowMe',
        desc: 'Greets guests, explains the room, and routes questions to the right agent. Always present.' },
      { id: 'scribe', name: 'Scribe', role: 'Note-taker', worker: 'scribe-notes', mono: 'SC', system: false, status: 'online', owner: 'Jordan Reyes',
        desc: 'Keeps live notes, decisions and action items, then sends the summary after the call.' },
      { id: 'researcher', name: 'Researcher', role: 'Research', worker: 'kb-researcher', mono: 'RS', system: false, status: 'online', owner: 'Avery Chen',
        desc: 'Answers questions from the meeting’s shared knowledge with cited sources.' },
      { id: 'facilitator', name: 'Facilitator', role: 'Facilitation', worker: 'agenda-facilitator', mono: 'FA', system: false, status: 'online', owner: 'Jordan Reyes',
        desc: 'Tracks the agenda and time boxes, and nudges the group when a topic runs long.' },
      { id: 'translator', name: 'Translator', role: 'Live translation', worker: 'live-translate', mono: 'TR', system: false, status: 'offline', owner: 'Priya Natarajan',
        desc: 'Speaks and captions the conversation in another language in real time.' }
    ];

    var meetings = [
      { id: 'partner-onboarding', title: 'Partner onboarding review', start: liveStart.toISOString(), durationMin: 60, source: 'google',
        host: 'Jordan Reyes', invitees: ['Avery Chen', 'Marcus Oyelaran', 'Priya Natarajan'], dialIn: dialIn,
        agents: ['concierge', 'scribe', 'researcher'], record: true, joinCode: 'km-4fq-82x' },
      { id: 'cohort-kickoff', title: 'Cohort 2 kickoff', start: laterStart.toISOString(), durationMin: 45, source: 'outlook',
        host: 'Jordan Reyes', invitees: ['Priya Natarajan', 'Dana Whitfield'], dialIn: dialIn,
        agents: ['concierge', 'facilitator'], record: true, joinCode: 'km-7td-31p' },
      { id: 'product-sync', title: 'Weekly product sync', start: at(1, 10, 0).toISOString(), durationMin: 30, source: 'knowme',
        host: 'Avery Chen', invitees: ['Jordan Reyes', 'Marcus Oyelaran'], dialIn: dialIn,
        agents: ['concierge', 'scribe'], record: false, joinCode: 'km-2hn-95k' },
      { id: 'pricing-review', title: 'Pricing review', start: at(3, 14, 0).toISOString(), durationMin: 60, source: 'google',
        host: 'Jordan Reyes', invitees: ['Avery Chen', 'Priya Natarajan', 'Dana Whitfield'], dialIn: dialIn,
        agents: ['concierge', 'researcher', 'translator'], record: true, joinCode: 'km-9wc-48m' }
    ];

    var recordings = [
      { id: 'partner-onboarding-1014', meetingId: 'partner-onboarding', title: 'Partner onboarding review',
        date: '2026-10-14T16:00:00', durationMin: 46, format: 'mp4', layout: 'speaker',
        storage: 's3', bucket: 'knowme-meet-recordings', path: 'knowme-meet-recordings/2026/10/14/partner-onboarding-1014.mp4',
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', sizeBytes: 432013312,
        summarySent: true, transcriptWords: 6910,
        participants: ['Jordan Reyes', 'Avery Chen', 'Marcus Oyelaran'], agents: ['concierge', 'scribe', 'researcher'] },
      { id: 'design-crit-1009', meetingId: null, title: 'Design critique',
        date: '2026-10-09T11:00:00', durationMin: 31, format: 'mp4', layout: 'grid',
        storage: 's3', bucket: 'knowme-meet-recordings', path: 'knowme-meet-recordings/2026/10/09/design-crit-1009.mp4',
        cid: 'bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs7ewhnp7lly', sizeBytes: 291504128,
        summarySent: true, transcriptWords: 4380,
        participants: ['Jordan Reyes', 'Priya Natarajan', 'Dana Whitfield'], agents: ['concierge', 'scribe'] },
      { id: 'vendor-call-1002', meetingId: null, title: 'Vendor security call',
        date: '2026-10-02T15:30:00', durationMin: 52, format: 'mp4', layout: 'speaker',
        storage: 'byo', bucket: 'acme-meet-archive', path: 'acme-meet-archive/meet/2026/10/02/vendor-call-1002.mp4',
        cid: 'bafybeie5gq4jxvzmsrq3wrk5lklbqzpmbeb3ji4s5gwzzpxrqxt2vtwgfu', sizeBytes: 488636416,
        summarySent: false, transcriptWords: 7720,
        participants: ['Jordan Reyes', 'Marcus Oyelaran', 'Dana Whitfield'], agents: ['concierge', 'researcher'] }
    ];

    var dots = [
      { id: 'iris', name: 'Iris', owner: 'you', ownerLabel: 'Your dot', color: 'ember', orbClass: 'orb' },
      { id: 'sol', name: 'Sol', owner: 'Avery Chen', ownerLabel: 'Avery’s dot', color: 'cyan', orbClass: 'orb orb--cyan' }
    ];

    function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

    return {
      user: { name: 'Jordan Reyes', email: 'jordan.reyes@know-me.tools' },
      people: people,
      meetings: meetings,
      recordings: recordings,
      agents: agents,
      dots: dots,
      /* Config references only — env var NAMES, never values. */
      livekit: { url: 'wss://knowme-23fkf8pz.livekit.cloud', keyVar: 'LIVEKIT_API_KEY', secretVar: 'LIVEKIT_API_SECRET' },
      telnyx: {
        smsFrom: '+1 (415) 555-0123',
        messagingProfile: 'Know Meet invites',
        dialIn: [{ number: '+1 (415) 555-0199', region: 'US' }, { number: '+44 20 7946 0958', region: 'UK' }],
        sipTrunk: 'knowme-livekit-inbound'
      },

      /* lookups */
      meeting: function (id) { return byId(meetings, id); },
      recording: function (id) { return byId(recordings, id); },
      agent: function (id) { return byId(agents, id); },
      dot: function (id) { return byId(dots, id); },
      person: function (nameOrId) {
        for (var i = 0; i < people.length; i++) if (people[i].id === nameOrId || people[i].name === nameOrId) return people[i];
        return null;
      },
      /* 'live' | 'upcoming' | 'ended' relative to the current time */
      meetingStatus: function (m) {
        var s = new Date(m.start).getTime();
        var e = s + m.durationMin * MIN;
        var t = Date.now();
        return t < s ? 'upcoming' : (t <= e ? 'live' : 'ended');
      },
      meetingEnd: function (m) { return new Date(new Date(m.start).getTime() + m.durationMin * MIN); }
    };
  }

  /* ---------------------------------------------------------------- export */
  KM.h = h;
  KM.icon = icon;
  KM.brandMark = brandMark;
  KM.setIcon = setIcon;
  KM.$ = $;
  KM.$$ = $$;
  KM.clear = clear;
  KM.ready = ready;
  KM.initials = initials;
  KM.theme = theme;
  KM.auth = auth;
  KM.signInUrl = signInUrl;
  KM.mountAppBar = mountAppBar;
  KM.gate = gate;
  KM.lockBadge = lockBadge;
  KM.toast = toast;
  KM.tooltip = { show: showTooltip, hide: hideTooltip };
  KM.navClass = function () { return document.documentElement.dataset.navClass; };
  KM.route = route;
  KM.parseHash = parseHash;
  KM.dialog = dialog;
  KM.confirm = confirmDialog;
  KM.sheet = sheet;
  KM.copy = copy;
  KM.fmt = fmt;
  KM.data = buildData();
  KM.iconNames = Object.keys(ICONS);

  /* wide tables scroll inside their own .table-wrap; while one overflows it becomes a
     named, keyboard-scrollable region (WCAG 2.1.1, axe scrollable-region-focusable) */
  function markScrollRegions() {
    $$('.table-wrap').forEach(function (w) {
      var over = w.scrollWidth > w.clientWidth + 1;
      if (over && !w.hasAttribute('tabindex')) {
        var cap = w.querySelector('caption');
        w.setAttribute('tabindex', '0');
        w.setAttribute('role', 'region');
        w.setAttribute('aria-label', (cap && cap.textContent ? cap.textContent : 'Table') + ', scrollable');
        w.setAttribute('data-km-scroll', '1');
      } else if (!over && w.getAttribute('data-km-scroll') === '1') {
        w.removeAttribute('tabindex'); w.removeAttribute('role'); w.removeAttribute('aria-label'); w.removeAttribute('data-km-scroll');
      }
    });
  }
  var scrollRegionQueued = false;
  function queueScrollRegions() {
    if (scrollRegionQueued) return;
    scrollRegionQueued = true;
    requestAnimationFrame(function () { scrollRegionQueued = false; markScrollRegions(); });
  }
  ready(function () {
    window.addEventListener('resize', queueScrollRegions);
    if (window.MutationObserver) new MutationObserver(queueScrollRegions).observe(document.body, { childList: true, subtree: true });
    queueScrollRegions();
  });

  window.KM = KM;

  /* ---------------------------------------------------------------- boot */
  if (document.body) injectSprite();
  ready(function () {
    injectSprite();
    toastRegion();
    theme.sync();
    syncAllRanges();
  });
})(window, document);
