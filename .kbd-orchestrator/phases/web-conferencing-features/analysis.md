# Analysis: web-conferencing-features

```
ANALYSIS: web-conferencing-features
Date: 2026-11-18
Mode: stack specified (React 19 + Vite web app, livekit-client 2.24.1, entity graph, PGlite)
Inputs: assessment.md (with operator answers), goals.md, decision-log.md, two research
  passes (media; storage and entity graph), spot checks against npm and the upstream clone.
Candidates: 12 (adopt 7, adapt 1, reference 2, reject 2). Build required: 7 items (8 entries in library-candidates.json,
  where recorder and consent are separate).
Recommendation: READY to spec, with one operator decision to adopt in the contract:
  widening the Content-Security-Policy (see "Operator decision").
```

## Summary

- **Screen share, chat, devices and "Enable audio" need no new library.**
  `livekit-client` 2.24.1, already pinned, has every API. The work is in our port,
  adapter and UI.
- **Background effects: adopt `@livekit/track-processors` 0.8.3.** It must be
  configured to load its files from our own origin. By default it pulls about 9.6 MB
  of MediaPipe WebAssembly from jsDelivr and an unpinned "latest" model from Google
  Storage.
- **Local history: adopt `@electric-sql/pglite` 0.5.16 on `idb://`,** behind the
  entity graph. Know Meet owns the history tables, and transports read those tables.
  The entity graph's snapshot adapter would keep a second full copy of the same data.
  I recommend not using it for history.
- **Local recording: build it.** No maintained library composites a multi-person
  WebRTC meeting in the browser. The pipeline:
  - a canvas compositor with mixed audio feeds `MediaRecorder`;
  - chunks stream into the Origin Private File System (OPFS) through a same-origin
    worker;
  - a PGlite row holds each recording's metadata.
- **Entity graph 5.0.0 at `84d010b`: adapt the install.** A pnpm git-subdirectory
  install does not work for this repo. The workable route that keeps "from main,
  built from source, no vendored copy" has three steps:
  1. a git submodule pinned to `84d010b`;
  2. a pre-install build of core and react;
  3. `pnpm pack` into local tarballs that our workspace installs.
  The notes code needs no API change.
- **Three features need the CSP widened:** background effects, PGlite and local
  playback. This is the one decision the contract must adopt.

## Recalled lessons that bear on these choices

- "Boundary gates must launch the packaged artifact": WASM, workers and blob playback
  fail only under the real header, so the boundary must run the built web image. A
  dev server sends no header.
- "External integrations require at least one real-service test": chat (text
  streams) and screen share run through the real LiveKit project at least once.
- web-release root cause 1 (tooling never ran before the boundary): the submodule
  pre-install step is new tooling. It runs in CI and in the Docker build; keep it to
  one script with one entry point.

## Landscape and candidates

### Realtime features on livekit-client 2.24.1 (C-01, adopt; already pinned)

Read from the installed 2.24.1 type declarations and bundle.

| Need | API | Notes |
|---|---|---|
| Screen share | `localParticipant.setScreenShareEnabled(enabled, options?, publishOptions?)` | Remote tracks arrive as `Track.Source.ScreenShare` and `ScreenShareAudio`. Options include `audio`, `preferCurrentTab`, `selfBrowserSurface`, `surfaceSwitching`, `systemAudio`. |
| Chat, everyone | `localParticipant.sendText(text, { topic: "lk.chat" })` | `lk.chat` is a docs convention, not an SDK constant. Use one constant in our adapter. |
| Chat, one person | `sendText(text, { topic, destinationIdentities: [id] })` | The server delivers only to the named participant. This is not encryption; the server sees the text. |
| Receive | `room.registerTextStreamHandler(topic, handler)` / `unregisterTextStreamHandler` | `sendChatMessage` is `@deprecated`; do not use it. |
| Devices | `Room.getLocalDevices(kind, requestPermissions?)`, `room.switchActiveDevice(kind, id, exact?)`, `getActiveDevice`, `RoomEvent.MediaDevicesChanged`, `ActiveDeviceChanged` | `switchActiveDevice("audiooutput", …)` throws when `setSinkId` is missing, so gate it. |
| Enable audio | `room.canPlaybackAudio`, `RoomEvent.AudioPlaybackStatusChanged`, `room.startAudio()` from a click | Closes the reflection's autoplay gap. |
| Effects | `LocalVideoTrack.setProcessor(p)`, `stopProcessor()` | The processor must be set again after a device switch replaces the track. |

The token grant already allows all sources and data (`can_publish_sources` empty,
`can_publish_data: true`). **No token-service change is needed.** If the product
later wants to forbid screen-share audio, set `can_publish_sources` explicitly.

The lobby device choice (the wr05 gap) needs the join use case to carry chosen
device IDs into the room. In LiveKit that is `RoomOptions.audioCaptureDefaults` and
`videoCaptureDefaults` with `deviceId`, or a `switchActiveDevice` right after connect.

### Background effects (C-02 adopt, C-03 adopt as its dependency)

- `@livekit/track-processors` 0.8.3 (published 2026-11-12, Apache-2.0). Its peer
  range `livekit-client ^1.12.0 || ^2.1.0` covers 2.24.1.
- **API:** use the current `BackgroundProcessor({ mode: "background-blur", blurRadius }
  | { mode: "virtual-background", imagePath } | { mode: "disabled" })` and `.switchTo()`.
  `BackgroundBlur` and `VirtualBackground` are deprecated.
- **Support check:** `supportsBackgroundProcessors()`. It needs OffscreenCanvas,
  VideoFrame, `createImageBitmap` and WebGL2. The faster path is Chromium-only
  (`MediaStreamTrackGenerator`). Safari 16.4+ and Firefox 130+ use a canvas fallback;
  those versions are inferred from API support, not tested.
- **Self-hosting is required.** Pass `assetPaths: { tasksVisionFileSet,
  modelAssetPath }` pointing at files we serve:
  - `@mediapipe/tasks-vision` 0.10.14 `wasm/` (about 9.4 MB, plus a no-SIMD pair);
  - `selfie_segmenter.tflite` (about 250 KB), pinned to a fixed copy rather than the
    upstream `latest` URL.
  Load these only when a person first turns on an effect.
- **CSP:**
  - `'wasm-unsafe-eval'` in `script-src`;
  - the loader script must be same-origin;
  - its frame ticker uses a `blob:` worker. Without `worker-src blob:` it falls back
    to a timer that background tabs throttle. That is inferred from the code and not
    seen in a browser.
- **Image backgrounds:** a user-chosen image becomes an object URL. The processor
  reads it into a canvas, not a media element, so `img-src` needs `blob:`. To be
  confirmed at spec time.

### Local history (C-04 adopt, C-05 adapt, C-06 adopt)

- **`@electric-sql/pglite` 0.5.16** (Apache-2.0). Self-hosted assets are about 5.2 MB
  gzipped (wasm 3.24 MB, data 1.85 MB, initdb 0.13 MB). Vite emits them as hashed
  same-origin files through `new URL(…, import.meta.url)`. Vite needs
  `optimizeDeps.exclude: ["@electric-sql/pglite"]`.
- **Storage choice:** use `idb://` on the main thread, which works in Chrome, Firefox
  and Safari. `opfs-ahp://` needs a worker and is broken on Safari (252 sync-handle
  limit).
- **Multi-tab:** two tabs on one `idb://` database race. Run PGlite in a same-origin
  module worker through `PGliteWorker`; it elects one leader tab. A same-origin
  worker is allowed by today's `script-src 'self'` fallback.
- **Entity graph wiring (pem-local-first), adapted:**
  - Know Meet owns tables `meeting_session`, `chat_message` and `recording`. Each has
    a client UUID, `updated_at` and a privacy class of local-only.
  - `registerEntityTransport` reads those tables and honours `ListQuery`.
  - **Deviation from the skill recipe:** the recipe wires `createPGlitePersistenceAdapter`
    plus `startLocalFirstGraph` once. That adapter stores the whole graph as one JSON
    snapshot row and rewrites it on every debounced change. For a growing history
    that is a second copy and growing write cost, so I recommend leaving it out for
    history entities. `startLocalFirstGraph` stays available if pending-action replay
    is ever needed. This is an adapt, recorded for the plan.
  - Local-only means no sync queue and no server scope. The skill's `tenant_id`
    becomes a per-device identifier.
  - **Read and write paths, stated exactly:**
    - `startLocalFirstGraph` is **not** started for history entities.
    - **Writes:** history writes go through `useEntityMutation`. Its `mutate`
      function calls an application-layer `HistoryRepository` port. A PGlite
      adapter implements that port with `INSERT` and `UPDATE` statements, run in the
      leader worker.
    - **Reads:** each history type's transport `list` runs a `SELECT` that honours
      `ListQuery`. Its `subscribe` uses a PGlite live query, so committed rows flow
      back through the graph to the UI.
    - The notes entities keep their current wiring.
- **`@prometheus-ags/entity-graph-core` and `-react` 5.0.0 at `84d010b`** (C-06):
  - The notes code calls `registerEntityTransport`, `useEntityQuery` and
    `useEntityMutation`. All are unchanged at 5.0.0. The 5.0.0 major moves the
    optional `@ag-ui/core` peer to `^1.0.0`.
  - The spikes use AG-UI and must move to 1.x when they are bumped.
  - `-react` 5.0.0 depends on `@tanstack/react-table` and `-virtual`. Those are not
    TanStack Query, so the no-query-cache rule holds.

### Installing 5.0.0 from upstream main (C-06 install route)

Why a git-subdirectory install fails here:

1. pnpm 11 builds a git dependency only if it has a `prepare` script. Upstream has
   only `build`, so the install would contain no `dist/`.
2. Each package's `tsup.config.ts` imports `../../scripts/tsup-package-config`, so a
   package cannot build outside the full upstream checkout.
3. `-react` declares `"@prometheus-ags/entity-graph-core": "workspace:^"`. Only
   `pnpm pack` or `publish` rewrites that.
4. pnpm 11 also blocks git builds until they are listed in `allowBuilds`.

**Recommended route:**

1. Add a git submodule at `third_party/prometheus-entity-management`, pinned to
   `84d010b`. It is a commit pointer, not copied code, and lives outside our
   workspace globs.
2. A root script `tooling/entity-graph/build-from-source.sh` runs a filtered
   `pnpm install --frozen-lockfile` and builds core and react inside the submodule.
3. The same script runs `pnpm pack` into a git-ignored folder.
4. `apps/web` (and the spikes) depend on `file:` tarballs.
5. CI and the web image Dockerfile run the script before `pnpm install`.
6. `tooling/versions.toml` and the pin lint record the commit, not a version.

**Costs:**
- CI checkouts need `submodules: true`.
- The pre-install step adds time.
- Lockfile integrity changes whenever upstream's build output changes; it only
  changes when we move the pin.

**Uncomfortable fact:** 5.0.0 is already on npm. `84d010b` adds one unreleased fix:
RealtimeManager flushes as one store write, which fixes a reported 52-second block
at 8,180 rows. Asking upstream to publish 5.0.1 from main would give the same code
with none of this machinery. That conflicts with your "built from source"
instruction, so it is listed as a rejected alternative (C-12), not a
recommendation.

### Local recording (build; C-07 and C-08 reference only)

| Option | Verdict | Why |
|---|---|---|
| Build: canvas compositor + `AudioContext` mix + `MediaRecorder` | build | No maintained multi-participant compositor exists (`gh search` found none). The core is a few hundred lines in its own feature directory. |
| RecordRTC 5.6.2 (MIT) | reject (C-11) | A MediaRecorder wrapper with no compositing. Last change 2025-10. |
| Mediabunny 1.66.0 (MPL-2.0) | reference (C-07) | Successor of mp4-muxer and webm-muxer. Useful only if we later mux WebCodecs output ourselves. |
| LiveKit Egress | reject (C-12 note) | Excluded by your answer 1. |
| LiveKit docs | reference (C-08) | No official client-side recording guidance; treat it as unsupported by LiveKit. |

**Design facts for the spec:**

- **Composite:**
  - draw each participant's video element and the screen share to a canvas,
    following the room layout;
  - `canvas.captureStream(fps)` gives the video track;
  - an `AudioContext.createMediaStreamDestination()` mix of every remote audio track
    and the local mic gives the audio.
  All of this is supported in Chrome, Firefox and Safari.
- **Format:**
  - pick at runtime with `MediaRecorder.isTypeSupported`, preferring
    `video/mp4;codecs=avc1,mp4a.40.2` (Chrome 126+, Safari);
  - fall back to WebM (Firefox).
- **Storage:**
  - write each chunk to OPFS as it arrives, so memory stays flat;
  - `createWritable` exists in Chrome 86+, Firefox 111+ and Safari 26 only;
  - a same-origin worker using `createSyncAccessHandle` covers Safari 15.2+ and works
    under today's CSP;
  - call `navigator.storage.persist()`;
  - handle `QuotaExceededError` by stopping cleanly and keeping what was written.
- **Quotas:**
  - Chrome: 60% of disk;
  - Firefox: up to 10 GiB, or 50% of disk once persistence is granted;
  - Safari 17+: about 60% of disk.
- **Playback:** a `blob:` URL from the OPFS file in a `<video>` needs `media-src blob:`.
  Download through `<a download>` does not.
- **Consent (PRODUCT.md principle 4, amended):**
  - a "record request" message goes to everyone on a reserved text-stream topic;
  - each participant answers;
  - recording starts only after agreement;
  - a "recording" status message sets the indicator for everyone.
  How to treat a late joiner (asked, or recording paused until they answer) is a
  spec decision.

## Build-versus-adopt decisions and readiness

| ID | Decision | Contract section it satisfies | Runtime code needed |
|---|---|---|---|
| C-01 | adopt livekit-client 2.24.1 (pinned) | share, chat, devices, Enable audio | port and adapter extensions, UI |
| C-02 / C-03 | adopt track-processors 0.8.3 + tasks-vision 0.10.14, self-hosted | background effects | adapter wiring, asset copy step, UI |
| C-04 | adopt PGlite 0.5.16, `idb://` in a leader worker | local history | tables, transports, worker |
| C-05 | adapt pem-local-first (own tables; no snapshot adapter for history) | local history | as above |
| C-06 | adopt entity graph 5.0.0 at 84d010b via submodule + pack | entity graph goal | build script, CI and Docker steps, pin updates |
| build | composite recorder, OPFS writer, consent flow, recordings library | local recording | new feature directory |

None of these blocks writing the spec. Building them is the phase's work, so none
reaches READY without new runtime code.

## Build required

1. **Port extensions** in `packages/application/src/meeting/ports.ts`:
   - screen share;
   - text messages with an explicit audience;
   - device list and switch, including output;
   - audio playback status and start;
   - a video processor hook.
   The port stays free of `livekit-client`. Split the adapter into a feature directory
   (it is 225 lines now). The join use case also carries the device IDs chosen in the
   lobby into the room (the wr05 gap, scenario WC-5).
2. **Composite recorder and OPFS writer** (no candidate fits).
3. **Recording consent protocol** on a reserved text-stream topic.
4. **History tables, transports and the leader worker** for PGlite.
5. **The entity graph build-from-source script** and its CI and Docker wiring.
6. **Web-only CSP change**, with a guard that the desktop policy is unchanged.
   Update:
   - `content-security-policy.ts`;
   - `content-security-policy.test.ts`;
   - `csp-artifact.test.ts`;
   - `features/wr-3-tls-and-headers.feature`;
   - the generated gateway header.
7. **Designs** through `impeccable shape`, with your approval:
   - background effects;
   - device and speaker settings;
   - local history;
   - the local recordings library.
   Screen share and chat follow the meet prototype.

## Browser capability matrix (gates the UI)

| Feature | Chrome/Edge desktop | Firefox desktop | Safari desktop | Phones |
|---|---|---|---|---|
| Screen share | yes | yes | yes | no on Android; iOS Safari 27+ |
| Share tab/system audio | yes (tab; system on Windows/ChromeOS) | no | no | no |
| Speaker choice (`setSinkId`) | yes | 116+ | 18.4+ | no on Android; iOS 18.4+ |
| Background effects | yes (fast path) | 130+ (fallback) | 16.4+ (fallback) | UNKNOWN; likely slow; gate on support check |
| MediaRecorder MP4 | 126+ | WebM only | yes | varies |
| OPFS streaming write | `createWritable` 86+ | 111+ | worker handle 15.2+, `createWritable` 26 | as desktop engines |
| PGlite `idb://` | yes | yes | yes | yes |

Source: `@mdn/browser-compat-data` 8.1.9, Chrome Status, the WebKit tracker.
Controls the browser cannot support are hidden or explained, never left to fail.

## Operator decision: Content-Security-Policy

Generated by `apps/web/scripts/content-security-policy.ts`, used for the meta tag,
the gateway header (`infra/k8s/overlays/production/security-headers.yaml`) and Tauri.
Minimum change:

| Directive | Today | Proposed | Needed by |
|---|---|---|---|
| `script-src` | `'self'` | `'self' 'wasm-unsafe-eval'` | PGlite, MediaPipe |
| `worker-src` | (falls back to `script-src`) | `'self' blob:` | track-processors frame ticker; PGlite and OPFS workers are same-origin |
| `media-src` | `'self'` | `'self' blob:` | local recording playback |
| `img-src` | `'self' data:` | `'self' data: blob:` | user-chosen background image (to confirm) |
| `connect-src` | `'self'` + LiveKit | unchanged | all WASM and model files self-hosted |

- **What it allows:** `'wasm-unsafe-eval'` allows compiling WebAssembly, not
  JavaScript `eval`.
- **What it risks:** an attacker who can already inject script could also run WASM.
  The existing script controls are unchanged.
- **Tests that change:**
  - `apps/web/tests/unit/content-security-policy.test.ts`;
  - `csp-artifact.test.ts`;
  - `features/wr-3-tls-and-headers.feature`.
- **Security review is a prerequisite**, as the assessment required (risk 5). The
  `security-reviewer` role reviews the exact directive diff before the contract is
  adopted. The review checks that every WASM, worker and model file is served from
  `'self'`.
- **Desktop impact, resolved:** `apps/desktop/scripts/tauri-cli.ts:2-25` passes the
  same `buildContentSecurityPolicy()` output to the Tauri CLI as a `--config` patch.
  So editing the shared base directives would also change the desktop app, which is
  out of scope. The plan must add the new directives only to the web (hosted and
  meta-tag) policy. It must also add a check that the desktop policy is unchanged.
  The static `csp` in `tauri.conf.json:26` stays as it is.

## Knowledge gaps

Carried in `prior-context.md`; each is available as `/learn-goal <topic>` if you want
it, none run:

- NetworkPolicies not enforced;
- `main` branch protection and public pushes;
- meeting-code exhaustion by a large address pool;
- placeholder contrast at 4.5:1;
- the "Enable audio" prompt, now in scope through C-01;
- deploy by tag, not by digest;
- the failing Flutter golden job.

## Open questions for spec and plan (not operator blockers)

- How a late joiner is handled while recording is on.
- Whether chat history should be offered to late joiners from someone's local
  history. I recommend no: it would leak messages sent before they joined.
- Exact composite layout for recordings: speaker view or grid.

## Readiness

**READY to spec.** Before plan:

1. The contract must adopt the CSP change above, web only.
2. The security review of that change must be done.
3. The per-phase policy acknowledgement for `AGENTS.md` and `CLAUDE.md` must be
   re-recorded.

## Uncomfortable point

The pinned-commit, build-from-source route is the most expensive way to get five
commits of upstream code. It adds a submodule, a pre-install build, and a new
failure point in CI and the Docker build, for one performance fix that a 5.0.1
release would deliver for free. If upstream can publish soon, your instruction
costs more than it buys.

## Review record

- **Judge:** glm-5.3 through the liter-llm gateway. The producer was claude-opus-5-5,
  a different model.
- **Packet:** assembled by hand in `review/analyze/` because a local hook blocks the
  packet script's `python3`. It held the mandate, this file,
  `library-candidates.json`, the assessment, the goals and the decision log.
- **Verdict:** PASS, with 0 critical findings, 4 warnings and 4 suggestions. All eight
  are applied:
  - corrected the verdict counts to 7 / 1 / 2 / 2;
  - stated the history read and write paths, including that `startLocalFirstGraph`
    is not used for history;
  - restored the CSP security review as a prerequisite;
  - resolved the desktop CSP impact: the change is web only, with a guard;
  - added a `build_required` entry for the CSP (G8);
  - recorded the searches behind "no compositor library";
  - recorded C-06's licence (MIT);
  - added the lobby-to-room device carry to `build_required`.
