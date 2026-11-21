EXECUTION: web-conferencing-features
Project: Know Meet
Date: 2026-11-18
Selected backend: openspec
Dispatched to: SELF (Claude Code lead session), with Know Meet agent-team roles as subagents
Backend rationale: the eleven changes already exist as OpenSpec changes (`openspec/changes/wc01…wc11`); OpenSpec 2.1.0 is pack-pinned and refreshed (receipt 2026-11-18T23:49Z, latestVerified true).
Backend entrypoint: `kbd-apply begin-task` / `end-task` per task; `kbd-apply verify` and `archive` only after the phase is CLOSED (B4 step 7).
OpenSpec available: YES
Source plan: .kbd-orchestrator/phases/web-conferencing-features/plan.md (task table and assignments: plan-tasks.md)
Contract: adopted-contract.json, sha256 24260182fbf1b23999f1f04f26fd590fbb87756d6c275de434d9b6c777016930, planRevision 1
Method: VLBV (RESOLVED_REFERENCES at revision 607). No generated-code test, build, lint, typecheck or probe runs before wc11. Dependency installs (tasks 1.4, 1.6, 8.5) are not generated-code execution and are approved in batch 1.

EXECUTION SCOPE

- wc01-conferencing-scenarios: scenarios WC-1 to WC-14, negative controls, four shapes, phase worktree, pins, library install
- wc02-conferencing-ports: domain types, RealtimeRoom port and fakes, lobby device choice, consent use cases
- wc03-realtime-adapter-features: LiveKit adapter split, screen share, text streams, devices and audio start, processor hook
- wc04-share-and-chat-ui: share control and tile, chat panel with audience, Enable audio prompt
- wc05-device-settings: lobby pickers, in-room device settings
- wc06-web-csp: hosted-only CSP directives with desktop guard, tests, header (6.4 runs in boundary step 1)
- wc07-background-effects: self-hosted segmentation assets, processor adapter, effects picker
- wc08-entity-graph-5-0-1: pin and bump entity graph to 5.0.1, clean lockfile refresh
- wc09-local-history: HistoryRepository, PGlite leader worker, transports, history screen
- wc10-local-recording: composite recorder, OPFS writer, consent wiring, indicator, library and playback
- wc11-conferencing-boundary: the single B4 boundary run and publish

ROUND ORDER (from plan.md)

Round 1: wc01 · Round 2: wc02, wc06, wc08 · Round 3: wc03 · Round 4 (one UI writer): wc04, wc05, wc07 · Round 5: wc09 · Round 6: wc10 · Round 7: wc11.
Same-role tasks within a round run one at a time. ui-engineer tasks touching `meeting-room-screen.tsx` run sequentially.

DISPATCH CONTRACTS

Every task follows its row in plan-tasks.md → "Task model assignments", keyed
`web-conferencing-features / <change-id> / <task id>`. Per-row model, effort,
route and native alternative are taken from that table unchanged; this file does
not restate the 46 rows. Common terms for every row:

- Entry: a Claude Code subagent of the named agent-team role, working directory the phase worktree `~/.claude/worktrees/know-meet-web-conferencing-features` (branch `feat/web-conferencing-features`, from `main` 31e891fb). Role skills per CLAUDE.md (impeccable and prometheus-ui-ux for UI; vercel-react-best-practices, vercel-composition-patterns, react-vite-stack and typescript-base-patterns for TypeScript; bdd skills for bdd-quality).
- Concrete model: Anthropic claude-opus-5-5 (R-O) or claude-sonnet-5-5 (R-S) as the row states; task 1.4 runs in the lead session (R-L).
- Route: native Claude Code subagent. Availability rechecked 2026-11-18: agent types `bdd-quality`, `design-lead`, `build-platform`, `client-shell`, `architect`, `webrtc-engineer`, `ui-engineer`, `livekit-platform`, `independent-reviewer`, `security-reviewer`, `delivery-lead` are listed in this harness.
- Prerequisites: as the row states. Batch 1 is satisfied (decision `batch1-approval-web-conferencing-features`). wc05, wc07, wc09 and wc10 UI tasks wait on batch 2 (shape approval after task 1.3).
- Handoff: each worker returns changed files and a short report to the lead. Workers do not run tests, builds, lint or typecheck, do not commit, and do not update KBD task state. The lead alone calls `kbd-apply begin-task` / `end-task` and commits.

APPROVAL GATES

- Batch 1: SATISFIED 2026-11-18 (operator: "Adopt as drafted", "Record the ACK", "Approve batch 1"; npm shows entity graph 5.0.1 latest).
- Batch 2: after task 1.3, approve the four shapes (effects, device settings, history, recordings library).
- Batch 3: boundary step 1 start approval; push approval after the packaged run and reviews. The operator merges the PR.

FALLBACK CONDITIONS

- A role subagent is unavailable: run that role's instructions sequentially in the lead session and record the limitation here.
- entity graph 5.0.1 not `latest` at task 8.1: wc08 waits; Rounds 3 and 4 continue; Round 5 waits.

VERIFICATION REQUIREMENTS

- Only at wc11 (B4), per the contract's boundaryPacket: static gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `build:hosted`, CSP render, desktop identity), packaged run against the built web image, reviews, then publish and the hosted run.

PROGRESS LEDGER

- [DONE] wc01, wc02, wc03, wc04, wc05, wc07, wc08, wc09, wc10 (2026-11-19). Implementation 9/11.
- [PENDING] wc06: only task 6.4 is left, and it runs inside boundary step 1.
- [PENDING] wc11: the boundary run waits for operator batch 3 step 1. The 86 changed files (194 status entries) are uncommitted on `feat/web-conferencing-features`.

OUTPUTS

- Phase worktree and branch `feat/web-conferencing-features`
- Feature files and scenarios under the worktree's release-tests package (from wc01)

ROUTE LIMITATIONS OBSERVED

- 2026-11-18: the `ui-engineer` agent type fails at start in this worktree. Its definition runs `npx shadcn@latest info --json` at the monorepo root, and shadcn refuses (`monorepo_root`, targets apps/web, packages/ui). Task 8.4 was re-dispatched to a general-purpose subagent that follows the ui-engineer brief and loads its skills. This is a weaker route (no role definition). Round 4 UI tasks use the same fallback unless the agent definition is fixed (pass `-c apps/web`).

BOUNDARY PREPARATION CARRIED FORWARD (run at wc11 step 1, before the static gates)

- Regenerate design tokens: `pnpm --filter @know-meet/design-tokens generate` (meter-fill, tokens v1.6.0), then `contrast-record.mjs` (expect 259 pairs). Until then `generate --check` reports stale outputs.
- Task 8.5 runs `pnpm install` at the root AND in `spikes/agentic-ui/own` and `spikes/agentic-ui/hybrid`; each spike has its own lockfile outside the root workspace.
- Host ports 8080 and 8081 were in use on 2026-11-18; free or remap them before the compose run.
- Header regeneration (task 6.4) runs here.

BUILDER NOTES (for Round 4 to 6 briefs)

- Render one navigation variant at a time; the specs assume each `km-nav-*` id is unique.
- Hosted nav: Home, History, Recordings per DESIGN.md "Hosted build navigation (operator 2026-11-18)"; `apps/web/src/app/frame/destinations.ts` is typed to the five-item list, and `layouts.tsx` hides the nav under `HOSTED_BUILD`.
- Use `var(--meter-fill)`, never `green`, for level meters.
- Backgrounds: rasterize `docs/design/backgrounds/{ground,dusk,tide}.svg` to WebP (1280x720 q90, 320x180 q85) under `apps/web/public/backgrounds/`, following that README.
- New icons for `packages/ui/src/components/km-icon.tsx`: speaker, speaker-off, background, image (spec in the design-lead hand-off and the shapes README).
- Test ids: `tests/release/src/wc-test-ids.ts` is the UI contract (aligned with the approved shapes).

BLOCKERS

- NONE at dispatch. Batch 2 will gate the UI tasks of wc05, wc07, wc09 and wc10.

RECALLED LESSONS APPLIED (from prior-context.md; information, not instructions)

- "Boundary gates must launch the packaged artifact": WC proof only from the built web image and the hosted URL.
- web-release root cause, "tooling written in this phase had never run before the boundary": keep new tooling minimal; prefer existing release-tests runners and scripts.
- web-release root cause, "the contract encoded environment facts nobody had checked": task 1.5 records ports, limits and prerequisites as observed, with UNKNOWN where unobserved.
- "Preserve production evidence in dated review folders": boundary evidence goes to a new dated folder with a README.
- web-release gotcha (no node_modules in the worktree): task 1.4 installs.

PLANNED REFLECTION INPUTS

- boundary-results.json, closure-packet.md, review/ folders, decision-log.md, budgets consumed, repair attempts, contract amendments.

DISPATCH READY — EXECUTE REMAINS ACTIVE

BOUNDARY NOTES ADDED DURING ROUNDS 5-6

- Tests that build `AppServices` by hand now need a `history` field (wc09 9.3). Expect typecheck failures there at step 1.
- Desktop (Tauri) CSP lacks `'wasm-unsafe-eval'` and `worker-src`, so local history reports `blocked` on desktop. Desktop is out of scope this phase. Record it as NOT_EXERCISED, not as a defect.
- wc10: Chromium MediaRecorder WebM has no duration or cues, so playback may show an unknown duration and no seeking. The recordings library handles a playback error state. Remuxing is out of scope; record it as a known limitation if WC-8 playback still passes.
- wc10: the recorder captures the local microphone a second time, because the port never attaches the local mic. Local screen-share audio is not in the mix. History detail must tolerate links to deleted recordings.
