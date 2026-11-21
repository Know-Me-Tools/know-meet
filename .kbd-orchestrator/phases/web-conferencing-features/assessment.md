# Assessment: web-conferencing-features

```
ASSESSMENT: web-conferencing-features
Project: know-meet
Date: 2026-11-18
Codebase baseline: main at 31e891fb; the web app is live at https://meet.know-me.tools
  with guest meetings (join, see and hear, mute, camera, leave) on LiveKit. No goal
  of this phase is fully met; device management is partial (lobby meter and preview).
Cross-tool progress: none (new phase, 0 changes registered)
Method: VLBV (project default). Nothing was built or run for this assessment.
```

## Headline

- **No goal is fully met.** Only the lobby level meter and preview exist. The room has four controls: mute, video,
  copy link and leave (`room-controls.tsx`). The `RealtimeRoom` port knows only
  microphone and camera.
- **The design covers half of it.** The meet prototype draws screen share, chat
  (everyone plus private) and the lobby level meter. No design exists for background
  effects, device and speaker settings, local history, or a local recordings
  library. Those four surfaces need `impeccable shape` and owner approval before
  they are built (CLAUDE.md: no redesign without owner approval).
- **Local recording conflicts with two product statements.** PRODUCT.md describes
  recording as a LiveKit Egress Room Composite stored on S3, and makes consent a
  principle: "recording starts only after the room agrees" (principle 4). A
  browser-side recorder can satisfy consent only through an in-app request that the
  room answers. The storage statement needs an operator amendment to PRODUCT.md.
- **"Free version" is ambiguous.** Recording in the browser removes LiveKit Egress
  cost, but the meeting itself still runs through the LiveKit SFU. The draft change
  `mc01-signed-in-meeting-creation` says the free tier will later be peer-to-peer
  with no SFU. Whether that transport belongs in this phase is an open question.
- **The Content Security Policy blocks three of the new features.** PGlite and
  MediaPipe-style background effects need `'wasm-unsafe-eval'`; workers need
  `worker-src`; playing a local recording needs `blob:` in `media-src`.
- **The entity graph upgrade is a source dependency, not a version bump.** The
  operator asked for 5.0.0 from upstream `main` (commit `84d010b`, 5 commits past
  `v5.0.0`). `main` commits no `dist/`, so the web build has to build the packages
  from source or vendor a build pinned to that commit.
- **This phase is large.** Eight goals, four new design surfaces, a port redesign
  and a CSP change. The last phase delivered 9 changes in 1944 wall-clock minutes
  with 7 repairs.

## Implementation status

| Area | Status | Evidence |
|---|---|---|
| Screen sharing | MISSING | No `setScreenShareEnabled` or `getDisplayMedia` call. `track-resolver.ts:28-29` maps only Camera and Microphone. The token grant leaves `can_publish_sources` empty, which LiveKit treats as all sources, so the server already allows it. |
| Chat, everyone and private | MISSING | No `sendText`, `publishData` or text-stream handler. The grant sets `can_publish_data: true` (`livekit_issuer.rs:59`), so the server allows data. |
| Background blur and image | MISSING | No track processor, no `@livekit/*` package, no WASM in the CSP. |
| Device and source management | PARTIAL | The lobby has mic and camera toggles, a mic level meter (`use-mic-level.ts`) and a preview (`use-device-preview.ts`), all on default devices. `lobby-preview.tsx:5-7` records that device pickers were left out because the join use case cannot pass a device choice into the meeting (wr05 gap). No `enumerateDevices`, `switchActiveDevice` or `setSinkId`. |
| Client-only history (PGlite) | MISSING | No PGlite, IndexedDB or OPFS. localStorage holds only `km-auth` and the theme. The entity graph (4.3.0 in `apps/web/package.json`) is used only for notes (`register-note-entities.ts`). |
| Client-side recording | MISSING | No MediaRecorder anywhere. `presentation/recordings/*` and the settings recording section are fixture-driven prototype screens for server-side recording. |
| Entity graph 5.0.0 from main | MISSING | Pins: `apps/web/package.json` 4.3.0; `spikes/agentic-ui/own` 4.4.0; `spikes/agentic-ui/hybrid` 4.3.0; `tooling/versions.toml:46` `prometheus_entity_management = "4.2.0"`. No Dart or Rust pin on main. |
| Scope and constraints | n/a | Web only. Secrets stay server-side; no token-service change is needed for share or chat. |

Two observations from the inventory that matter for planning:

- `apps/web/node_modules` holds entity-graph-core **5.0.0**, while `apps/web/package.json`
  on main says 4.3.0. The installed tree came from the stashed round-5 branch. A clean
  install is needed before any boundary run, or the run tests the wrong library.
- 4.3.0 and 5.0.0 both export `startLocalFirstGraph` and
  `createPGlitePersistenceAdapter` (checked in the type declarations). So the
  pem-local-first wiring exists in both; the upgrade is the operator's instruction,
  not a prerequisite for PGlite.

## Spec gap summary

Existing specs (`openspec/specs/`): cluster-deployment, container-images,
guest-meeting, hosted-surface, meeting-core, realtime-room, release-acceptance,
release-verification, token-service. Gaps:

- **realtime-room**: no requirement for screen share, data or text messages, device
  selection, audio output, or track processing. The port contract
  (`packages/application/src/meeting/ports.ts:96-103`) needs new operations. Domain
  and application layers must stay free of `livekit-client` (CLAUDE.md layering).
- **meeting-core**: no chat message, audience or recording entities.
- **hosted-surface**: the CSP and Permissions-Policy requirements fix today's
  directives; they must change for WASM, workers and blob media, and
  `features/wr-3-tls-and-headers.feature` asserts the current header.
- **No spec** for local persistence, local recordings or device settings.
- **guest-meeting**: the lobby has no device choice; joining uses default devices.

## Design coverage

| Feature | Prototype | What it shows |
|---|---|---|
| Screen share | `meet.html` | Share control `#ctl-share`, `getDisplayMedia` flow (1855-1866), "Your screen share" tile (1488), cancel toast. |
| Chat | `meet.html` | Chat sheet "Everyone / Meeting chat" (1996), conversation rail with "Everyone" and one private thread per person (2240-2300), unread badge, private-message toast. File attachments are drawn too. |
| Recording | `meet.html`, `settings.html`, `recordings.html` | Consent dialog, recording banner, Egress Room Composite settings, server recordings library. Not a local recorder. |
| Lobby device check | `meet.html` | Mic and camera toggles, "Check mic", level meter. No device selects. |
| Background effects | none | Not designed. |
| Device and speaker settings | none | Not designed. `settings.html` "speaker" means speaker labels in transcripts. |
| Local history | none | Not designed. |
| Local recordings library | none | `recordings.html` is server-side; a local library differs (storage use, delete, export). |

## Cross-tool progress

NONE. The phase has no registered changes. The draft OpenSpec change
`mc01-signed-in-meeting-creation` on main belongs to the sign-in slice and is not in
this phase.

## Build health

- Build check: UNKNOWN for this phase; nothing was run (VLBV, and no code written).
- CI on main (`31e891fb`, 2026-11-18): `ci` fails only in the job "flutter analyze
  (zero infos), test". Repo rules, typecheck, web tests and build, and cargo all pass.
  This is the known Flutter golden failure, handled by a follow-up session.
- File size: `livekit-realtime-room.ts` 225 lines, `room-controls.tsx` 162,
  `ports.ts` 103. Adding share, chat, devices, effects and recording to these files
  would pass 500 lines; plan them as feature directories from the start.
- Test coverage for the new features: NONE.

## Constraint check

- AGENTS.md / CLAUDE.md: no violations in current code for these areas. Constraints
  the plan must honour:
  - kebab-case names, 500-line limit, inward dependencies;
  - no `any`;
  - Tauri calls guarded by `isTauri()`;
  - design tokens only;
  - flat 2.0 with no borders, WCAG 2.2 AA;
  - one adaptive navigation spec.
- pem-local-first (loaded for this assessment):
  - durable data is an entity-graph entity over PGlite (`idb://` on web);
  - transports read only the local store and honour `ListQuery`;
  - `startLocalFirstGraph` is wired once at the runtime boundary;
  - Zustand holds only transient state;
  - no TanStack Query.
  The web app already uses `@tanstack/react-router`; that is routing, not a query
  cache, and is allowed.
- Local-only history means the sync queue and tenant scope are not used for these
  tables. `tenant_id` still needs a value; for guests without an account it is a
  device-local identifier. This needs a decision in analyze.

## Risks found

1. **Consent and the local recorder.** A browser recorder captures what the browser
   receives: every remote participant's audio and video. Principle 4 needs a room
   consent step before capture, a visible recording indicator for everyone, and a
   stop when someone joins and declines. A participant who records outside the app
   cannot be prevented; the product can only make the in-app path honest.
2. **What a local recording contains is undecided.** Options:
   - the recorder's own view, composited to a canvas, with all audio mixed;
   - only the active speaker or the screen share;
   - a tab capture through `getDisplayMedia`, which needs one more permission
     prompt and the user's cooperation.
   Each has different CPU cost, browser support and quality.
3. **Storage limits.** OPFS and IndexedDB quotas vary by browser and can be evicted
   unless persistent storage is granted. An hour of 720p video is hundreds of
   megabytes. Safari limits are the tightest (UNKNOWN; analyze to confirm).
4. **Browser support gaps.** These need confirming in analyze:
   - Screen sharing is not available in mobile browsers in general.
   - Audio-output selection (`setSinkId`) is missing or limited in some browsers.
   - The MediaRecorder container differs by browser (WebM or MP4).
   - Background effects need WebGL or WebGPU and cost CPU on low-end devices.
   The adaptive layout spec covers phones, so the phone UI must hide or explain
   unavailable controls rather than fail.
5. **CSP widening is a security change.** `'wasm-unsafe-eval'` and `worker-src` widen
   what the page can run. It needs a security review and a check that WASM and model
   files are self-hosted (`'self'`), not fetched from a CDN.
6. **Private chat is not end-to-end encrypted.** Text streams with destination
   identities are delivered only to that participant, but pass through the LiveKit
   server. Principle 3 ("audiences are always explicit") means the UI must say who
   can see a message. It must not imply privacy from the operator.
7. **Chat history is per device.** With history only in each browser, a late joiner
   sees nothing sent before they arrived, and history is lost when site data is
   cleared or the person changes device.
8. **Building entity graph from main.** No `dist/` on main means a source build
   inside our install, or a vendored build. Pinning a moving branch would make
   builds unreproducible. 5.0.0 is a major version, so the notes feature may need
   code changes (UNKNOWN until analyze reads the changelog).
9. **Tooling first runs at the boundary.** The last phase's root cause: new release
   tooling ran for the first time at the boundary, and four of seven repairs were
   tooling defects. This phase adds media-capture tests (fake devices, screen share,
   recording) that are hard to automate. Prefer existing harnesses (Playwright with
   fake media flags) and keep new tooling small.
10. **Stale installed dependencies.** See the 5.0.0-versus-4.3.0 mismatch above.

## Lessons recalled

From `prior-context.md`:

- "Boundary gates must launch the packaged artifact": the boundary has to run the
  built web image with the new CSP, because the CSP is generated at build time and
  WASM, workers and blob playback fail only under the real header.
- "External integrations require at least one real-service test": chat and screen
  share go through LiveKit; at least one scenario runs against the real LiveKit
  project, as WR-1 did.
- "Collect zero-question execution approvals at dispatch": ask for the operator's
  approvals (commits, CSP change, PRODUCT.md amendment) once, at dispatch.
- "Preserve production evidence in dated review folders": unchanged from last phase.
- web-release reflection, root cause 1 (tooling never ran before the boundary)
  shapes risk 9.

## Knowledge gaps

Carried in `prior-context.md`. Each can be studied with `/learn-goal <topic>` if you
want; I have not run any.

- NetworkPolicies in `infra/k8s/base/network-policies.yaml` are not enforced.
- `main` branch protection and public push exposure.
- Token service: a large address pool can still exhaust meeting creation.
- Placeholder contrast sits at exactly 4.5:1.
- No "Enable audio" prompt when the browser blocks autoplay.
- `images.yml` deploys by tag, not by digest.
- The Flutter golden CI job on main was already failing.

The "Enable audio" gap is close to the device-management goal; analyze can decide
whether to fold it in.

## Goal progress

| Goal | Status | Reason |
|---|---|---|
| Scope: web only | n/a | Scope statement. |
| Screen sharing | NOT MET | No code, design exists. |
| Chat, everyone or one person | NOT MET | No code, design exists. |
| Background blur or image | NOT MET | No code, no design. |
| Device and source management | PARTIAL | Lobby level meter and preview exist; no selection, no output choice, nothing in the room. |
| Client-only history in PGlite | NOT MET | No local store. |
| Client-side recording, no Egress | NOT MET | No recorder; PRODUCT.md describes Egress. |
| Entity graph 5.0.0 from main | NOT MET | Pins at 4.2.0-4.4.0. |
| Constraints carried forward | MET today | No change needed to keep secrets server-side. |

## Adopted-outcome contract inputs

Adopted from the operator's own words on 2026-11-18 (goals.md, decision-log.md):

- **User operation:** a meeting participant at https://meet.know-me.tools shares their
  screen, chats with everyone or one person, blurs or replaces their background,
  chooses and tunes their microphone, camera and speaker, records the meeting into
  their browser, and later finds past meetings, chats and recordings on the same
  device.
- **Observed baseline:**
  - guest meetings work with default devices;
  - mute, camera, copy link and leave are the only room controls;
  - nothing is stored locally except the session and theme;
  - recording does not exist.
  - UNKNOWN: browser support for output selection, effects and recording formats;
    storage quotas; the 5.0.0 API changes.
- **Desired observable result:** each operation works end to end on the hosted app.
  History and recordings survive a page reload and never leave the device.
- **Supported environments (proposed):**
  - current desktop Chrome, Edge, Firefox and Safari;
  - phone browsers for chat, devices and history, with screen share and effects
    shown as unavailable where the browser cannot do them.
- **Required safety checks (proposed):**
  - consent before any recording, plus a visible indicator to everyone;
  - an explicit audience on every chat message;
  - no secrets on the client;
  - a security review of the CSP change;
  - WCAG 2.2 AA and reduced motion on every new control;
  - no history or recording data sent to any server.
- **Exclusions (proposed):**
  - desktop (Tauri) and mobile (Flutter);
  - server-side recording and Egress;
  - chat file attachments (drawn in the prototype);
  - end-to-end encryption;
  - cross-device sync of history;
  - transcription;
  - peer-to-peer transport (operator answer 1).
- **Included by operator answer 8:** the "Enable audio" autoplay prompt.
- **Risk acceptance (to confirm):**
  - private chat passes through the LiveKit server;
  - local data is lost when site data is cleared;
  - recordings are limited by browser storage.
- **Decision owner:** the operator (travis@tribehealthsolutions.com).

## Value scenario proposals

Proposals only; adoption happens in the contract.

| ID | Actor and outcome | Source |
|---|---|---|
| WC-1 | A participant shares a tab and the other participant sees it, then it stops cleanly. | operator goal |
| WC-2 | A participant sends a message to everyone; both others see it with the "Everyone" audience. | operator goal, prototype |
| WC-3 | A participant sends a private message; only the named recipient receives it, and it is labelled private. | operator goal, prototype |
| WC-4 | A participant turns on background blur, then an image background; the remote view shows it; turning it off restores the camera. | operator goal |
| WC-5 | A participant picks a microphone and a camera in the lobby and in the room, sees the level and preview, and the meeting uses the chosen devices. | operator goal, wr05 gap |
| WC-6 | A participant picks an audio output where the browser supports it; where it does not, the control explains why. | operator goal |
| WC-7 | After a reload, the participant's history lists the past meeting and its chat, read from PGlite, with no network request carrying it. | operator goal |
| WC-8 | A participant asks to record; others are asked; after agreement the recording runs with an indicator; it is saved locally and plays back from the local library. | operator goal, principle 4 |
| WC-9 | A participant declines consent; recording does not start. | principle 4 (rare-critical) |
| WC-10 | The hosted page serves the new CSP; WASM, worker and blob playback work, and nothing else is widened. | risk 5 |
| WC-11 | The web build uses entity graph 5.0.0 from upstream commit `84d010b`; notes still work. | operator goal |

## Open questions for the operator

1. **Free version:** does this phase only remove LiveKit from recording, or should
   meetings themselves also run without the LiveKit SFU (peer-to-peer) for a free
   tier? Peer-to-peer is a transport change, roughly a phase of its own.
2. **What a local recording captures:** the recorder's composited view of everyone
   (canvas plus mixed audio), or a tab capture? Composited is seamless but heavier.
   Tab capture is simpler but asks for screen permission.
3. **Who may record:** anyone in the room, or only the host? Guests have no accounts
   today.
4. **PRODUCT.md:** may I amend it so recording can also be local, in the browser, for
   the free version, keeping consent?
5. **Entity graph pin:** pin upstream commit `84d010b` exactly (reproducible), or
   follow `main` as it moves? And should the build compile it from source, or should
   we vendor a built copy?
6. **Phase size:** keep all eight goals in one phase, or split? A natural split would
   be: (a) share, chat and devices; (b) background effects; (c) local history and
   recording, together with the entity graph upgrade.
7. **"Enable audio" prompt:** fold the reflection's missing autoplay prompt into the
   device-management goal? I recommend yes: it is the same surface (audio output)
   and small. Until you answer, it stays pending in the contract inputs.

### Operator answers (2026-11-18)

1. Recording only; meetings stay on LiveKit. Peer-to-peer is excluded.
2. Composited view: all participants' video and the screen share, all audio mixed.
3. Anyone may ask to record; the room is asked; everyone sees the indicator.
4. PRODUCT.md amended: browser-local recording is the free-version path, with
   consent kept (Integrations, "Browser-local recording").
5. Pin upstream commit `84d010b` exactly.
6. Build the packages from source at install; no vendored copy.
7. One phase, planned in stages: share, chat and devices; then effects; then local
   history, recording and the entity graph upgrade. One boundary run.
8. The "Enable audio" prompt is folded into device management.

The contract inputs above change accordingly: peer-to-peer moves to exclusions;
the "Enable audio" prompt moves into scope; recording is composited, by anyone,
with room consent.

## Uncomfortable point

The operator's direction to record without LiveKit for a free version runs into
PRODUCT.md's consent principle and its S3 storage model. A browser recorder is also
the feature where the product's guarantees are weakest. Any participant can already
record their screen with tools outside the app, so the in-app consent flow protects
honest participants only. If that is not acceptable, local recording should wait for
a design that limits capture to the recorder's own media. That design is much less
useful.

## Review record

- Cross-model judge: glm-5.3 through the liter-llm gateway (producer
  claude-opus-5-5; distinct). The packet was assembled by hand because the packet
  script's `python3` call is blocked by a local hook; it held the mandate, this
  file, goals.md, decision-log.md and code excerpts (`review/assess/`).
- Verdict PASS, 0 critical, 0 warning, 2 suggestions, both applied:
  - the headline said no goal was implemented, while device management is partial;
  - the "Enable audio" fold-in was deferred instead of decided; it is now question 7.
- Sycophancy screen of the headline and conclusions: score 0.0.
