# Decision log: web-conferencing-features

### 2026-11-18T07:25Z — Phase started as the signed successor of web-release
- Operator: "focus on the web release"; goals: screen sharing, chat (everyone or one participant), background blur or image, microphone/camera/speaker management.
- Start-successor manifest signed with the operator's key on "Approve and sign" (ED25519 SHA256:oE4PH+kE…). The first attempt via /kbd-new-phase registered `web-meeting-features` before activation was refused; that id stays pending in the runtime and cannot be reused.

### 2026-11-18 — Operator scope addition during assess
- Operator: "Assess using pglite via the hybrid mobile architecture skill to enable keeping client only history of all sessions, chats, etc. as well as looking at keeping client side recordings in the applications local storage. So we want to look at an initial attempt to support recordings without livekit, so there is a free version available."
- Added to goals.md: client-only history in PGlite (pem-local-first pattern) and client-side recordings in local storage without LiveKit Egress.
- Proposed, not adopted: whether "free version" also means meetings without the LiveKit SFU (peer-to-peer) in this phase. Asked in the assessment.

### 2026-11-18 — Operator: entity graph 5.0.0 from main
- Operator: "We need to update everything to entity-graph 5.0.0 and everything pinning prometheus entity management 5.0.0, but everything from the main branch, and not tagged because there are updates needed there".
- Added to goals.md. Pins found on main: `apps/web/package.json` (entity-graph-core/react 4.3.0), `spikes/agentic-ui/own` (4.4.0), `spikes/agentic-ui/hybrid` (4.3.0), `tooling/versions.toml` `prometheus_entity_management = "4.2.0"`. No Dart or Rust pin on main.
- Upstream main is 84d010b (5 commits ahead of v5.0.0, 300 files). Packages are 5.0.0; no `dist/` is committed, so consuming main needs a build step. Proposed (not adopted): pin the exact commit SHA rather than a moving branch.

### 2026-11-18 — Operator answers to the seven assess questions
1. Free version: "Recording only". Meetings stay on LiveKit; peer-to-peer transport is excluded from this phase.
2. Recording capture: "Composited view". The app composites every participant's video and the screen share and mixes all audio.
3. Who records: "Anyone, with consent". Any participant may ask; everyone is asked and sees the indicator.
4. PRODUCT.md: "Yes, amend it". Browser-local recording added as the free-version path; consent stays mandatory.
5. Entity graph pin: "Pin commit 84d010b" (upstream main, Prometheus-AGS/prometheus-entity-management).
6. Build: "Build from source". Install the packages from that git commit and build them during install; no vendored copy.
7. Phase size: "One phase, staged". One contract and one boundary run; plan in stages: share, chat and devices; then effects; then local history, recording and the entity graph upgrade.
8. "Enable audio" prompt: "Yes, fold it in" to device management.

### 2026-11-18 — Analyze: build-versus-adopt (proposed; adopted only through the contract)
- D-A1 · adopt livekit-client 2.24.1 (already pinned) for screen share, chat (sendText with topic lk.chat, destinationIdentities for private), devices and Enable audio. No token-service change. [analyze · 2026-11-18]
- D-A2 · adopt @livekit/track-processors 0.8.3 with @mediapipe/tasks-vision 0.10.14, assets self-hosted through assetPaths and a pinned segmenter model; lazy-loaded. [analyze · 2026-11-18]
- D-A3 · adopt @electric-sql/pglite 0.5.16 on idb:// inside a leader-elected same-origin worker. [analyze · 2026-11-18]
- D-A4 · adapt pem-local-first: own history tables are the source; transports read them; do not use the snapshot persistence adapter for history (it would keep a second growing copy). [analyze · 2026-11-18]
- D-A5 · install entity graph 5.0.0 at 84d010b through a pinned git submodule, a pre-install build and pnpm pack into file: tarballs; a pnpm git-subdirectory install cannot build upstream (no prepare script, workspace: peer, monorepo tsup config, allowBuilds). [analyze · 2026-11-18]
- D-A6 · build the composite recorder (canvas + mixed audio + MediaRecorder, OPFS worker writer) and the consent protocol; no library fits. [analyze · 2026-11-18]
- D-A7 · operator decision required in the contract: CSP adds script-src 'wasm-unsafe-eval', worker-src 'self' blob:, media-src blob:, img-src blob: (to confirm). [analyze · 2026-11-18]

### 2026-11-18 — Operator: publish entity graph 5.0.1 first
- Operator asked "Should we publish our 5.0.1 fix via NPM in the `/Users/gqadonis/Projects/prometheus/prometheus-entity-management` directory first?", then answered "Yes, publish 5.0.1".
- Supersedes answers 5 and 6 of 2026-11-18 (pin commit 84d010b, build from source) and analyze decision D-A5 (submodule + pack). New intent: Know Meet pins @prometheus-ags/entity-graph-core and -react 5.0.1 from npm once published; C-12 is no longer rejected.
- The release runs in a separate session in that repository, from origin/main (local checkout there is on release/5.0.0, 5 behind and 3 ahead of origin/main). The plan stage waits for 5.0.1 to be on npm.

### 2026-11-18 — Operator: adopt the CSP change
- Operator: "Adopt CSP, run plan".
- Adopted intent (binding once the contract is adopted): the web policy only (meta tag and gateway header) adds `script-src 'wasm-unsafe-eval'`, `worker-src 'self' blob:`, `media-src blob:` and `img-src blob:`. `connect-src` is unchanged, and every WASM, worker and model file is served from `'self'`. The desktop (Tauri) policy is unchanged and guarded by a check.
- Condition carried from analyze: the security-reviewer role reviews the exact directive diff before contract adoption.

### 2026-11-18 — Plan started before entity graph 5.0.1 is on npm
- npm at plan start: entity-graph-core and -react `latest` = 5.0.0, so 5.0.1 is not published yet. The release session's merge and publish steps wait for the operator.
- The operator invoked `/kbd-plan`. Only the entity graph pin change depends on 5.0.1, so it is planned as blocked on publication. Its first task checks `npm view … dist-tags` for `latest: 5.0.1` and stops if that is not shown.

### 2026-11-18 — Security review of the CSP change: ADOPT WITH CHANGES
- Report: `review/security-csp/report.md`. 0 critical, 1 high, 3 medium.
- The plan takes all six conditions: sources added only for hosted output; a desktop byte-identity test against `tauri.conf.json`; an attempt to remove `worker-src blob:`; a gateway header check on worker `.js` responses; self-hosted MediaPipe and model files proven on the hosted build; header and image deployed in one merge.

### 2026-11-18 — Operator: adopt the contract as drafted

Decision: the web-conferencing-features contract is adopted as drafted,
including proposed decisions D1 to D5 (guest local history and recording,
late-joiner consent with stop-on-decline, no chat backfill, grid recording
layout, local retention of received chat with notice and delete).
Provenance: operator answer "Adopt as drafted", 2026-11-18.
Record: kbd-contract-adopt.sh, sha256 24260182fbf1b23999f1f04f26fd590fbb87756d6c275de434d9b6c777016930,
planRevision 1, runtime decision contract-adoption-web-conferencing-features-24260182.
Not covered: the KBD-POLICY-ACK for AGENTS.md and CLAUDE.md, the batch 1 pin
and install approvals, and the entity graph 5.0.1 publish.

### 2026-11-18 — Operator: record the policy acknowledgement; entity graph 5.0.1 published

- Operator: "Record the ACK" and "PEM 5.0.1 has been published".
- Recorded two hash-bound KBD-POLICY-ACK decisions (sha256 8c6e29eda78d87702cc7bfadb261d0032f9fd596b53f13c9080d25eec0f257ae, the same for both files):
  `policy-ack-web-conferencing-features-agents-8c6e29ed` (AGENTS.md) and
  `policy-ack-web-conferencing-features-claude-8c6e29ed` (CLAUDE.md).
- Resolution: VLBV governs. The host's narrow compiler-check exception is not used while code is being written. Generated code runs only at the wc11 boundary (B4) or an authorized B5 repair. Neither policy file was edited.
- Result: method-context is RESOLVED_REFERENCES at revision 607, and the readiness check is READY at digest 24260182….
- npm, checked 2026-11-18: entity-graph-core and entity-graph-react both show `latest: 5.0.1` and `next: 5.0.1`. This clears the publication block on change 8, whose first task still re-checks it.
- Still open: the batch 1 pin approval and the worktree `pnpm install` approval.

### 2026-11-18 — Operator: approve batch 1

- Operator: "Approve batch 1".
- Approved the final pin list, which task 1.5 writes to `tooling/versions.toml`: `@livekit/track-processors` 0.8.3, `@mediapipe/tasks-vision` 0.10.14, `@electric-sql/pglite` 0.5.16 and entity graph 5.0.1.
- Approved `pnpm install` in the phase worktree for tasks 1.4, 1.6 and 8.5.
- Runtime decision: `batch1-approval-web-conferencing-features`.
- Batch 1 is complete: the contract is adopted, the policy ACKs are recorded, the pins and install are approved, and 5.0.1 is latest on npm. Batch 2 (the four shapes) comes after task 1.3.

### 2026-11-18 — Execute: pin record and batch 2

- **Pin record (operator, AskUserQuestion):** "Diverge locally". `tooling/versions.toml` is now a Know Meet fork of the read-only reference copy, with the four pins added. `versions.source.json` sha256 is `066267600a…` with fork policy text. Also approved: `@types/dom-mediacapture-transform` 0.1.12, a required peer of track-processors. Decision `pins-diverge-web-conferencing-features`.
- **Batch 2 (operator, AskUserQuestion):**
  - The four shapes are approved as briefed, with their recommended defaults.
  - `/history` and `/recordings` get routes and the shared adaptive navigation (Home, History, Recordings).
  - A `meter-fill` token is added.
  - The room bar scrolls sideways below 768px.
  - Decision: `batch2-approval-web-conferencing-features`.
  - The contract has no route or navigation clause, so no amendment is needed. Follow-ups: a DESIGN.md amendment for the navigation and the token (design-lead); a WR-5 surface test update and test-id alignment (bdd-quality).
- **Observed for the boundary (task 1.5 prerequisites):** host ports 8080 and 8081 are both in use today, so the compose run must free or remap them. The meeting-creation burst limit is 3 per 600 s per client. Firefox is not in the Playwright cache.
- **CSP condition 2 (avoid `worker-src blob:`), task 6.1:** documented, not removed. The only worker in track-processors 0.8.3 is a Blob-URL frame ticker that cannot be configured, and it falls back to a window timer when blocked. `worker-src 'self' blob:` stays as adopted. Narrowing it to `'self'` is a one-line change to `HOSTED_WORKER_SOURCES`, and wc07 task 7.1 can make it with operator agreement, at the cost of background effects being throttled in hidden tabs. Conditions 3, 4 and 6 move to tasks 6.4, 7.1 and 7.2.
- **Task 8.4 (hybrid spike):** only core is pinned to 5.0.1. The spike does not depend on `-react`; results.md records it as removed. The spec's rule covers packages that depend on the entity graph, so this complies. The hybrid spike keeps its own `pnpm-lock.yaml` outside the root workspace, so task 8.5 must also install in each spike folder that has one.
- **Task 8.5 (lead, mechanical):** ran `pnpm install` at the root, in `spikes/agentic-ui/own`, and in `spikes/agentic-ui/hybrid` with `--ignore-workspace` because hybrid has no workspace file and otherwise resolves against the root. All three lockfiles resolve entity-graph-core 5.0.1 with no 4.x entries. pnpm added `minimumReleaseAgeExclude` for the 5.0.1 packages to the root `pnpm-workspace.yaml` and created `spikes/agentic-ui/hybrid/pnpm-workspace.yaml`, the same pattern as `own`; 5.0.1 was published today, inside the release-age window. The lead ran this instead of build-platform; it was three install commands.
- **wc02 consent rules the contract does not cover (architect, ADR 0002), for operator review at the boundary:** (1) a client busy with another request answers `declined(busy)`; (2) if everyone else leaves while a request is pending, the requester records alone; (3) a late joiner who never answers leaves the recording running; (4) a decline that is sent but lost in transit leaves the recording running; (5) an unsolicited `record-started` shows the indicator and the prompt; (6) chat text is capped at 2,000 code points. The livekit-client 2.24.1 receive side carries no destination identities, so private chat is marked in the stream attributes.
- **wc03 (webrtc-engineer):** speaker selection follows livekit-client's `supportsAudioOutputSelection()`. It is unsupported in Safari and the Tauri macOS WebView even where `setSinkId` exists, which differs from the analysis matrix. WC-6's unsupported branch covers that case. Private chat is marked by a stream attribute the receiver cannot verify, so a modified client could mislabel a broadcast as private (documented in packages/realtime README). Open: whether WebKit rejects `getDisplayMedia({audio:true})`, to be checked at the boundary. `apps/web/tests/unit/lazy-realtime-room.test.ts` needs updating to the new port (client-shell).

### 2026-11-19 — Segmentation model downloaded (operator approval)

- Operator answer to the download question: "Download the model".
- Fetched `selfie_segmenter.tflite` (249,537 bytes) from the pinned `mediapipe-models/.../selfie_segmenter/float16/1/` URL with curl. The new fetch script was not run.
- The md5 matches Google's published `x-goog-hash` (`Oy4+HPx9MVOMrwD/Tg+6jA==`), the same as the `latest` file track-processors fetches by default.
- sha256 `191ac952…658b`, recorded in `apps/web/scripts/segmenter-model.sha256`.
- Task 7.1 is complete. The WASM set is emitted at build time by `mediapipe-assets-plugin.ts`, the backgrounds are WebP files, and static-web-server sets the content types. Dusk is encoded at q98 because q90 banded; design-lead should check its faint streaks.

### 2026-11-19 — Boundary step 1: the pre-commit lint failed

- The operator said "Commit and start" (batch 3 step 1).
- An empty stray file, `tests/release/c-10-web-csp.spec.ts` (an agent typo), was removed.
- The `git commit` triggered the repository pre-commit hook, `pnpm lint`. This was the first execution of generated code. Result: FAIL on `lint:names` (the model file name) and `lint:biome` (107 errors: mostly formatting, plus unused variables, a needless `String.raw` and a Playwright describe callback). The other six gates passed. No commit was created.
- Evidence: `evidence/boundary-2026-11-19/precommit-lint-attempt-1.log`.
- Under VLBV, fixing these is a B5 repair, which needs operator authorization and consumes one of three repair attempts. Nothing has been fixed yet.

### 2026-11-19 — Boundary r1, step 2 (lint) failed on flutter analyze

- Repair 1 landed as commit `e0c5eb98`, and the token prep landed as `e0d69c99`. The admit check returned READY.
- r1 step 1 (install) passed. Step 2 (`pnpm lint`) failed on `lint:native`: `flutter analyze` reports a missing required `meterFill` in `apps/mobile/lib/shared/ui/km_palette_of.dart` `_fromScheme`. The regenerated tokens made the field required.
- Proposed one-line fix: `meterFill: c.tertiary` in the fallback, which only the VS-3 negative control uses.
- This is repair attempt 2 of 3 and is waiting for operator authorization.
- Evidence: `evidence/boundary-2026-11-19-r1/`.

### 2026-11-19 — B5 repair attempt 2 authorized (2 of 3)
Operator: "Authorize repair 2". Fix: `meterFill: c.tertiary` added to `_fromScheme` in `apps/mobile/lib/shared/ui/km_palette_of.dart` (r1 failed `lint:native` on missing_required_argument). Runtime decision `b5-repair-2-web-conferencing-features`. Packet re-runs from step 1 into `evidence/boundary-2026-11-19-r2/`.

### 2026-11-19 — Boundary r2 FAIL at typecheck
Run r2 at candidate `917b82ce`: install and lint pass (lint:native fixed). `pnpm typecheck` fails in release-tests with two TS2339 errors (the `browserType` fixture in `wc-7-local-history.spec.ts`). Turbo aborted the remaining typecheck tasks, so the full error set is unknown. One repair attempt is left. Asked the operator whether to run a full diagnostic typecheck (`--continue`) before spending it. Evidence: `evidence/boundary-2026-11-19-r2/`.

### 2026-11-19 — B5 repair attempt 3 authorized (3 of 3, final)
Operator: "Use repair 3 now" (declined the diagnostic sweep). Fix: the WC-7 spec uses the public `playwright` worker fixture (`playwright[browserName]`) instead of the non-public `browserType`. Runtime decision `b5-repair-3-web-conferencing-features`. No repair budget remains: another failure closes the phase unmet unless the operator signs a budget amendment.

### 2026-11-19 — Boundary r3 FAIL at unit tests; repair budget exhausted
Run r3 at candidate `440156e2`: install, lint and typecheck pass. `pnpm test` fails one web unit test (`lazy-realtime-room.test.ts:51`, expected 1 notification, got 5), probably because the wc02 fake rewrite now publishes during connect. 3 of 3 repairs are used. No further fix without a signed contract amendment raising `repairAttempts`; otherwise the phase closes unmet. Asked the operator to choose. Evidence: `evidence/boundary-2026-11-19-r3/`.

### 2026-11-19 — Child wc-boundary-defect-scope: full static measurement; amendment 1 drafted
Sweep at `440156e2`: lint, typecheck and the full build pass. 1 unit test fails (D1). build:hosted passes once `KM_LIVEKIT_URL` is set (D8). sccache hung the Rust build for 81 min (D9). The seam scan found D2–D7 (WC-11 pin and lockfile checks, WC-10 tag, compose ports, default-build server, stale header). Amendment 1 is drafted (`amendment-1-proposal.md`, `amend-contract-1.jq`): repairAttempts 3→5, timeMinutes 1500→2100, batched repair policy, run-to-completion static gates, five run inputs. Not applied, not signed.

### 2026-11-19T20:32Z — Operator: "Approve and sign" (amendment 1); signature pending
Amendment 1 applied to `adopted-contract.json` (prior kept as `adopted-contract.v1-prior.json`), new digest 7062a5d7…. Manifest `amend-contract-1.manifest.json` generated with `kbd-scope-authority-template.sh` (previous 24260182…, no scenario changes). The lead's attempt to sign with the operator's key was denied by this harness's permission classifier; the operator signs it. Until it is signed and adopted, readiness is expected to report the contract as stale, and no repair or boundary step runs.

### 2026-11-19 — Boundary r4: static PASS; packaged run FAIL on a run input (meeting-creation limit)
r4 under amendment 1. Steps 1–9 PASS: static steps on the first run at `aea6d789`, then the header (6.4, `72e2a1d8`), images and compose. Step 10, the packaged run: 26 pass, 23 fail. 22 of the failures are the local token service's meeting-creation limit (compose default 3 per 600 s per client, already recorded in the 2026-11-18 prerequisites). 1 is a WC-12 harness defect: `fill()` grants user activation. No WC behaviour scenario reached its feature. Proposed repair 5 (the last): run inputs `KM_MEETING_RATE_LIMIT_BURST`, `KM_MAX_CODES_PER_CLIENT` and `KM_MAX_USED_CODES_PER_CLIENT` raised for the packaged stack, plus a no-activation input setter in `src/wc-room.ts`. Asked the operator.

### 2026-11-20 — WC-13 FAIL at the closing reviews; operator: "Do the repair.  Get this correct."
The WC-13 spec first ran at the closing reviews (one run, release hook opened on the operator's "Yes"): axe 4 of 5 tests failed (negative control passed) and the independent UI review returned BLOCK. The room shell is not pinned to the viewport: chat messages and most device settings are hidden at 768 and wider, and the control bar leaves the view during a share. The r7 WC-5 screenshot shows the same defect, so r7's chat and device scenarios passed on presence, not visibility. Plus new-surface accessibility defects (focusable content behind open dialogs, label-in-name mismatches, a low-contrast selected toggle, a nameless focus stop, a focus stop with no visible change). The shared secondary button fill is an incumbent design-system choice and is out of this repair. Evidence: `evidence/wc13-2026-11-20/` (triage.md, run-1.log, screenshots).
Amendment 3 applied (`amend-contract-3.jq`; prior kept as `adopted-contract.v3-prior.json`): repairAttempts 7→8, timeMinutes 2700→3300, no scope or scenario change. Canonical digest fc068643… → d10814e6…. Manifest `amend-contract-3.manifest.json` generated; the operator signs it. Code work for repair 8 proceeds; the boundary rerun waits for the signed adoption.

### 2026-11-20 — Repair 8 committed (`b7249a4f`); rerun waits for the signed amendment 3
Root causes measured with read-only probes against the r7 images (details in `evidence/wc13-2026-11-20/triage.md`): the room grid's empty notices row left the grid (`empty:hidden`), shifting the body into the `auto` row and the bar into the `1fr` row; Base UI 1.9 modal dialogs only `aria-hidden` outside content and refocus on the next frame, so fast Shift+Tab left the consent dialog; label-in-name mismatches on the chat badge, "Stop rec" and recording cards; the toast root was a Tab stop with no focus fill. Findings A (secondary buttons) and D (segmented toggle) follow DESIGN.md D-6; the WC-13 probe gains an opt-in text-identified exemption (WR-8 unchanged). E (contrast during a fade) and H (0-byte recording in a fast tour) were measurement and tour limits. The WC-13 oracle now also checks room geometry. Pre-commit lint passed; `/verify` was not run before the commit (VLBV: the boundary rerun is the verification). Nothing pushed. Follow-up candidate: a recording stopped within about a second is kept as an unplayable 0-byte file.

### 2026-11-20T21:18Z — Amendment 3 signed on operator instruction and adopted
Operator: "sign it for me". The lead ran `ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n prometheus-kbd-scope-amendment amend-contract-3.manifest.json` on that instruction; the operator did not sign at the keyboard. `kbd-contract-adopt.sh … --supersedes contract-adoption-web-conferencing-features-fc068643 --amendment … --signature …` returned ADOPTED decision `contract-adoption-web-conferencing-features-d10814e6`, bound revision 4. Readiness: `READY … digest=d10814e6… planRevision=1`.
Method context now reports CONFLICT: AGENTS.md and CLAUDE.md hash 2f36b160… is not acknowledged (the prior ACKs cover 8c6e29ed…). The change is the operator's uncommitted "Goals-first development" section (8 lines). The B5 rerun waits for the operator's KBD-POLICY-ACK for the current hash. The listed blockers are hybrid-shell-foundation items, unchanged.

### 2026-11-20 — Operator: "Yes, ack and run"; policy ACKs for hash 2f36b160
Recorded `policy-ack-web-conferencing-features-agents-2f36b160` and `…-claude-2f36b160` (superseding the 8c6e29ed ACKs). Resolution unchanged: VLBV governs; the host compiler exception is not used during generation. Method context: RESOLVED_REFERENCES. B5 rerun of the in-room scenarios plus WC-13 at `b7249a4f` starts.

### 2026-11-20 — B5 rerun r8 at b7249a4f: FAIL on WC-4; WC-13 one hover cell
Evidence `evidence/boundary-2026-11-20-r8/` (triage.md). 50/54 passed. Gate FAIL: WC-4 only, where the effect was active 0.8 s after the click but the page stopped answering Playwright for 15 s, so the oracle never saw it (root cause unproven; r5–r7 passed). WC-13 failed only on the playback play button's hover fill at 1440 (pointer left over it). WR-4 signal unchanged from r7. Repair budget exhausted (8/8). Waiting for the operator's decision; no further run without a signed amendment.

### 2026-11-20 — Operator: "Diagnose WC-4 first"; diagnosis from the r8 trace
WC-4's failure is a ~19 s freeze of A's page right after MediaPipe starts (identical frames at +1.3 s and +11 s, clock stuck at 00:04; paint rate collapsed on both pages), while the adapter reported `active` 0.8 s after the click. Headless Chromium runs WebGL on SwiftShader in a GPU process both pages share. Not established: whether GPU-backed Chrome freezes at all. Details in evidence/boundary-2026-11-20-r8/triage.md. No code changed, nothing run.

### 2026-11-20 — Operator: "Yes, measure it"; WC-4 freeze is a product defect
Measured once per mode (evidence/wc4-measure-2026-11-20/findings.md). GPU-backed headed Chromium on an M1 Max: effect active in 1.0 s, then a single 6.5 s main-thread stall. Headless software graphics: active in 0.3 s, then long tasks on 88 % of the next 30 s. The first-use freeze happens with a real GPU, so it is a user-facing defect in the background-effects feature, not only a test-machine artefact. The cause inside the effect start is not yet isolated. Nothing changed in code.

### 2026-11-20 — Operator: "Yes, profile it"; WC-4 stalls located in track-processors
CPU profiles (evidence/wc4-profile-2026-11-20/findings.md): on a GPU the stall is the first processed frame waiting in `glUseProgram` for MediaPipe's shaders to compile and link (0.5 s warm, 6.5 s observed cold); on software graphics it is `new VideoFrame(webglCanvas)` read-back in every frame, saturating the page while an effect is on. Both are in the library's main-thread pipeline, not in our adapter. Three fix options recorded; none chosen.

### 2026-11-21T00:40Z — Operator: "Yes, do as you recommend"; amendment 4 drafted, signature pending
Repair 9 carries options 1 and 2 for the WC-4 freeze: background effects are reported unavailable when WebGL renders in software, and the effect engine is prepared when the effects section is shown ("Preparing background…"), so the one-time shader compile happens before a choice. The WC-13 hover test fix rides along. Amendment 4 applied (`amend-contract-4.jq`; prior kept as `adopted-contract.v4-prior.json`): WC-4 positive path runs in a headed Chromium with hardware WebGL, software path checks the unavailable state and responsiveness; repairAttempts 8→9, timeMinutes 3300→3900. Canonical digest d10814e6… → 68a4a868…; scenario change: WC-4 modified. Manifest `amend-contract-4.manifest.json` generated; the operator signs it. No code changed and nothing run until adoption.

### 2026-11-21 — Amendment 4 signed on operator instruction and adopted
Operator (remote): "You sign it for me as I am remote". The lead ran `ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n prometheus-kbd-scope-amendment amend-contract-4.manifest.json` on that instruction; the operator did not sign at the keyboard. `kbd-contract-adopt.sh … --supersedes contract-adoption-web-conferencing-features-d10814e6` returned ADOPTED decision `contract-adoption-web-conferencing-features-68a4a868`, bound revision 5. Readiness: `READY … digest=68a4a868… planRevision=1`. Repair 9 code work begins.

### 2026-11-21 — Repair 9 committed (`8f6297ef`); B5 rerun r9 started (WC-4, WC-13)
Effects are reported unavailable on software WebGL (`failIfMajorPerformanceCaveat` or a SwiftShader/llvmpipe renderer name), with the note "Background effects aren't available on this device…". The Background section prepares the processor when shown: one segmented frame at blur radius 0 (others see the unchanged frame), then back to pass-through; new port method `prepareBackgroundEffects`. WC-4 split into a GPU path (headed Chromium, renderer recorded, main-thread gap ≤ 2 s after each choice) and a software path (unavailable note, no processor, mute answers within 2 s). WC-13 parks the pointer before each audit and audits the unavailable note on software. Pre-commit lint passed after formatting with the repo config. Rerun script `run-r9.sh`, evidence `evidence/boundary-2026-11-21-r9/`. Known limit: a disabled pass-through processor stays on the camera track after preparing; the tile attribute and status report no effect, which is what others see.

### 2026-11-21 — B5 rerun r9 at 8f6297ef: WC-4 GPU path PASS (freeze gone); two test-side failures
Evidence `evidence/boundary-2026-11-21-r9/` (triage.md). 6 of 8 passed. WC-4 GPU path on ANGLE Metal: longest main-thread gap after blur, image and off 51/51/46 ms against 2000 (r8: 19 s). WC-13 surface audits pass in both themes, including the former hover cell. Failures: WC-4 software path asserted "not available on this device" while the copy says "aren't available on this device" (the product showed the note, no choices, no processor); WC-13 keyboard tour still focuses the effect radios, absent on software graphics. Both are defects in the repair 9 test edits, not in the product. Repair budget 9/9 used; no further change or run without a signed amendment.

### 2026-11-21 — Amendment 5 signed on operator instruction and adopted; repair 10 (test-only)
Operator (remote): "Approved" to drafting and signing amendment 5. Applied `amend-contract-5.jq` (prior kept as `adopted-contract.v5-prior.json`): repairAttempts 9→10, timeMinutes 3900→4200, no scenario change. The lead ran `ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n prometheus-kbd-scope-amendment amend-contract-5.manifest.json` on that instruction; the operator did not sign at the keyboard. Adopted decision `contract-adoption-web-conferencing-features-52468f64`, bound revision 6; readiness READY at digest 52468f64…. Repair 10 committed as `fe60f63b`: WC-4 software test matches the product wording; WC-13 keyboard tour visits the effect radios only when offered. Pre-commit lint passed. No product code change.

### 2026-11-21 — B5 rerun r10 at fe60f63b: both tests PASS
Evidence `evidence/boundary-2026-11-21-r10/` (triage.md). WC-4 software path PASS (mute answered in 83 ms); WC-13 keyboard PASS (no problems). Same images as r9. Every WC-4 and WC-13 test now passes at product code 8f6297ef. Not covered: keyboard operation of the effect radios (not offered on software graphics). Next: independent UI review of the repair 9 UI, then push approval.

### 2026-11-21 — PR #16 pushed, UI review PASS, merged (59543ab1)
Operator: "Push and start review", then "Use gh to merge the PR", then "Fix first". CI typecheck failed on the repair 9 WC-4 heartbeat helper (strict index access); fixed test-only in `6d6512ba` (no behaviour change), full workspace typecheck passed locally. Final CI: repo rules/typecheck/test/build PASS, cargo PASS; Flutter goldens FAIL and WebView2 gate FAIL, both pre-existing (main's 2283bfb8 CI fails the same Flutter goldens; the WebView2 gate failed on every prior run including merged PR #14); not required checks (state UNSTABLE). Independent UI review (same model, fresh context, file read only): PASS with 4 warnings deferred to a follow-up — W1 aria-busy during preparing, W2 "Preparing" shown when an effect is on / flicker on warm opens, W3 unavailable copy cause and missing remedy differ from approved shape §6, W4 no screenshot of either new state. Merged with a merge commit at 2026-11-21T10:05:46Z; `images` and `ci` runs started on main. Hosted run pending.

### 2026-11-21 — Hosted run of 59543ab1: WC-7 fails; amendment 6 signed and adopted (repair 11)
Hosted run (evidence/boundary-2026-11-21-hosted, paced to the production meeting limit; live web content byte-identical to the pinned image, deployed-digest-comparison.md): Chromium WC-1, 2, 3, 4, 5, 8, 12 PASS; WebKit WC-2 PASS; WC-7 FAIL (B's message and the meeting end missing from A's history after a reload). WC-13 has no hosted test (all @packaged-only). Firefox cells BLOCKED: firefox-1572 was not installed (now installed on operator approval).
Diagnosis (evidence/wc7-diag-2026-11-21/findings.md): WC-7 passes twice on the packaged stack; a page load right after Leave loses the end time every time locally. Cause: Leave is not awaited by the room view, and single-statement history writes are not flushed to IndexedDB.
Operator (remote): "Approved and do it all for me" — to amendment 6, repair 11, installing Firefox, and carrying the fix through merge and the hosted rerun. The lead ran `ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n prometheus-kbd-scope-amendment amend-contract-6.manifest.json` on that instruction; the operator did not sign at the keyboard. Applied `amend-contract-6.jq` (prior kept as `adopted-contract.v6-prior.json`): repairAttempts 10→11, timeMinutes 4200→4500, no scenario change. `kbd-contract-adopt.sh` returned ADOPTED decision `contract-adoption-web-conferencing-features-3bf75c23` (bound revision-7, supersedes …52468f64); readiness READY.

### 2026-11-21 — Repair 11 merged and live; phase CLOSED (PASS)
Repair 11 (032d9dcf, 7668ea05; test setup 7635da8f): history writes flushed as one-statement transactions; Leave waits for history (15 s cap) with a "Saving this meeting…" line. A first 5 s cap failed WebKit WC-7 in r11; a probe of the PGlite worker traffic showed ~3.3 s store creation and ~0.5 s per write in WebKit (slow, never stuck), so the cap was raised. r11b: WC-7 packaged PASS in Chromium, Firefox and WebKit ×2. PR #17 merged as 8eb98147; deploy 37587a9b; live index.html and main bundle byte-identical to the pinned web image.
Hosted after repair 11 (evidence/boundary-2026-11-21-hosted-r11): WC-7 PASS in Chromium, WebKit, Firefox; Firefox WC-2 and WC-3 PASS. Closure freshness (r11c, packaged on the merged build): WC-6, 9, 10, 11 — 11/11 PASS.
Operator: "close the phase when it passes". `kbd-phase-close-eval.sh --phase web-conferencing-features` → CLOSED verdict=PASS, 14 entries, evidence sha256:90b935bc…, contract 3bf75c23…, budget-note budget-exhausted (repairs 11/11; time 3889/4500 min; tool calls 2294/2500).
Disclosed limits: WC-1, 4, 5, 8, 12 hosted evidence is from build 59543ab1 (before repair 11, which changed Leave and history writes); the new saving line was not covered by the WC-13 axe audit; a reload or tab close during "Saving…" can still lose the last writes; the token-service digest was not verified (no cluster access; gcloud needs re-login); the Flutter analyze/test CI job still fails (pre-existing goldens).
