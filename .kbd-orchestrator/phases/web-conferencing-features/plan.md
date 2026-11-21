# Plan: web-conferencing-features

```
PLAN: web-conferencing-features
Project: know-meet
Date: 2026-11-18
OpenSpec available: YES (2.0.0, through the managed runner)
Changes to implement: 11
Tasks: 47
Contract: .kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json
  ADOPTED 2026-11-18, sha256 24260182fbf1b23999f1f04f26fd590fbb87756d6c275de434d9b6c777016930,
  planRevision 1, decision contract-adoption-web-conferencing-features-24260182.
  The contract's status block still reads "draft": the digest covers it, so it
  stays as bound; the runtime decision is the record of adoption.
Method: VLBV (project default); policy acknowledgements for AGENTS.md and
  CLAUDE.md not yet recorded for this phase
```

## What this plan delivers

On `https://meet.know-me.tools` a participant can:
- share a screen;
- chat with everyone or with one person;
- blur or replace their background;
- choose and tune their microphone, camera and speaker, and click through an
  "Enable audio" prompt;
- record the meeting into their own browser after the room agrees;
- after a reload, find past meetings, chats and recordings on the same device.

Entity graph moves to 5.0.1 from npm. The contract's fourteen scenarios
(WC-1 to WC-14) are the acceptance. This file orders the work that reaches them.

## Operator decisions this plan rests on

From `decision-log.md`, all 2026-11-18:
- **Recording:** recording only, with no peer-to-peer transport. The recording
  is a composited view. Anyone may start one, with the room's consent.
- **PRODUCT.md:** amended.
- **Delivery:** one phase, staged.
- **"Enable audio":** folded in.
- **Entity graph:** 5.0.1 from npm. This supersedes the commit pin and the
  build-from-source route.
- **CSP:** "Adopt CSP". The change is web only, with a security review before
  the contract is adopted.

**Adopted with the contract** (operator, 2026-11-18: "Adopt as drafted"):

1. **Guests get local history and local recording.** The hosted app has no
   sign-in. PRODUCT.md "Guest vs signed in" still lists recording and the
   recordings library as sign-in features. Operator answer 3 ("Anyone, with
   consent") implies guests may record. Adoption is followed by task 1.3 editing
   that PRODUCT.md bullet; without it, WC-7 and WC-8 cannot run on the hosted app.
2. **Late joiner while recording.** The recording continues. The late joiner
   sees the indicator and a consent prompt. If they decline, the recording
   stops for everyone and keeps what was written before.
3. **No chat backfill.** Late joiners get no chat from anyone's local history,
   because that would expose messages sent before they joined.
4. **Recording layout.** The recording follows the room's grid layout. A
   screen share takes the large tile.
5. **Retention.** Each participant's device keeps the chat messages it
   received, other people's included. This is local and never uploaded. The
   history screen says so and offers delete.

## Method

VLBV:
- Acceptance is defined in wc01 before any production code.
- No generated code is run until wc11, which is one boundary run.
- Installing dependencies (task 1.4's worktree install, task 1.6's three
  libraries and task 8.5's entity graph refresh) is not running generated
  code. The operator approves all three in batch 1.

The contract is adopted. The acknowledgements for `AGENTS.md` and `CLAUDE.md`
(sha256 `8c6e29ed…`) are recorded, and batch 1 was approved on 2026-11-18
(see decision-log.md).

## Change list (ordered, in the operator's three stages)

Role names are `.agent-team/know-meet-team` roles, and each role writes only
inside its own paths. `library:` refers to `library-candidates.json`.

**Stage 0: acceptance**

1. **wc01-conferencing-scenarios**: acceptance, designs, worktree, pins
   - Scope: tests (definition only), design, repo meta
   - Depends on: NONE
   - Roles: bdd-quality, design-lead, delivery-lead, build-platform
   - Est. complexity: M. Complexity score: Medium. Model class: frontier
   - Customer value: MEDIUM
   - Details:
     - WC-1 to WC-14 as Gherkin, plus Playwright skeletons in
       `tests/release/` (packaged and hosted projects).
     - Negative controls for consent and for "no history leaves the device".
     - `impeccable shape` for effects, device settings, history and the
       recordings library. The operator approves these in batch 2.
     - The worktree, the pins in `tooling/versions.toml` (task 1.5, from the
       list batch 1 approves), and task 1.6, which adds
       `@livekit/track-processors` 0.8.3, `@mediapipe/tasks-vision` 0.10.14
       and `@electric-sql/pglite` 0.5.16 to `apps/web` and installs them.
       Tasks 7.1, 7.2 and 9.2 depend on 1.6.
     - Screen, window or tab is chosen in the browser's own picker; the app
       sets no surface restriction. WC-1 automates the tab case only, and
       window and screen are recorded as NOT_EXERCISED.

**Stage 1: share, chat, devices, "Enable audio"**

2. **wc02-conferencing-ports**: domain types, port extensions, use cases
   - Scope: domain, application
   - Depends on: wc01
   - Roles: architect
   - library: C-01 (adopt)
   - Est. complexity: M. Complexity score: Medium. Model class: frontier
   - Customer value: MEDIUM
   - Details:
     - `RealtimeRoom` gains screen share, text messages with an explicit
       audience, device list and switch (output included), audio playback
       status and start, and a video-processor hook.
     - The join use case carries the lobby's device choice into the room.
     - The recording consent use cases.
     - No `livekit-client` import anywhere in this layer.

3. **wc03-realtime-adapter-features**: LiveKit behind the extended port
   - Scope: infrastructure
   - Depends on: wc02
   - Roles: webrtc-engineer
   - library: C-01 (adopt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details:
     - Split `livekit-realtime-room.ts` (225 lines) into a feature directory
       before it grows.
     - Screen share uses `setScreenShareEnabled`.
     - Text uses `sendText` with one topic constant for chat and one reserved
       topic for consent; receiving uses `registerTextStreamHandler`.
     - Devices use `switchActiveDevice`, and output is gated on `setSinkId`.
     - Audio playback uses `startAudio`.
     - The processor is reapplied after a device switch.

4. **wc04-share-and-chat-ui**: share control, chat panel, "Enable audio"
   - Scope: ui
   - Depends on: wc03
   - Roles: ui-engineer
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details:
     - Share follows the meet prototype.
     - The chat panel labels the audience on every message (Everyone, or
       private to a named person).
     - The prompt appears when `canPlaybackAudio` is false.

5. **wc05-device-settings**: lobby and in-room device management
   - Scope: ui
   - Depends on: wc03, batch 2
   - Roles: ui-engineer
   - Est. complexity: M. Complexity score: Medium. Model class: frontier
   - Customer value: HIGH
   - Details:
     - Microphone, camera and speaker pickers with a level meter and preview
       in the lobby (this closes the wr05 gap) and in the room.
     - Where the browser cannot change the output device, the control says so.

**Stage 2: background effects**

6. **wc06-web-csp**: the adopted web-only policy change
   - Scope: build, infra, tests
   - Depends on: wc01, security review (before adoption)
   - Roles: client-shell, bdd-quality, livekit-platform
   - Est. complexity: S. Complexity score: Medium. Model class: frontier
   - Customer value: MEDIUM
   - Details (the conditions from the security review,
     `review/security-csp/report.md`, ADOPT WITH CHANGES):
     - The new sources are added only when `hosted === true`, never in
       `BASE_DIRECTIVES`. The default `dist` meta tag and the Tauri patch stay
       byte-identical.
     - A unit test asserts that the `tauri.conf.json` csp equals
       `buildContentSecurityPolicy({ livekitUrl: undefined })`, plus golden
       tests of the default policy.
     - The wr-3 feature checks that the gateway header is also on worker
       `.js` and `.wasm` responses, and that `.wasm` is served as
       `application/wasm`.
     - The unit and artifact tests, the wr-3 feature and the regenerated
       `security-headers.yaml` (render, then `--check`) change together, and
       ship in the same merge as the image.
     - `worker-src` starts as `'self' blob:`. Task 7.2 tries to remove
       `blob:` (see wc07). If it succeeds, 6.1's value is narrowed in the same
       change set; if not, the reason is written in the policy's comment
       block.

7. **wc07-background-effects**: blur and image backgrounds
   - Scope: build, infrastructure, ui
   - Depends on: wc03, wc06, batch 2
   - Roles: client-shell, webrtc-engineer, ui-engineer
   - library: C-02, C-03 (adopt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details:
     - Self-host the tasks-vision WASM and a pinned segmenter model, and load
       them on first use. Remote defaults are always overridden; connect-src
       stays closed, so a missed override fails closed.
     - Remove the library's `blob:` frame-ticker worker if possible, through
       an option or a `pnpm patch` to a static same-origin worker. That lets
       the policy be `worker-src 'self'`. If that is not possible, record the
       reason.
     - Check whether the image background is read through `fetch(blob:)`. If
       so, use a path that needs no connect-src change.
     - `BackgroundProcessor` sits behind the processor hook, with
       `supportsBackgroundProcessors()` gating it.
     - The picker offers off, blur and image.

**Stage 3: local history, local recording, entity graph**

8. **wc08-entity-graph-5-0-1**: pin 5.0.1 from npm everywhere
   - Scope: build
   - Depends on: wc01, and **5.0.1 published with `latest`** (blocked today)
   - Roles: build-platform, client-shell, architect, ui-engineer
   - library: C-06 (adopt, npm 5.0.1), C-12 (now adopted)
   - Est. complexity: S. Complexity score: Medium. Model class: medium
   - Customer value: LOW (no visible change; history is built on it)
   - Details:
     - Task 8.1 first checks that `npm view` shows `latest: 5.0.1` for core
       and react, and stops if it does not.
     - Then it bumps `tooling/versions.toml`, `apps/web`, and the two spikes.
       Both spikes already pin `@ag-ui/core` 1.0.4, which meets 5.x's
       `^1.0.0` peer range, so AG-UI does not change.
     - A clean install refreshes the lockfile and replaces the 5.0.0 left in
       `apps/web/node_modules` by an earlier stashed branch (the manifest on
       `main` says 4.3.0).

9. **wc09-local-history**: meetings and chats kept on the device
   - Scope: application, infrastructure, ui
   - Depends on: wc02, wc06, wc08, batch 2
   - Roles: architect, client-shell, ui-engineer
   - library: C-04 (adopt), C-05 (adapt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details:
     - A `HistoryRepository` port.
     - Build wiring in task 9.2: Vite `optimizeDeps.exclude` for PGlite and
       hashed same-origin emission of its WASM and data files (about
       5.2 MB gzipped).
     - PGlite 0.5.16 on `idb://` in a leader-elected same-origin worker, with
       tables `meeting_session`, `chat_message` and `recording`.
     - Entity transports honour `ListQuery` and read live queries.
     - Writes go through `useEntityMutation`, with no snapshot adapter.
     - A history screen with delete.

10. **wc10-local-recording**: consented, composited, stored in OPFS
    - Scope: application wiring, infrastructure, ui
    - Depends on: wc03, wc06, wc09, batch 2
    - Roles: client-shell, ui-engineer
    - library: build (no candidate fits); C-07, C-08 reference
    - Est. complexity: L. Complexity score: High. Model class: frontier
    - Customer value: HIGH
    - Details:
      - A canvas compositor with an `AudioContext` mix feeds `MediaRecorder`.
        MP4 is preferred, with WebM as the fallback.
      - An OPFS writer worker uses `createSyncAccessHandle`, calls
        `storage.persist()`, and stops cleanly on quota.
      - Consent runs over the reserved topic, and everyone sees the
        indicator.
      - A recordings library offers playback and download.

**Boundary**

11. **wc11-conferencing-boundary**: the single run, then go-live
    - Scope: all
    - Depends on: wc01 to wc10
    - Roles: bdd-quality, independent-reviewer, security-reviewer,
      delivery-lead
    - Est. complexity: L. Complexity score: High. Model class: frontier
    - Customer value: HIGH
    - Details:
      - Runs the contract's boundary packet once: static gates, the packaged
        run against the built web image with real LiveKit, then reviews.
      - After a second operator approval: merge, continuous deployment,
        digest check and the hosted run.
      - Evidence goes to a new dated folder.

## Tasks and task model assignments

The 46 tasks, the scenario list (WC-1 to WC-14) and the one Task model
assignments table are in [plan-tasks.md](plan-tasks.md). The keys are the
phase path `web-conferencing-features`, the change ID and the OpenSpec task
ordinal.

## Execution round order

**Before Round 1 (gate):** the contract is adopted, with decisions D1 to D5,
and the policy acknowledgements are recorded (batch 1). The readiness check
must say READY before any dispatch.

```
Round 1:            wc01
Round 2 (parallel): wc02, wc06, wc08 (wc08 only if 5.0.1 is latest)
Round 3:            wc03
Round 4 (sequential, one UI writer): wc04, wc05, wc07
Round 5:            wc09 (needs wc08)
Round 6:            wc10
Round 7:            wc11
```

- Same-role tasks in one round run one at a time (one writer per role), so
  Round 2's client-shell tasks (6.1, 6.2, 8.2) and architect tasks (wc02,
  8.3) are sequential within each role.
- Task 6.4 runs a script against the changed policy builder, so under VLBV
  it runs inside boundary step 1, rendering the header and committing it
  as one file before the push approval, as web-release did.
- wc04, wc05, wc07 and wc10 all edit `meeting-room-screen.tsx`, so the
  ui-engineer tasks run one at a time.
- If 5.0.1 is still unpublished when Round 2 ends, wc08 waits. Rounds 3 and 4
  continue, and Round 5 waits for wc08.

## Boundary packet

One packet, in the contract's `boundaryPacket`. It starts when wc01 to wc10
are complete and committed on the phase branch, not pushed. The order is the
safety design:

1. **Static gates:**
   - `pnpm lint`, `pnpm typecheck` and `pnpm test` from the worktree root;
   - `pnpm --filter @know-meet/web build:hosted` and the CSP header render;
   - the desktop policy identity check;
   - the desktop and mobile build commands that web-release's WR-9 used.
2. **Packaged run:**
   - build the web image (`apps/web/Dockerfile`) and the token service
     image, and start them with `tooling/release/compose.yaml`;
   - run `pnpm --filter @know-meet/release-tests exec playwright test
     --project=packaged` for the wc-* specs, against the real LiveKit project.
     `LIVEKIT_*` values come from the shell only.
3. **Reviews:**
   - axe accessibility on every new surface, and `prometheus-ui-review`
     against the approved shapes;
   - security-reviewer on the CSP, consent and storage paths;
   - glm-5.3 adversarial diff review.
4. **Stop for the second operator approval.** Nothing has been pushed before
   this point.
5. **Publish** (digest-pinned continuous deployment is live on `main`:
   PR #9 deploy-by-digest, PR #13, and deploy commits `85e8d2d6` and
   `ec165d98`. If the deploy commit for the merge has not appeared within
   30 minutes, task 11.4 reads the running image digest read-only with
   `kubectl` and compares it with the workflow's pushed digest. A mismatch,
   or no deployment, stops the run with BLOCKED.)
   - push the branch and open the PR; the operator merges it;
   - continuous deployment builds the image and pins it by digest;
   - task 11.4 confirms that the live digest equals the workflow build of the
     merged commit.
6. **Hosted run:** the same specs with `--project=hosted` at
   `https://meet.know-me.tools`.

**Engines:**
- Chromium with fake media runs every scenario.
- Firefox and WebKit run WC-2, WC-3, WC-6 and WC-7. Current Firefox and
  Safari have `setSinkId`, so WC-6's unsupported branch is forced in every
  engine by an init script that removes it.
- No engine is used for media proof on phones; that is recorded as
  NOT_EXERCISED, not PASS.

**Budgets (proposed):**
- 1,500 minutes;
- 2,500 tool calls;
- 3 repair attempts;
- stop after 3 attempts without progress;
- token budget UNKNOWN, with a checkpoint after each change.

**Evidence** is invalidated by key: the contract digest, the tested commit, the
web image digest and the rendered CSP header digest.

## Operator-only actions

Three batches. Each batch is asked once.

**Batch 1, before Round 1:**
- Adopt the contract, including decisions D1 to D5, and record the
  `KBD-POLICY-ACK` for AGENTS.md and CLAUDE.md. If D1 is adopted, task 1.3
  (design-lead owns PRODUCT.md) commits the PRODUCT.md amendment.
- Approve this pin list. It is final; task 1.5 writes it to
  `tooling/versions.toml` and task 1.6 installs the three libraries:
  - `@livekit/track-processors` 0.8.3;
  - `@mediapipe/tasks-vision` 0.10.14;
  - `@electric-sql/pglite` 0.5.16;
  - entity graph 5.0.1 (already decided);
- Approve `pnpm install` in the new worktree (tasks 1.4, 1.6 and 8.5). The web-release gotcha: without
  installed packages, roles write against docs only.
- Allow, or run yourself, the 5.0.1 publish in the release session. wc08
  waits on it.

**Batch 2, after task 1.3:** approve the four shapes (effects, device
settings, history, recordings library). wc05, wc07, wc09 and wc10 UI tasks
wait on this. Share and chat follow the existing prototype and do not wait.

**Batch 3, at the boundary:**
- Step 1: approve starting the boundary run.
- Step 2: after the packaged run and the reviews, approve the push. You merge
  the PR.

## Lessons applied

From `prior-context.md`. These are information recorded by agents:

- **"Boundary gates must launch the packaged artifact."** Applied:
  - the CSP, WASM, workers and blob playback are proven only against the
    built web image and the hosted URL;
  - a dev server does not count.
- **"Ask once at phase boundary for operator-only actions."** Applied as
  three batches, because pins and designs are needed before the code that
  uses them.
- **"Preserve production evidence in dated review folders."** Applied: the
  boundary writes to a new dated folder with a README.
- **Gotcha, web-release:** the worktree had no `node_modules`. Applied: task
  1.4 installs, with the operator's approval in batch 1.

## Risks and cuts

1. **All new media code meets a test for the first time at the boundary.**
   The recorder, effects, PGlite worker and text streams are written without
   running. Effects and recording depend on browser behaviour that is
   inferred, not observed (analysis, capability matrix). Three repair attempts
   may not be enough. That is the cost of VLBV here, and it is the operator's
   method choice.
2. **WC-11 depends on another repository.** If 5.0.1 is not published before
   Round 5, wc09 cannot start and the phase stops short of history and
   recording.
3. **Fake media cannot prove composite quality or background segmentation
   quality.** The oracles check what can be measured: frame sizes, track
   state, file size, duration and playback start. Visual quality is judged
   from screenshots and is labelled as judgement.
4. **Guest scope is not decided** (proposed decision 1). If it is rejected,
   WC-7 and WC-8 need a sign-in that does not exist, and drop to
   NOT_EXERCISED on the hosted app.
5. **Cuts:**
   - chat file attachments;
   - transcription;
   - cross-device history;
   - end-to-end encryption;
   - Egress;
   - peer-to-peer;
   - desktop and mobile;
   - media proof on phones.

## Uncomfortable point

Forty-seven tasks add five features and two storage systems to an app that
still has no sign-in. Local history and local recording on guest devices
create the one thing the product's privacy principles warn about: other
people's words, voices and faces saved on a participant's machine. Consent
and the history screen's notice address that, but neither stops a participant
from keeping what they recorded. If that is not the intended "free version",
decision 1 is the place to say so.

## Commands to run

One OpenSpec change per entry, through the managed runner:

```
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc01-conferencing-scenarios
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc02-conferencing-ports
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc03-realtime-adapter-features
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc04-share-and-chat-ui
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc05-device-settings
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc06-web-csp
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc07-background-effects
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc08-entity-graph-5-0-1
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc09-local-history
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc10-local-recording
node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- new change wc11-conferencing-boundary
```

## Review record

- **Security review of the CSP diff:** ADOPT WITH CHANGES, with 0 critical
  and 1 high finding (`review/security-csp/report.md`). All six conditions
  are written into wc06 and wc07 above.
- **Adversarial plan review:** two rounds, below.

### Round 2 and fixes applied after it

- **Round 2:** verdict BLOCK, with 1 critical, 2 warnings and 1 suggestion
  (`review/plan/findings.json`).
  - Critical: no task added the three adopted libraries to the web app.
    Fixed with task 1.6 (client-shell), which tasks 7.1, 7.2 and 9.2 depend
    on. The install is named in the method carve-out and in batch 1.
  - Warning: the batch 1 pin approval referenced task 1.5's output. The list
    in batch 1 is now final, and task 1.5 writes it.
  - Warning: the PGlite Vite wiring was unowned. It is now in task 9.2.
  - Suggestion: the source of the stray 5.0.0 in `node_modules` is now stated.
- **Not re-reviewed:** these fixes were applied after round 2, and two
  rounds is the cap. The critical fix adds one task and changes no ordering.
- Round 1 is in `review/plan/findings-round-1.json` and
  `review/plan/round-1-fixes.md`: 1 critical (the continuous deployment
  prerequisite, now stated with evidence and a fallback) and 5 warnings, all
  applied. One warning was factually wrong (AG-UI); the evidence is recorded.
- **Judge:** `glm-5.3` through the local gateway for both rounds. The
  producer was `claude-opus-5-5`.
