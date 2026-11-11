/* ==========================================================================
   Know Meet Live — start, lobby, after-meeting views and the page router.
   Tokens come from the local server (server.mjs) at /api/token; the LiveKit
   API secret never reaches the browser.
   ========================================================================== */
(function (window, document, KM, LK) {
  'use strict';

  var h = KM.h, $ = KM.$, $$ = KM.$$;
  var KML = window.KML;
  var CODE_RE = /^km-[a-z0-9]{3}-[a-z0-9]{3}$/;
  var CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  var NAME_KEY = 'km-live-name';
  var LAST_KEY = 'km-live-last';
  var DEFAULT_TITLE = 'Know Meet room';

  var router = null;
  var pv = { video: null, audio: null, raf: 0, ctx: null, mic: true, cam: false, micDev: '', camDev: '' };
  var lobby = null; // { code, title, role }

  /* ------------------------------------------------------------------ utils */
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) { /* storage blocked */ }
    return null;
  }
  var memLast = null;
  function saveLast(obj) { memLast = obj; try { sessionStorage.setItem(LAST_KEY, JSON.stringify(obj)); } catch (_) { /* in-memory fallback */ } }
  function readLast() {
    try { var raw = sessionStorage.getItem(LAST_KEY); if (raw) return JSON.parse(raw); } catch (_) { /* ignore */ }
    return memLast;
  }
  function hydrateIcons(root) {
    $$('[data-ic]', root).forEach(function (el) { el.parentNode.replaceChild(KM.icon(el.dataset.ic, el.dataset.icClass), el); });
  }
  function btnLabel(btn, iconName, text) {
    KM.clear(btn);
    if (iconName) btn.appendChild(KM.icon(iconName));
    btn.appendChild(h('span', { text: text }));
  }
  function newCode() {
    var bytes = new Uint8Array(6), out = '';
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    for (var i = 0; i < 6; i++) { out += CODE_ALPHABET.charAt(bytes[i] % CODE_ALPHABET.length); if (i === 2) out += '-'; }
    return 'km-' + out;
  }
  function showView(name) {
    $$('.view').forEach(function (v) { v.hidden = v.id !== 'v-' + name; });
    document.body.dataset.view = name;
    if (name !== 'lobby') stopPreview();
  }
  function fieldError(input, errEl, msg) {
    KM.clear(errEl);
    if (msg) errEl.appendChild(KM.icon('alert', 'ic-sm'));
    errEl.appendChild(h('span', { text: msg || '' }));
    errEl.classList.toggle('show', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function validateText(input, errEl, label, showEmpty) {
    var v = input.value.trim();
    var msg = !v ? (showEmpty ? 'Enter ' + label + '.' : '') : '';
    fieldError(input, errEl, msg);
    return !msg;
  }
  function shareUrl(code, title) {
    var base = location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split('#')[0];
    return base + '#lobby?code=' + encodeURIComponent(code) + '&title=' + encodeURIComponent(title);
  }
  function defaultName() {
    var u = KM.auth.get();
    return store(NAME_KEY) || (u ? u.name : '');
  }

  /* ------------------------------------------------------------------ token server */
  var serverCheck = null;
  function checkServer(force) {
    if (force || !serverCheck) {
      serverCheck = location.protocol === 'file:' ? Promise.reject(new Error('file'))
        : fetch('api/status', { cache: 'no-store' }).then(function (r) {
          if (!r.ok) throw new Error('status ' + r.status);
          return r.json();
        }).then(function (j) { if (!j || !j.ok) throw new Error('bad status'); return j.data; });
      serverCheck.catch(function () { /* handled by callers */ });
    }
    return serverCheck;
  }
  function fetchToken(code, name, role) {
    return fetch('api/token', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: code, name: name, role: role })
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'The token service sent an unreadable reply (HTTP ' + r.status + ').' }; });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'The token service refused the request.');
      return j.data;
    });
  }
  function offline() {
    showView('offline');
    var t = $('#offline-title');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
  }

  /* ------------------------------------------------------------------ START */
  var REAL = [
    [true, 'Video, audio and screen share', 'Real LiveKit tracks between everyone with the code.'],
    [true, 'People, speaker and connection', 'Live participant list, active-speaker ring and connection quality.'],
    [true, 'Room chat', 'Sent as LiveKit data messages to everyone in the call.'],
    [false, 'Concierge, dot and agents', 'Shown as labelled tiles; agents stay in sync for everyone.'],
    [false, 'Recording, transcript and summary', 'The notice and timer are shared; no egress or transcription runs.']
  ];
  function renderStart() {
    showView('start');
    var list = $('#real-list');
    if (!list.childNodes.length) {
      REAL.forEach(function (r) {
        list.appendChild(h('li', null,
          h('span', { class: 'mark ' + (r[0] ? 'is-real' : 'is-sim'), 'aria-hidden': 'true' }, KM.icon(r[0] ? 'check' : 'info', 'ic-sm')),
          h('div', { class: 'copy' }, h('strong', { text: r[1] + (r[0] ? ' · live' : ' · simulated') }), h('span', { text: r[2] }))));
      });
    }
    var ti = $('#st-title'), ni = $('#st-name');
    if (!ni.value) ni.value = defaultName();
    if (!ti.value) ti.placeholder = 'Partner onboarding review';
    btnLabel($('#st-go'), 'cam', 'Create room and continue');
    checkServer().catch(offline);
  }
  function bindStart() {
    var ti = $('#st-title'), ni = $('#st-name');
    ti.addEventListener('blur', function () { validateText(ti, $('#st-title-error'), 'a meeting name', false); });
    ni.addEventListener('blur', function () { validateText(ni, $('#st-name-error'), 'your name', false); });
    [ti, ni].forEach(function (i) {
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    });
    $('#start-form').addEventListener('submit', function (e) { e.preventDefault(); go(); });
    $('#st-go').addEventListener('click', go);
    function go() {
      var okT = validateText(ti, $('#st-title-error'), 'a meeting name', true);
      var okN = validateText(ni, $('#st-name-error'), 'your name', true);
      if (!okT) { ti.focus(); return; }
      if (!okN) { ni.focus(); return; }
      store(NAME_KEY, ni.value.trim());
      router.go('lobby?code=' + newCode() + '&title=' + encodeURIComponent(ti.value.trim()) + '&host=1');
    }
  }

  /* ------------------------------------------------------------------ LOBBY: preview */
  function stopPreview() {
    cancelAnimationFrame(pv.raf); pv.raf = 0;
    if (pv.ctx) { pv.ctx.close().catch(function () {}); pv.ctx = null; }
    if (pv.video) { pv.video.stop(); pv.video = null; }
    if (pv.audio) { pv.audio.stop(); pv.audio = null; }
    var box = $('#preview');
    $$('video', box).forEach(function (v) { box.removeChild(v); });
    $('#preview-empty').hidden = false;
    $('#meter').hidden = true;
  }
  function mediaError(err, what) {
    var box = $('#lb-media-error');
    var blocked = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    var missing = err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError');
    KM.clear(box);
    box.appendChild(h('div', { class: 'od-row' }, KM.icon('alert'), h('strong', { text: what + (blocked ? ' access is blocked' : missing ? ' not found' : ' unavailable') })));
    box.appendChild(h('p', { class: 'small', text: blocked
      ? 'Allow it in your browser’s site settings for this page, then turn it on again. You can still join and listen.'
      : missing ? 'Plug one in or pick another device below. You can still join without it.'
        : ((err && err.message) || 'Something went wrong.') + ' You can still join without it.' }));
    box.hidden = false;
  }
  function startMeter(track) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !track || !track.mediaStreamTrack) return;
    pv.ctx = new AC();
    var src = pv.ctx.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));
    var an = pv.ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    var data = new Uint8Array(an.fftSize), fill = $('#meter-fill'), meter = $('#meter .meter-track');
    $('#meter').hidden = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var last = 0;
    (function loop(t) {
      pv.raf = requestAnimationFrame(loop);
      if (reduce && t - last < 250) return;
      last = t;
      an.getByteTimeDomainData(data);
      var peak = 0;
      for (var i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      var level = Math.min(1, peak / 64);
      fill.style.transform = 'scaleX(' + level.toFixed(2) + ')';
      meter.setAttribute('aria-valuenow', String(Math.round(level * 100)));
    })(0);
  }
  function applyPreview() {
    var jobs = [];
    $('#lb-media-error').hidden = true;
    if (pv.cam && !pv.video) {
      jobs.push(LK.createLocalVideoTrack({ deviceId: pv.camDev || undefined, resolution: LK.VideoPresets.h720.resolution }).then(function (t) {
        if (!pv.cam || $('#v-lobby').hidden) { t.stop(); return; }
        pv.video = t;
        var el = t.attach();
        el.setAttribute('aria-label', 'Your camera preview');
        $('#preview').appendChild(el);
        $('#preview-empty').hidden = true;
      }, function (e) { pv.cam = false; mediaError(e, 'Camera'); }));
    }
    if (!pv.cam && pv.video) {
      pv.video.stop(); pv.video = null;
      $$('#preview video').forEach(function (v) { v.parentNode.removeChild(v); });
      $('#preview-empty').hidden = false;
    }
    if (pv.mic && !pv.audio) {
      jobs.push(LK.createLocalAudioTrack({ deviceId: pv.micDev || undefined, echoCancellation: true, noiseSuppression: true }).then(function (t) {
        if (!pv.mic || $('#v-lobby').hidden) { t.stop(); return; }
        pv.audio = t;
        startMeter(t);
      }, function (e) { pv.mic = false; mediaError(e, 'Microphone'); }));
    }
    if (!pv.mic && pv.audio) {
      cancelAnimationFrame(pv.raf); pv.raf = 0;
      if (pv.ctx) { pv.ctx.close().catch(function () {}); pv.ctx = null; }
      pv.audio.stop(); pv.audio = null;
      $('#meter').hidden = true;
    }
    return Promise.all(jobs).then(function () { renderToggles(); return listDevices(); });
  }
  function renderToggles() {
    var m = $('#lb-mic'), c = $('#lb-cam');
    btnLabel(m, pv.mic ? 'mic' : 'mic-off', pv.mic ? 'Mic on' : 'Mic off');
    m.setAttribute('aria-pressed', pv.mic ? 'true' : 'false');
    btnLabel(c, pv.cam ? 'cam' : 'cam-off', pv.cam ? 'Camera on' : 'Camera off');
    c.setAttribute('aria-pressed', pv.cam ? 'true' : 'false');
    $('#preview-msg').textContent = pv.cam ? 'Starting your camera…' : 'Your camera is off. Turn it on to check how you look before you join.';
  }
  function listDevices() {
    return Promise.all([
      LK.Room.getLocalDevices('audioinput', false).catch(function () { return []; }),
      LK.Room.getLocalDevices('videoinput', false).catch(function () { return []; })
    ]).then(function (r) {
      fill($('#lb-mic-dev'), r[0], pv.audio ? pv.audio.mediaStreamTrack.getSettings().deviceId : pv.micDev, 'No microphone found');
      fill($('#lb-cam-dev'), r[1], pv.video ? pv.video.mediaStreamTrack.getSettings().deviceId : pv.camDev, 'No camera found');
    });
    function fill(sel, devs, active, empty) {
      KM.clear(sel);
      if (!devs.length) { sel.appendChild(h('option', { value: '', text: empty })); sel.disabled = true; return; }
      sel.disabled = false;
      devs.forEach(function (d, i) {
        var o = h('option', { value: d.deviceId, text: d.label || (sel.id === 'lb-mic-dev' ? 'Microphone ' : 'Camera ') + (i + 1) + ' (allow access to see names)' });
        if (d.deviceId === active) o.selected = true;
        sel.appendChild(o);
      });
    }
  }

  /* ------------------------------------------------------------------ LOBBY */
  function renderLobby(arg, params) {
    var code = String(params.code || '').trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      KM.toast(code ? 'That join code isn’t valid. Codes look like km-4fq-82x.' : 'Start a meeting or open an invite link to join.', 'alert');
      router.go('start');
      return;
    }
    var title = String(params.title || '').trim().slice(0, 80) || DEFAULT_TITLE;
    lobby = { code: code, title: title, role: params.host === '1' ? 'host' : 'guest' };
    showView('lobby');
    document.title = 'Know Meet — ' + title;
    $('#lobby-title').textContent = title;
    $('#lobby-eyebrow').textContent = lobby.role === 'host' ? 'Your new room · ready to join' : 'You’re invited · ready to join';
    var chips = $('#lobby-chips');
    KM.clear(chips);
    chips.appendChild(h('span', { class: 'chip chip-green' }, h('span', { class: 'pip' }), h('span', { text: 'Live LiveKit room' })));
    chips.appendChild(h('span', { class: 'chip' + (lobby.role === 'host' ? ' chip-ember' : '') }, h('span', { text: lobby.role === 'host' ? 'You’re the host' : 'Guest' })));
    $('#lb-code').textContent = code;
    $('#lb-link').textContent = shareUrl(code, title);
    var name = $('#lb-name');
    if (!name.value) name.value = defaultName();
    fieldError(name, $('#lb-name-error'), '');
    $('#lb-join-error').hidden = true;
    $('#preview-initials').textContent = KM.initials(name.value || '?');
    var privacy = $('#lb-privacy');
    KM.clear(privacy);
    privacy.appendChild(KM.icon('shield', 'ic-sm'));
    privacy.appendChild(h('span', { text: 'Your camera and mic go only to people in this room. Nothing is recorded; chat isn’t stored after the meeting.' }));
    resetJoinBtn();
    renderToggles();
    checkServer().then(function () { return applyPreview(); }, offline);
  }
  function resetJoinBtn() {
    var b = $('#lb-join');
    b.disabled = false;
    b.removeAttribute('aria-busy');
    btnLabel(b, 'chevron-right', 'Join now');
  }
  function bindLobby() {
    var name = $('#lb-name');
    name.addEventListener('input', function () {
      $('#preview-initials').textContent = KM.initials(name.value || '?');
      if (name.getAttribute('aria-invalid') === 'true' && name.value.trim()) fieldError(name, $('#lb-name-error'), '');
    });
    name.addEventListener('blur', function () { validateText(name, $('#lb-name-error'), 'your name', false); });
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); joinNow(); } });
    $('#lb-form').addEventListener('submit', function (e) { e.preventDefault(); joinNow(); });
    $('#lb-mic').addEventListener('click', function () { pv.mic = !pv.mic; renderToggles(); applyPreview(); });
    $('#lb-cam').addEventListener('click', function () { pv.cam = !pv.cam; renderToggles(); applyPreview(); });
    $('#lb-mic-dev').addEventListener('change', function () {
      pv.micDev = this.value;
      if (pv.audio) pv.audio.restartTrack({ deviceId: pv.micDev }).catch(function (e) { mediaError(e, 'Microphone'); });
    });
    $('#lb-cam-dev').addEventListener('change', function () {
      pv.camDev = this.value;
      if (pv.video) pv.video.restartTrack({ deviceId: pv.camDev }).catch(function (e) { mediaError(e, 'Camera'); });
    });
    KM.setIcon($('#lb-copy-code'), 'copy');
    KM.setIcon($('#lb-copy-link'), 'copy');
    $('#lb-copy-code').addEventListener('click', function () { KM.copy(lobby.code); });
    $('#lb-copy-link').addEventListener('click', function () { KM.copy(shareUrl(lobby.code, lobby.title)); });
    $('#lb-join').addEventListener('click', joinNow);
  }
  function joinError(msg) {
    var box = $('#lb-join-error');
    KM.clear(box);
    box.appendChild(h('div', { class: 'od-row' }, KM.icon('alert'), h('strong', { text: 'Couldn’t join the room' })));
    box.appendChild(h('p', { class: 'small', text: msg }));
    box.hidden = false;
    resetJoinBtn();
  }
  function joinNow() {
    var name = $('#lb-name'), btn = $('#lb-join');
    if (btn.disabled) return;
    if (!validateText(name, $('#lb-name-error'), 'your name', true)) { name.focus(); return; }
    var who = name.value.trim().slice(0, 60);
    store(NAME_KEY, who);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btnLabel(btn, null, 'Joining…');
    $('#lb-join-error').hidden = true;
    var cfg = { mic: pv.mic, cam: pv.cam, micDev: pv.micDev, camDev: pv.camDev };
    fetchToken(lobby.code, who, lobby.role).then(function (tok) {
      stopPreview();
      showView('room');
      return KML.room.join({
        url: tok.url, token: tok.token, code: lobby.code, title: lobby.title, role: lobby.role, name: who,
        mic: cfg.mic, cam: cfg.cam, micDev: cfg.micDev, camDev: cfg.camDev,
        shareUrl: shareUrl(lobby.code, lobby.title),
        onEnd: function (data) { saveLast(data); router.go('ended'); }
      }).then(function () { var t = $('#room-title'); if (t) t.focus(); });
    }).catch(function (err) {
      showView('lobby');
      renderToggles();
      applyPreview();
      var msg = (err && err.message) || 'Unknown error.';
      if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) msg = 'The local token service didn’t answer. Is ./live/start.sh still running?';
      else if (/401|unauthori[sz]ed|invalid token|signature/i.test(msg)) msg = 'LiveKit rejected the token. Check that LIVEKIT_API_KEY and LIVEKIT_API_SECRET belong to the project at LIVEKIT_URL. (' + msg + ')';
      else msg = 'LiveKit said: ' + msg + ' Check LIVEKIT_URL and your network, then try again.';
      joinError(msg);
    });
  }

  /* ------------------------------------------------------------------ ENDED */
  var REASONS = {
    'left': 'You left the meeting',
    'ended-all': 'You ended the meeting for everyone',
    'ended-by-host': 'The meeting was ended',
    'disconnected': 'You were disconnected'
  };
  function stat(num, lbl) { return h('div', { class: 'stat' }, h('span', { class: 'num', text: num }), h('span', { class: 'lbl', text: lbl })); }
  function renderEnded() {
    showView('ended');
    var d = readLast();
    var people = $('#ended-people'), chat = $('#ended-chat'), stats = $('#ended-stats'), notes = $('#ended-notes'), pipe = $('#ended-pipe'), deliv = $('#ended-deliv');
    [people, chat, stats, notes, pipe, deliv].forEach(KM.clear);
    if (!d) {
      $('#ended-eyebrow').textContent = 'No recent meeting';
      $('#ended-title').textContent = 'Nothing to summarize yet';
      $('#ended-lede').textContent = 'Join a meeting in this tab and its summary shows up here when you leave.';
      chat.appendChild(h('p', { class: 'empty-line', text: 'No chat to show.' }));
      $('#ended-rejoin').hidden = true;
      return;
    }
    var ms = Math.max(0, d.endedAt - d.joinedAt);
    var names = d.attendees.map(function (a) { return a.me ? a.name + ' (you)' : a.name; });
    document.title = 'Know Meet — ' + d.title + ' · ended';
    $('#ended-eyebrow').textContent = d.reason === 'ended-by-host' && d.endedBy ? d.endedBy + ' ended the meeting' : (REASONS[d.reason] || 'Meeting ended');
    $('#ended-title').textContent = d.title;
    $('#ended-lede').textContent = KM.fmt.date(d.joinedAt) + '. You were in the live room for ' + KM.fmt.dur(ms) + ' with ' + d.attendees.length + (d.attendees.length === 1 ? ' person' : ' people') + ' in total.';
    stats.appendChild(stat(KM.fmt.dur(ms), 'Your time in the room'));
    stats.appendChild(stat(String(d.attendees.length), d.attendees.length === 1 ? 'Person' : 'People'));
    stats.appendChild(stat(String(d.chat.length), d.chat.length === 1 ? 'Chat message' : 'Chat messages'));
    stats.appendChild(stat(String(d.agents.length), 'Agents · simulated'));

    d.attendees.forEach(function (a) {
      people.appendChild(h('span', { class: 'person-chip' },
        h('span', { class: 'mini', 'aria-hidden': 'true', text: KM.initials(a.name) }),
        h('span', { text: (a.me ? a.name + ' (you)' : a.name) + (a.host ? ' · host' : '') })));
    });
    d.agents.concat(['Concierge']).forEach(function (n) {
      people.appendChild(h('span', { class: 'person-chip' },
        h('span', { class: 'mini ' + (n === 'Concierge' ? 'sys-mini' : 'agent-mini'), 'aria-hidden': 'true', text: n.slice(0, 2).toUpperCase() }),
        h('span', { text: n + ' · simulated' })));
    });

    if (!d.chat.length) chat.appendChild(h('p', { class: 'empty-line', text: 'Nobody used the room chat in this meeting.' }));
    d.chat.forEach(function (m) {
      chat.appendChild(h('div', { class: 'chat-msg' + (m.me ? ' is-me' : '') },
        h('span', { class: 'who' }, h('span', { text: m.me ? 'You' : m.name }), h('span', { class: 'when', text: KM.fmt.time(m.ts) })),
        h('span', { class: 'text', text: m.text })));
    });

    // Sample summary: structure is the product's, names come from the real attendee list.
    var owners = d.attendees.map(function (a) { return a.name; });
    var owner = function (i) { return owners[i % owners.length] || d.name; };
    notes.appendChild(h('h3', { text: 'Summary' }));
    notes.appendChild(h('p', { text: 'Placeholder: in production the Scribe writes a short summary of what ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0] || 'the group') + ' discussed, from the live transcript.' }));
    notes.appendChild(h('h3', { text: 'Action items' }));
    notes.appendChild(h('ul', null,
      h('li', null, h('span', { text: 'Placeholder action item from the transcript ' }), h('span', { class: 'owner', text: '— ' + owner(0) })),
      h('li', null, h('span', { text: 'Placeholder follow-up with a due date ' }), h('span', { class: 'owner', text: '— ' + owner(1) }))));

    var recorded = d.recordedMs > 0;
    [
      ['1', recorded ? 'done' : 'skipped', 'Recording finalized to S3', recorded ? 'Room Composite MP4, ' + KM.fmt.dur(d.recordedMs) + ' (simulated)' : 'Nobody started recording, so there’s nothing to store.'],
      ['2', recorded ? 'done' : 'skipped', 'Pinned to IPFS', recorded ? 'CID kept with the transcript (simulated)' : 'Skipped: no recording.'],
      ['3', 'done', 'Summary and action items written', 'Sample shown on the left (simulated)'],
      ['4', 'done', 'Sent to every participant', 'Per each person’s delivery settings (simulated)']
    ].forEach(function (s) {
      pipe.appendChild(h('div', { class: 'pipe-step', dataset: { status: s[1] } },
        h('span', { class: 'pipe-mark', 'aria-hidden': 'true' }, s[1] === 'done' ? KM.icon('check', 'ic-sm') : s[0]),
        h('div', { class: 'pipe-body' }, h('h3', { text: s[2] }), h('p', { class: 'pipe-detail', text: s[3] })),
        h('span', { class: 'pipe-time', text: s[1] === 'done' ? 'Done' : 'Skipped' })));
    });
    d.attendees.forEach(function (a) {
      deliv.appendChild(h('div', { class: 'deliv-row' },
        h('div', { class: 'who' }, h('strong', { text: a.me ? a.name + ' (you)' : a.name }), h('span', { text: a.host ? 'Host' : 'Guest' })),
        h('span', { class: 'chip' }, KM.icon('mail', 'ic-sm'), h('span', { text: 'Email' })),
        h('span', { class: 'chip chip-amber', text: 'Simulated' })));
    });

    var re = $('#ended-rejoin');
    re.hidden = false;
    re.setAttribute('href', 'room.html#lobby?code=' + encodeURIComponent(d.code) + '&title=' + encodeURIComponent(d.title) + (d.role === 'host' ? '&host=1' : ''));
  }

  /* ------------------------------------------------------------------ boot */
  KM.ready(function () {
    if (!LK || !KML || !KML.room) {
      document.body.appendChild(h('p', { class: 'page', text: 'The LiveKit client didn’t load. Check that assets/vendor/livekit-client.umd.js exists.' }));
      return;
    }
    KM.mountAppBar($('#appbar'), { active: 'home' });
    hydrateIcons(document);
    bindStart();
    bindLobby();
    $('#offline-retry').addEventListener('click', function () {
      checkServer(true).then(function () { router.refresh(); }, function () { KM.toast('Still no answer from the token service.', 'alert'); });
    });
    // While a call is live, hash changes (Back button, edited URL) must not hide the room.
    function guard(fn) {
      return function (arg, params) {
        if (KML.room.isActive()) { showView('room'); KM.toast('You’re still in the meeting. Use Leave to exit.', 'info'); return; }
        fn(arg, params);
      };
    }
    router = KM.route({
      start: guard(function () { renderStart(); }),
      lobby: guard(function (arg, params) { renderLobby(arg, params); }),
      ended: guard(function () { renderEnded(); })
    }, 'start');
  });
})(window, document, window.KM, window.LivekitClient);
