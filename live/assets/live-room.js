/* ==========================================================================
   Know Meet Live — the meeting room engine.
   Real (LiveKit): connection, camera, mic, screen share, active speaker,
   connection quality, participants, room chat (data messages), end-for-all.
   Simulated, and labelled so in the UI: Concierge, dot, registered agents,
   recording. Agent and recording state is shared with everyone in the room
   over LiveKit data messages so all participants see the same simulation.
   Exposes window.KML.room.join(cfg). Depends on KM (km.js) and LivekitClient.
   ========================================================================== */
(function (window, document, KM, LK) {
  'use strict';

  var h = KM.h, $ = KM.$, $$ = KM.$$;
  var KML = window.KML = window.KML || {};

  var CHAT_TOPIC = 'km-chat';
  var CTRL_TOPIC = 'km-ctrl';
  var CAPTION_MS = 2600;
  var END_GRACE_MS = 350;
  var TYPING_MS = 650;
  var CHAT_MAX = 500;

  var AGENTS = [
    { id: 'scribe', glyph: 'SC', name: 'Scribe', role: 'Notes, decisions, action items', worker: 'km-agent-scribe' },
    { id: 'researcher', glyph: 'RS', name: 'Researcher', role: 'Cited answers from meeting knowledge', worker: 'km-agent-researcher' },
    { id: 'facilitator', glyph: 'FA', name: 'Facilitator', role: 'Agenda and time boxes', worker: 'km-agent-facilitator' },
    { id: 'translator', glyph: 'TR', name: 'Translator', role: 'Live speech and captions', worker: 'km-agent-translator' }
  ];
  function agentById(id) { return AGENTS.filter(function (a) { return a.id === id; })[0]; }

  var S = null; // live session state; null when not in a room

  /* ------------------------------------------------------------------ helpers */
  function now() { return Date.now(); }
  function clock(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (hh ? hh + ':' + p(mm) : p(mm)) + ':' + p(ss);
  }
  function meta(p) { try { return JSON.parse(p.metadata || '{}') || {}; } catch (_) { return {}; } }
  function pname(p) { return p.name || p.identity; }
  function isHost(p) { return meta(p).role === 'host'; }
  function ctlSet(btn, iconName, label) {
    var old = btn.querySelector('svg.ic');
    if (old) old.parentNode.removeChild(old);
    btn.insertBefore(KM.icon(iconName), btn.firstChild);
    var l = btn.querySelector('.ctl-label');
    if (l) l.textContent = label;
  }
  function people() {
    if (!S || !S.room) return [];
    var list = [S.room.localParticipant];
    S.room.remoteParticipants.forEach(function (p) { list.push(p); });
    return list;
  }
  function signedIn() { return KM.auth.isSignedIn(); }
  function encode(obj) { return new TextEncoder().encode(JSON.stringify(obj)); }

  function send(topic, obj, to) {
    if (!S || !S.room || S.room.state !== 'connected') return Promise.resolve(false);
    var opts = { reliable: true, topic: topic };
    if (to) opts.destinationIdentities = to;
    return S.room.localParticipant.publishData(encode(obj), opts).then(function () { return true; }, function (err) {
      if (window.console) console.error('[know-meet] publishData failed', err);
      return false;
    });
  }

  /* ------------------------------------------------------------------ attendees log (feeds the summary) */
  function noteAttendee(p) {
    var id = p.identity, rec = S.attendees[id];
    if (!rec) rec = S.attendees[id] = { name: pname(p), host: isHost(p), me: p === S.room.localParticipant, joinedAt: now(), leftAt: null };
    rec.leftAt = null;
  }

  /* ------------------------------------------------------------------ captions (Concierge, simulated) */
  function say(text, who) {
    $('#cap-who').textContent = (who || 'Concierge') + ' · simulated';
    $('#cap-who').classList.add('is-agent');
    $('#cap-text').textContent = text;
    S.conciergeTalking = true;
    renderGrid();
    clearTimeout(S.capTimer);
    S.capTimer = setTimeout(function () { if (!S) return; S.conciergeTalking = false; renderGrid(); }, CAPTION_MS);
  }

  /* ------------------------------------------------------------------ tiles */
  function makePersonTile(key) {
    var video = h('video', { autoplay: true, playsinline: true, 'aria-hidden': 'true' });
    video.muted = true;
    var avatar = h('div', { class: 'avatar', 'aria-hidden': 'true' });
    var el = h('div', { class: 'tile', dataset: { key: key }, role: 'group' },
      h('div', { class: 'tile-head' }, h('div', { class: 'od-fill tile-tags' }), h('span', { class: 'q-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))),
      h('div', { class: 'tile-media' }, video, avatar),
      h('div', { class: 'tile-foot' }, h('span', { class: 'muted-badge', hidden: true }, KM.icon('mic-off', 'ic-sm')), h('span', { class: 'tile-name od-truncate od-fill' })));
    return { el: el, video: video, avatar: avatar, attached: null };
  }

  function updatePersonTile(t, p, source) {
    var isLocal = p === S.room.localParticipant;
    var isShare = source === LK.Track.Source.ScreenShare;
    var pub = p.getTrackPublication(source);
    var track = pub && pub.track;
    var videoOn = !!(track && !pub.isMuted);
    if (t.attached && t.attached !== track) { t.attached.detach(t.video); t.attached = null; }
    if (videoOn && t.attached !== track) { track.attach(t.video); t.attached = track; }
    if (!videoOn && t.attached) { t.attached.detach(t.video); t.attached = null; }
    t.video.hidden = !videoOn;
    t.video.classList.toggle('mirror', isLocal && !isShare);
    t.avatar.hidden = videoOn;
    t.avatar.textContent = KM.initials(pname(p));

    var el = t.el;
    el.className = 'tile' + (videoOn ? ' tile--video' : '') + (isLocal && !isShare ? ' tile--self' : '') + (isShare ? ' share-tile' : '');
    el.setAttribute('aria-label', isShare ? pname(p) + ' is sharing their screen' : pname(p) + (isLocal ? ' (you)' : ''));
    var tags = el.querySelector('.tile-tags');
    KM.clear(tags);
    if (isShare) tags.appendChild(h('span', { class: 'tile-tag' }, KM.icon('screen', 'ic-sm'), h('span', { text: 'Screen' })));
    else if (isHost(p)) tags.appendChild(h('span', { class: 'tile-tag is-host', text: 'Host' }));
    var q = el.querySelector('.q-bars');
    q.hidden = isShare;
    q.dataset.q = p.connectionQuality || 'unknown';
    q.setAttribute('title', 'Connection: ' + (p.connectionQuality || 'unknown'));
    var micPub = p.getTrackPublication(LK.Track.Source.Microphone);
    var micOn = !!(micPub && micPub.track && !micPub.isMuted);
    el.querySelector('.muted-badge').hidden = isShare || micOn;
    el.querySelector('.tile-name').textContent = isShare ? pname(p) + ' is presenting' : pname(p);
    el.dataset.speaking = !isShare && p.isSpeaking ? 'true' : 'false';
  }

  function makeAgentTile(key, a, kind) {
    var removable = kind === 'agent';
    var el = h('div', { class: 'tile tile--' + kind, dataset: { key: key }, role: 'group', 'aria-label': a.name + ', simulated agent' },
      h('div', { class: 'tile-head' },
        h('div', { class: 'od-fill tile-tags' }, h('span', { class: 'tile-tag is-sim', text: 'Simulated' })),
        removable ? h('button', { class: 'icon-btn tile-remove', type: 'button', 'aria-label': 'Remove ' + a.name, dataset: { remove: a.id } }, KM.icon('x', 'ic-sm')) : null),
      h('div', { class: 'tile-media' },
        h('div', { class: 'dot-body' },
          h('div', { class: 'agent-face', 'aria-hidden': 'true', text: a.glyph || '' }),
          h('span', { class: 'agent-role', text: a.role }),
          h('div', { class: 'bars', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'), h('span'), h('span')))),
      h('div', { class: 'tile-foot' }, h('span', { class: 'tile-name od-truncate od-fill', text: a.name })));
    return { el: el, agent: true };
  }

  function wantedTiles() {
    var list = [];
    people().forEach(function (p) {
      if (p.isScreenShareEnabled || p.getTrackPublication(LK.Track.Source.ScreenShare)) {
        var sp = p.getTrackPublication(LK.Track.Source.ScreenShare);
        if (sp && sp.track) list.push({ key: 'share:' + p.identity, p: p, source: LK.Track.Source.ScreenShare });
      }
    });
    people().forEach(function (p) { list.push({ key: 'p:' + p.identity, p: p, source: LK.Track.Source.Camera }); });
    list.push({ key: 'a:concierge', kind: 'system', a: { id: 'concierge', glyph: 'CG', name: 'Concierge', role: 'System agent · in every room' } });
    if (signedIn()) list.push({ key: 'a:dot', kind: 'dot', a: { id: 'dot', glyph: '', name: 'Iris · your dot', role: 'Private memory · only you see its notes' } });
    S.agents.forEach(function (id) { var a = agentById(id); if (a) list.push({ key: 'a:' + id, kind: 'agent', a: a }); });
    return list;
  }

  function renderGrid() {
    if (!S || !S.room) return;
    var grid = $('#grid'), want = wantedTiles(), seen = {};
    want.forEach(function (w) {
      seen[w.key] = true;
      var t = S.tiles[w.key];
      if (!t) t = S.tiles[w.key] = w.p ? makePersonTile(w.key) : makeAgentTile(w.key, w.a, w.kind);
      if (w.p) updatePersonTile(t, w.p, w.source);
      else {
        var talking = w.kind === 'system' ? S.conciergeTalking : false;
        t.el.dataset.state = talking ? 'speaking' : 'idle';
        t.el.dataset.speaking = talking ? 'true' : 'false';
      }
      grid.appendChild(t.el);
    });
    Object.keys(S.tiles).forEach(function (k) {
      if (seen[k]) return;
      var t = S.tiles[k];
      if (t.attached) t.attached.detach(t.video);
      if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
      delete S.tiles[k];
    });
    var n = want.filter(function (w) { return w.key.indexOf('share:') !== 0; }).length;
    var cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
    if (window.matchMedia('(max-width: 480px)').matches) cols = 1;
    else if (window.matchMedia('(max-width: 767px)').matches) cols = Math.min(cols, 2);
    grid.style.setProperty('--cols', cols);
    renderMeta();
    if (S.panel === 'people') renderPeople();
  }

  function onSpeakers(speakers) {
    var ids = {};
    speakers.forEach(function (p) { ids[p.identity] = true; });
    Object.keys(S.tiles).forEach(function (k) {
      if (k.indexOf('p:') !== 0) return;
      S.tiles[k].el.dataset.speaking = ids[k.slice(2)] ? 'true' : 'false';
    });
  }

  /* ------------------------------------------------------------------ head, clock, connection */
  function renderMeta() {
    var n = people().length;
    $('#room-meta').textContent = S.code + ' · ' + n + (n === 1 ? ' person' : ' people') + ' in the call';
    var badge = $('#people-badge');
    badge.textContent = String(n);
  }
  function setConn(state) {
    var labels = { connecting: 'Connecting…', connected: 'Live', reconnecting: 'Reconnecting…', disconnected: 'Disconnected' };
    var chip = $('#conn-chip');
    chip.dataset.state = state;
    KM.clear(chip);
    chip.appendChild(h('span', { class: 'pip', 'aria-hidden': 'true' }));
    chip.appendChild(h('span', { class: 'txt', text: labels[state] || state }));
  }
  function tick() {
    if (!S) return;
    $('#clock').textContent = clock(now() - S.joinedAt);
    if (S.rec.on) $('#rec-time').textContent = clock(now() - S.rec.startedAt);
  }

  /* ------------------------------------------------------------------ controls */
  function renderControls() {
    var lp = S.room.localParticipant;
    var mic = lp.isMicrophoneEnabled, cam = lp.isCameraEnabled, share = lp.isScreenShareEnabled;
    var bm = $('#ctl-mic'), bc = $('#ctl-cam'), bs = $('#ctl-share'), br = $('#ctl-rec');
    ctlSet(bm, mic ? 'mic' : 'mic-off', mic ? 'Mute' : 'Unmute');
    bm.classList.toggle('is-off', !mic);
    ctlSet(bc, cam ? 'cam' : 'cam-off', cam ? 'Stop video' : 'Start video');
    bc.classList.toggle('is-off', !cam);
    ctlSet(bs, 'screen', share ? 'Stop share' : 'Share');
    bs.setAttribute('aria-pressed', share ? 'true' : 'false');
    ctlSet(br, S.rec.on ? 'stop' : 'record', S.rec.on ? 'Stop rec' : 'Record');
    br.classList.toggle('is-rec', S.rec.on);
    var lock = br.querySelector('.ctl-lock');
    if (!signedIn() && !lock) br.appendChild(h('span', { class: 'ctl-lock', 'aria-hidden': 'true' }, KM.icon('lock')));
    if (signedIn() && lock) lock.parentNode.removeChild(lock);
    var ba = $('#ctl-agents'), alock = ba.querySelector('.ctl-lock');
    if (!signedIn() && !alock) ba.appendChild(h('span', { class: 'ctl-lock', 'aria-hidden': 'true' }, KM.icon('lock')));
    if (signedIn() && alock) alock.parentNode.removeChild(alock);
  }

  function guarded(btn, fn) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    Promise.resolve().then(fn).catch(function (err) {
      var name = err && err.name;
      if (name === 'NotAllowedError' && btn.id === 'ctl-share') return; // user cancelled the picker
      KM.toast(name === 'NotAllowedError' ? 'Your browser blocked access. Allow it in site settings and try again.'
        : 'That didn’t work: ' + ((err && err.message) || 'unknown error'), 'alert');
    }).then(function () { btn.removeAttribute('aria-busy'); if (S) { renderControls(); renderGrid(); } });
  }

  /* ------------------------------------------------------------------ recording (simulated, shared) */
  function setRec(on, by, broadcast) {
    S.rec.on = on;
    S.rec.startedAt = on ? (S.rec.startedAt || now()) : 0;
    if (on && !S.rec.firstAt) S.rec.firstAt = now();
    if (!on && S.rec.firstAt) { S.rec.totalMs += now() - S.rec.firstAt; S.rec.firstAt = 0; }
    $('#rec-ind').hidden = !on;
    $('#rec-banner').hidden = !on;
    if (on) say((by ? by + ' started recording. ' : 'Recording started. ') + 'Everyone in the room can see the notice.');
    else say('Recording stopped.');
    chatSys(on ? (by || 'Someone') + ' started recording (simulated)' : 'Recording stopped (simulated)');
    if (broadcast) send(CTRL_TOPIC, { type: 'rec', on: on, by: S.name });
    renderControls();
    tick();
  }
  function recClick() {
    if (!signedIn()) { KM.toast('Recording needs sign-in. Guests get the Concierge and live transcription.', 'lock'); return; }
    if (S.rec.on) { setRec(false, S.name, true); return; }
    var list = $('#consent-list');
    KM.clear(list);
    [['users', 'Everyone sees a notice', 'A banner and a REC badge appear for every participant as soon as you start.'],
      ['film', 'One combined video', 'In production, LiveKit Room Composite egress records everyone in one layout as MP4 or HLS.'],
      ['info', 'Simulated in this build', 'No egress job runs and nothing is stored. The timer and notice are real for everyone in the room.']]
      .forEach(function (r) {
        list.appendChild(h('div', { class: 'consent-item' },
          h('span', { class: 'opt-icon' }, KM.icon(r[0])),
          h('div', { class: 'copy' }, h('strong', { text: r[1] }), h('span', { text: r[2] }))));
      });
    S.dlg.consent.open();
  }

  /* ------------------------------------------------------------------ agents (simulated, shared) */
  function setAgents(ids, by, broadcast) {
    var before = S.agents.slice();
    S.agents = ids.filter(function (id) { return !!agentById(id); });
    S.agents.forEach(function (id) {
      if (before.indexOf(id) === -1) { var a = agentById(id); say(a.name + ' joined' + (by ? ' at ' + by + '’s request' : '') + '. It’s simulated in this build.'); chatSys(a.name + ' joined (simulated)'); }
    });
    before.forEach(function (id) {
      if (S.agents.indexOf(id) === -1) { var a = agentById(id); chatSys(a.name + ' left (simulated)'); }
    });
    if (broadcast) send(CTRL_TOPIC, { type: 'agents', ids: S.agents, by: S.name });
    renderGrid();
    if (S.dlg.agents.isOpen) renderAgentList();
  }
  function renderAgentList() {
    var body = $('#agent-list');
    KM.clear(body);
    if (!signedIn()) {
      body.appendChild(h('div', { class: 'locked-card' },
        h('span', { class: 'lock-hero' }, KM.icon('lock', 'ic-lg')),
        h('strong', { text: 'Registered agents need sign-in' }),
        h('p', { text: 'Guests get the Concierge only. Sign in from a new tab (you stay in this call) and the agents unlock here.' }),
        h('a', { class: 'btn btn-primary', href: KM.signInUrl('room.html'), target: '_blank', rel: 'noopener' }, KM.icon('user'), h('span', { text: 'Sign in in a new tab' }))));
      return;
    }
    AGENTS.forEach(function (a) {
      var inRoom = S.agents.indexOf(a.id) > -1;
      body.appendChild(h('div', { class: 'agent-row' },
        h('span', { class: 'p-glyph', 'aria-hidden': 'true', text: a.glyph }),
        h('div', { class: 'copy' }, h('strong', { text: a.name }), h('span', { class: 'desc', text: a.role }), h('span', { class: 'mono', text: 'worker · ' + a.worker })),
        h('button', { class: 'btn ' + (inRoom ? '' : 'btn-primary'), type: 'button', 'aria-pressed': inRoom ? 'true' : 'false',
          onclick: function () {
            var ids = inRoom ? S.agents.filter(function (x) { return x !== a.id; }) : S.agents.concat([a.id]);
            setAgents(ids, S.name, true);
          } }, KM.icon(inRoom ? 'remove' : 'plus', 'ic-sm'), h('span', { text: inRoom ? 'Remove' : 'Add to room' }))));
    });
  }

  /* ------------------------------------------------------------------ chat (real) */
  function chatSys(text) {
    S.chatLog.push({ sys: true, text: text, ts: now() });
    if (S.panel === 'chat') appendChat(S.chatLog[S.chatLog.length - 1]);
  }
  function appendChat(m) {
    var box = $('#chat-msgs');
    var empty = box.querySelector('.chat-empty');
    if (empty && !m.sys) box.removeChild(empty);
    if (m.sys) box.appendChild(h('span', { class: 'chat-sys', text: m.text + ' · ' + KM.fmt.time(m.ts) }));
    else {
      box.appendChild(h('div', { class: 'chat-msg' + (m.me ? ' is-me' : '') },
        h('span', { class: 'who' }, h('span', { text: m.me ? 'You' : m.name }), h('span', { class: 'when', text: KM.fmt.time(m.ts) })),
        h('span', { class: 'text', text: m.text })));
    }
    var sc = $('#chat-scroll');
    sc.scrollTop = sc.scrollHeight;
  }
  function renderChatAll() {
    var box = $('#chat-msgs');
    KM.clear(box);
    var real = S.chatLog.filter(function (m) { return !m.sys; });
    if (!real.length) box.appendChild(h('div', { class: 'chat-empty' }, h('strong', { text: 'No messages yet' }), h('span', { text: 'Messages go to everyone in the call through LiveKit and aren’t stored after the meeting.' })));
    S.chatLog.forEach(appendChat);
  }
  function onChat(m) {
    S.chatLog.push(m);
    if (S.panel === 'chat') appendChat(m);
    else if (!m.me) {
      S.unread += 1;
      var b = $('#chat-badge');
      b.hidden = false;
      b.textContent = String(S.unread);
      KM.toast(m.name + ': ' + (m.text.length > 60 ? m.text.slice(0, 57) + '…' : m.text), 'chat');
    }
  }
  function sendChat() {
    var input = $('#chat-input'), text = input.value.trim().slice(0, CHAT_MAX);
    if (!text) return;
    var msg = { type: 'chat', text: text, ts: now() };
    send(CHAT_TOPIC, msg).then(function (ok) {
      if (!ok) { KM.toast('Message not sent — you’re not connected. It’s still in the box.', 'alert'); return; }
      input.value = '';
      $('#chat-send').disabled = true;
      onChat({ name: S.name, text: text, ts: msg.ts, me: true });
      input.focus();
    });
  }

  /* ------------------------------------------------------------------ people pane */
  function renderPeople() {
    var real = $('#people-real'), ag = $('#people-agents');
    KM.clear(real); KM.clear(ag);
    people().forEach(function (p) {
      var lp = p === S.room.localParticipant;
      var mic = p.getTrackPublication(LK.Track.Source.Microphone), cam = p.getTrackPublication(LK.Track.Source.Camera);
      var micOn = !!(mic && mic.track && !mic.isMuted), camOn = !!(cam && cam.track && !cam.isMuted);
      var rec = S.attendees[p.identity];
      real.appendChild(h('div', { class: 'p-row' },
        h('span', { class: 'avatar', 'aria-hidden': 'true', text: KM.initials(pname(p)) }),
        h('div', { class: 'copy' }, h('strong', { text: pname(p) + (lp ? ' (you)' : '') }),
          h('span', { text: (isHost(p) ? 'Host' : 'Guest') + (rec ? ' · joined ' + KM.fmt.time(rec.joinedAt) : '') })),
        h('span', { class: 'state' },
          h('span', { class: micOn ? '' : 'is-off', title: micOn ? 'Mic on' : 'Muted' }, KM.icon(micOn ? 'mic' : 'mic-off', 'ic-sm'), h('span', { class: 'sr-only', text: micOn ? 'Mic on' : 'Muted' })),
          h('span', { class: camOn ? '' : 'is-off', title: camOn ? 'Camera on' : 'Camera off' }, KM.icon(camOn ? 'cam' : 'cam-off', 'ic-sm'), h('span', { class: 'sr-only', text: camOn ? 'Camera on' : 'Camera off' })))));
    });
    var agents = [{ glyph: 'CG', name: 'Concierge', role: 'System agent', sys: true }];
    if (signedIn()) agents.push({ glyph: 'IR', name: 'Iris', role: 'Your dot' });
    S.agents.forEach(function (id) { var a = agentById(id); if (a) agents.push(a); });
    agents.forEach(function (a) {
      ag.appendChild(h('div', { class: 'p-row' },
        h('span', { class: 'p-glyph' + (a.sys ? ' is-system' : ''), 'aria-hidden': 'true', text: a.glyph }),
        h('div', { class: 'copy' }, h('strong', { text: a.name }), h('span', { text: a.role })),
        h('span', { class: 'tile-tag is-sim', text: 'Simulated' })));
    });
    $('#rs-title').textContent = people().length + (people().length === 1 ? ' person' : ' people') + ' in the call';
  }

  /* ------------------------------------------------------------------ concierge pane (simulated answers from real facts) */
  var PROMPTS = ['Who’s here?', 'How long have we been talking?', 'What’s been said in chat?', 'What would signing in add?'];
  function answer(q) {
    var t = q.toLowerCase(), ps = people(), names = ps.map(pname);
    if (/who|here|people|attend/.test(t)) return ps.length === 1 ? 'Just you so far. Share code ' + S.code + ' and I’ll greet people as they arrive.' : names.length + ' people are in the call: ' + names.join(', ') + '. Hosts: ' + (ps.filter(isHost).map(pname).join(', ') || 'none marked') + '.';
    if (/long|time|duration|minute/.test(t)) return 'You joined ' + clock(now() - S.joinedAt) + ' ago, at ' + KM.fmt.time(S.joinedAt) + '.';
    if (/chat|said|message/.test(t)) {
      var real = S.chatLog.filter(function (m) { return !m.sys; });
      if (!real.length) return 'Nobody has used the room chat yet.';
      var last = real.slice(-3).map(function (m) { return (m.me ? 'You' : m.name) + ': “' + m.text + '”'; });
      return real.length + ' chat message' + (real.length === 1 ? '' : 's') + ' so far. Latest: ' + last.join(' · ');
    }
    if (/record/.test(t)) return S.rec.on ? 'Recording is on (simulated) and has run for ' + clock(now() - S.rec.startedAt) + '.' : 'Recording is off. A signed-in participant can start it from the Record button; everyone gets a notice.';
    if (/sign|account|guest/.test(t)) return 'Signing in adds your dot, registered agents, uploads to meeting knowledge, recording, and the transcript and summary sent to everyone at close. Guests keep me and live transcription.';
    if (/agent|scribe|research|facilitat|translat/.test(t)) return S.agents.length ? 'Agents here (simulated): ' + S.agents.map(function (id) { return agentById(id).name; }).join(', ') + '.' : 'No registered agents are in the room. ' + (signedIn() ? 'Use Add agent to bring one in.' : 'They need sign-in.');
    return 'In this build I only know what the room tracks: who’s here, how long, the chat, recording and agents. The full Concierge also reads the live transcript and meeting knowledge.';
  }
  function concAsk(q) {
    q = String(q || '').trim();
    if (!q) return;
    var box = $('#conc-msgs'), sc = $('#conc-scroll');
    box.appendChild(h('div', { class: 'msg msg-me' }, h('span', { class: 'bubble', text: q })));
    var typing = h('div', { class: 'typing', 'aria-label': 'Concierge is typing' }, h('i'), h('i'), h('i'));
    box.appendChild(typing);
    sc.scrollTop = sc.scrollHeight;
    setTimeout(function () {
      if (!S) return;
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      box.appendChild(h('div', { class: 'msg' }, h('span', { class: 'msg-who', text: 'Concierge · simulated' }), h('span', { class: 'bubble', text: answer(q) })));
      sc.scrollTop = sc.scrollHeight;
    }, TYPING_MS);
  }

  /* ------------------------------------------------------------------ side panel */
  var PANELS = {
    chat: { btn: '#ctl-chat', eyebrow: 'Room chat · live', title: 'Chat', lede: 'Sent through LiveKit to everyone in the call.', focus: '#chat-input' },
    people: { btn: '#ctl-people', eyebrow: 'People', title: 'In the call', lede: 'Live from the LiveKit room. Agents are simulated.', focus: '#rs-title' },
    concierge: { btn: '#ctl-conc', eyebrow: 'System agent · simulated', title: 'Concierge', lede: 'Ask about the room. Nobody else sees this thread.', focus: '#conc-input' }
  };
  function openPanel(name) {
    var cfg = PANELS[name];
    if (S.panel === name) { closePanel(); return; }
    S.panel = name;
    document.body.dataset.sheetOpen = 'true';
    $$('#rsheet .pane').forEach(function (p) { p.classList.toggle('is-active', p.dataset.pane === name); });
    Object.keys(PANELS).forEach(function (k) { $(PANELS[k].btn).setAttribute('aria-pressed', k === name ? 'true' : 'false'); });
    $('#rs-eyebrow').textContent = cfg.eyebrow;
    $('#rs-title').textContent = cfg.title;
    $('#rs-lede').textContent = cfg.lede;
    if (name === 'chat') { S.unread = 0; $('#chat-badge').hidden = true; renderChatAll(); }
    if (name === 'people') renderPeople();
    setTimeout(function () { var f = $(cfg.focus); if (f) f.focus(); }, 60);
  }
  function closePanel() {
    if (!S.panel) return;
    var btn = $(PANELS[S.panel].btn);
    S.panel = null;
    document.body.dataset.sheetOpen = 'false';
    Object.keys(PANELS).forEach(function (k) { $(PANELS[k].btn).setAttribute('aria-pressed', 'false'); });
    if (btn) btn.focus();
  }

  /* ------------------------------------------------------------------ devices dialog */
  function fillSelect(sel, devices, active, emptyLabel) {
    KM.clear(sel);
    if (!devices.length) { sel.appendChild(h('option', { value: '', text: emptyLabel })); sel.disabled = true; return; }
    sel.disabled = false;
    devices.forEach(function (d, i) {
      var o = h('option', { value: d.deviceId, text: d.label || ('Device ' + (i + 1)) });
      if (d.deviceId === active) o.selected = true;
      sel.appendChild(o);
    });
  }
  function openDevices() {
    Promise.all(['audioinput', 'videoinput', 'audiooutput'].map(function (k) {
      return LK.Room.getLocalDevices(k, false).catch(function () { return []; });
    })).then(function (r) {
      fillSelect($('#dv-mic'), r[0], S.room.getActiveDevice('audioinput'), 'No microphone found');
      fillSelect($('#dv-cam'), r[1], S.room.getActiveDevice('videoinput'), 'No camera found');
      $('#dv-out-field').hidden = !r[2].length;
      fillSelect($('#dv-out'), r[2], S.room.getActiveDevice('audiooutput'), 'Default speaker');
      S.dlg.devices.open();
    });
  }
  function switchDevice(kind, sel) {
    if (!sel.value) return;
    S.room.switchActiveDevice(kind, sel.value).then(function () { KM.toast('Switched to ' + sel.options[sel.selectedIndex].text, 'check'); },
      function (err) { KM.toast('Couldn’t switch device: ' + ((err && err.message) || 'unknown error'), 'alert'); });
  }

  /* ------------------------------------------------------------------ leaving */
  function summary(reason) {
    var endedAt = now();
    if (S.rec.firstAt) { S.rec.totalMs += endedAt - S.rec.firstAt; S.rec.firstAt = 0; }
    return {
      title: S.title, code: S.code, role: S.role, name: S.name, reason: reason, endedBy: S.endedBy || null,
      joinedAt: S.joinedAt, endedAt: endedAt,
      attendees: Object.keys(S.attendees).map(function (k) { var a = S.attendees[k]; return { name: a.name, host: a.host, me: a.me, joinedAt: a.joinedAt }; }),
      chat: S.chatLog.filter(function (m) { return !m.sys; }).map(function (m) { return { name: m.name, text: m.text, ts: m.ts, me: !!m.me }; }),
      agents: S.agents.map(function (id) { return agentById(id).name; }),
      recordedMs: S.rec.totalMs
    };
  }
  function teardown(reason) {
    if (!S || S.closing) return;
    S.closing = true;
    var data = summary(reason), done = S.onEnd, room = S.room;
    clearInterval(S.tickTimer); clearTimeout(S.capTimer);
    window.removeEventListener('resize', S.onResize);
    document.removeEventListener('keydown', S.onKey);
    S.offAuth();
    Object.keys(S.tiles).forEach(function (k) { var t = S.tiles[k]; if (t.attached) t.attached.detach(t.video); });
    KM.clear($('#grid')); KM.clear($('#audio-sink'));
    document.body.dataset.sheetOpen = 'false';
    S = null;
    if (room && room.state !== 'disconnected') room.disconnect().catch(function () {});
    if (done) done(data);
  }
  function leave() { S.dlg.leave.close(); teardown('left'); }
  function endAll() {
    S.dlg.leave.close();
    send(CTRL_TOPIC, { type: 'end', by: S.name }).then(function () { setTimeout(function () { teardown('ended-all'); }, END_GRACE_MS); });
  }

  /* ------------------------------------------------------------------ data messages */
  function onData(payload, participant, kind, topic) {
    if (!S || !participant) return;
    var msg;
    try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch (_) { return; }
    if (!msg || typeof msg !== 'object') return;
    var from = pname(participant);
    if (topic === CHAT_TOPIC && msg.type === 'chat' && typeof msg.text === 'string') {
      onChat({ name: from, text: msg.text.slice(0, CHAT_MAX), ts: Number(msg.ts) || now(), me: false });
    } else if (topic === CTRL_TOPIC) {
      if (msg.type === 'end') { S.endedBy = from; teardown('ended-by-host'); }
      else if (msg.type === 'rec' && !!msg.on !== S.rec.on) setRec(!!msg.on, from, false);
      else if (msg.type === 'agents' && Object.prototype.toString.call(msg.ids) === '[object Array]') setAgents(msg.ids.map(String), from, false);
      else if (msg.type === 'sync') {
        if (Object.prototype.toString.call(msg.ids) === '[object Array]' && msg.ids.join() !== S.agents.join()) setAgents(msg.ids.map(String), null, false);
        if (!!msg.rec !== S.rec.on) setRec(!!msg.rec, from, false);
      }
    }
  }

  /* ------------------------------------------------------------------ wiring */
  function wire(room) {
    var E = LK.RoomEvent;
    room
      .on(E.ParticipantConnected, function (p) {
        noteAttendee(p);
        chatSys(pname(p) + ' joined');
        say('Welcome, ' + pname(p) + '. ' + people().length + ' people are here now.');
        if (S.agents.length || S.rec.on) send(CTRL_TOPIC, { type: 'sync', ids: S.agents, rec: S.rec.on }, [p.identity]);
        renderGrid();
      })
      .on(E.ParticipantDisconnected, function (p) {
        if (S.attendees[p.identity]) S.attendees[p.identity].leftAt = now();
        chatSys(pname(p) + ' left');
        say(pname(p) + ' left the call.');
        renderGrid();
      })
      .on(E.TrackSubscribed, function (track) {
        if (track.kind === 'audio') { var el = track.attach(); el.dataset.sid = track.sid || ''; $('#audio-sink').appendChild(el); }
        renderGrid();
      })
      .on(E.TrackUnsubscribed, function (track) {
        if (track.kind === 'audio') track.detach().forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
        renderGrid();
      })
      .on(E.TrackMuted, renderAll).on(E.TrackUnmuted, renderAll)
      .on(E.TrackPublished, renderAll).on(E.TrackUnpublished, renderAll)
      .on(E.LocalTrackPublished, renderAll).on(E.LocalTrackUnpublished, renderAll)
      .on(E.ActiveSpeakersChanged, onSpeakers)
      .on(E.ConnectionQualityChanged, function (q, p) {
        var t = S && S.tiles['p:' + p.identity];
        if (t) { var b = t.el.querySelector('.q-bars'); b.dataset.q = q; b.setAttribute('title', 'Connection: ' + q); }
      })
      .on(E.DataReceived, onData)
      .on(E.Reconnecting, function () { setConn('reconnecting'); KM.toast('Connection dropped — reconnecting…', 'alert'); })
      .on(E.Reconnected, function () { setConn('connected'); KM.toast('Reconnected', 'check'); })
      .on(E.AudioPlaybackStatusChanged, function () { $('#audio-banner').hidden = room.canPlaybackAudio; })
      .on(E.MediaDevicesError, function (e) { KM.toast('Camera or mic problem: ' + ((e && e.message) || 'device unavailable'), 'alert'); })
      .on(E.Disconnected, function () { if (S && !S.closing) teardown('disconnected'); });
  }
  function renderAll() { if (S) { renderGrid(); renderControls(); } }

  function bindUi() {
    var room = S.room, lp = room.localParticipant;
    $('#ctl-mic').onclick = function () { guarded(this, function () { return lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled); }); };
    $('#ctl-cam').onclick = function () { guarded(this, function () { return lp.setCameraEnabled(!lp.isCameraEnabled); }); };
    $('#ctl-share').onclick = function () { guarded(this, function () { return lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true }); }); };
    $('#ctl-rec').onclick = recClick;
    $('#ctl-chat').onclick = function () { openPanel('chat'); };
    $('#ctl-people').onclick = function () { openPanel('people'); };
    $('#ctl-conc').onclick = function () { openPanel('concierge'); };
    $('#ctl-agents').onclick = function () { renderAgentList(); S.dlg.agents.open(); };
    $('#ctl-leave').onclick = function () {
      var host = S.role === 'host';
      $('#end-go').hidden = !host;
      $('#leave-sub').textContent = host ? 'You’re the host. Leave and the room stays open, or end it for everyone.' : 'The room stays open for everyone else.';
      S.dlg.leave.open();
    };
    $('#leave-go').onclick = leave;
    $('#end-go').onclick = endAll;
    $('#consent-go').onclick = function () { S.dlg.consent.close(); setRec(true, S.name, true); };
    $('#rs-close').onclick = closePanel;
    $('#room-settings').onclick = openDevices;
    $('#dv-mic').onchange = function () { switchDevice('audioinput', this); };
    $('#dv-cam').onchange = function () { switchDevice('videoinput', this); };
    $('#dv-out').onchange = function () { switchDevice('audiooutput', this); };
    $('#audio-start').onclick = function () { room.startAudio().then(function () { $('#audio-banner').hidden = true; }); };
    $('#people-copy').onclick = function () { KM.copy(S.shareUrl); };
    $('#grid').onclick = function (e) {
      var b = e.target.closest('[data-remove]');
      if (!b) return;
      if (!signedIn()) { KM.toast('Removing agents needs sign-in.', 'lock'); return; }
      var id = b.dataset.remove;
      setAgents(S.agents.filter(function (x) { return x !== id; }), S.name, true);
      $('#ctl-agents').focus();
    };
    var ci = $('#chat-input');
    ci.oninput = function () { $('#chat-send').disabled = !ci.value.trim(); };
    ci.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendChat(); } };
    $('#chat-send').onclick = sendChat;
    var qi = $('#conc-input');
    qi.oninput = function () { $('#conc-send').disabled = !qi.value.trim(); };
    function ask() { var v = qi.value; qi.value = ''; $('#conc-send').disabled = true; concAsk(v); qi.focus(); }
    qi.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(); } };
    $('#conc-send').onclick = ask;
    var pr = $('#conc-prompts');
    KM.clear(pr);
    PROMPTS.forEach(function (p) { pr.appendChild(h('button', { class: 'prompt', type: 'button', text: p, onclick: function () { concAsk(p); } })); });
    KM.clear($('#conc-msgs'));
    KM.clear($('#chat-msgs'));
    S.onKey = function (e) { if (e.key === 'Escape' && S.panel && !document.querySelector('dialog[open]')) closePanel(); };
    document.addEventListener('keydown', S.onKey);
    S.onResize = function () { renderGrid(); };
    window.addEventListener('resize', S.onResize);
    S.offAuth = KM.auth.onChange(function () { if (!S) return; renderAll(); $('#guest-chip').hidden = signedIn(); if (S.dlg.agents.isOpen) renderAgentList(); });
  }

  function dlg(id) {
    var el = $(id), api = KM.dialog(el);
    var wrap = { open: function () { wrap.isOpen = true; api.open(); }, close: function () { api.close(); }, isOpen: false };
    el.addEventListener('close', function () { wrap.isOpen = false; });
    return wrap;
  }

  /* ------------------------------------------------------------------ public: join */
  function join(cfg) {
    // cfg: { url, token, code, title, role, name, mic, cam, micDev, camDev, shareUrl, onEnd }
    var room = new LK.Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, deviceId: cfg.micDev || undefined },
      videoCaptureDefaults: { resolution: LK.VideoPresets.h720.resolution, deviceId: cfg.camDev || undefined }
    });
    S = {
      room: room, code: cfg.code, title: cfg.title, role: cfg.role, name: cfg.name, shareUrl: cfg.shareUrl, onEnd: cfg.onEnd,
      joinedAt: now(), attendees: {}, chatLog: [], agents: [], tiles: {}, panel: null, unread: 0,
      rec: { on: false, startedAt: 0, firstAt: 0, totalMs: 0 }, conciergeTalking: false, closing: false,
      dlg: { agents: dlg('#agents-dlg'), consent: dlg('#consent-dlg'), leave: dlg('#leave-dlg'), devices: dlg('#devices-dlg') }
    };
    $('#room-title').textContent = cfg.title;
    var brand = $('#room-brand');
    KM.clear(brand);
    brand.appendChild(KM.brandMark());
    KM.setIcon($('#room-settings'), 'settings');
    KM.setIcon($('#rs-close'), 'x');
    KM.setIcon($('#chat-send'), 'send');
    KM.setIcon($('#conc-send'), 'send');
    $$('dialog [data-close].icon-btn').forEach(function (b) { KM.setIcon(b, 'x'); });
    $('#guest-chip').hidden = signedIn();
    $('#rec-ind').hidden = true; $('#rec-banner').hidden = true; $('#audio-banner').hidden = true;
    ['#ctl-mic', '#ctl-cam', '#ctl-rec'].forEach(function (s) { $(s).removeAttribute('aria-pressed'); });
    ctlSet($('#ctl-chat'), 'chat', 'Chat');
    ctlSet($('#ctl-people'), 'users', 'People');
    ctlSet($('#ctl-conc'), 'dot', 'Concierge');
    ctlSet($('#ctl-agents'), 'agent-add', 'Add agent');
    ctlSet($('#ctl-leave'), 'leave', 'Leave');
    setConn('connecting');
    $('#cap-who').textContent = 'Concierge · simulated';
    $('#cap-text').textContent = 'Connecting you to the room…';
    wire(room);
    bindUi();

    return room.connect(cfg.url, cfg.token).then(function () {
      if (!S) return;
      S.joinedAt = now();
      setConn('connected');
      noteAttendee(room.localParticipant);
      room.remoteParticipants.forEach(noteAttendee);
      $('#audio-banner').hidden = room.canPlaybackAudio;
      S.tickTimer = setInterval(tick, 1000);
      tick();
      renderAll();
      var others = room.remoteParticipants.size;
      say('Welcome to ' + cfg.title + ', ' + cfg.name + '. ' + (others ? others + (others === 1 ? ' other person is' : ' other people are') + ' here.' : 'You’re first. Share code ' + cfg.code + ' to bring people in.'));
      var lp = room.localParticipant, jobs = [];
      if (cfg.mic) jobs.push(lp.setMicrophoneEnabled(true).catch(function (e) { KM.toast('Mic unavailable: ' + (e.message || e.name), 'alert'); }));
      if (cfg.cam) jobs.push(lp.setCameraEnabled(true).catch(function (e) { KM.toast('Camera unavailable: ' + (e.message || e.name), 'alert'); }));
      return Promise.all(jobs).then(renderAll);
    }, function (err) {
      var state = S;
      S = null;
      if (state) {
        clearTimeout(state.capTimer);
        document.removeEventListener('keydown', state.onKey);
        window.removeEventListener('resize', state.onResize);
        state.offAuth();
      }
      throw err;
    });
  }

  window.addEventListener('pagehide', function () { if (S && S.room) S.room.disconnect(); });

  KML.room = { join: join, agents: AGENTS, isActive: function () { return !!S; } };
})(window, document, window.KM, window.LivekitClient);
