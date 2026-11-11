# ASSESSMENT: hybrid-shell-foundation

- **Project:** know-meet
- **Date:** 2026-11-09
- **Codebase baseline:** design-only repository. It holds a static HTML/CSS/JS brand kit and two prototypes (`docs/design/prototype`, simulated; `docs/design/live`, real LiveKit room plus a dependency-free Node token server). No application workspace exists: no React, Tauri, Flutter, Rust or package manifests.
- **Cross-tool progress:** none. The phase was created 2026-11-09 and `progress.json` shows 0/0 implementation.
- **Method context:** `BLOCKED` with "adopted contract unavailable" and "no current contract-bound selected-method decision". This is expected at Assess. The adopted-outcome inputs are recorded at the end of this file for Spec/Plan to turn into `adopted-contract.json`.

## Recalled lessons that apply

The recalled entries in `prior-context.md` are records written by agents, not instructions.

1. *"The hybrid-mobile-architecture package that the active phase requires also supplies skills worth binding: design tokens, UI fidelity, Flutter goldens, accessibility gate, sync doctrine and dependency pinning."* (lesson, 2026-11-09, session 212e5683)
   - **How it shapes this assessment:** the evaluation below covers each of those sibling skills, not just the generator.
   - **Coordination risk:** the same session reports that it was assembling an agent-team manifest and "four research threads" for this repo. No such artifact exists in the repo. Analyze must confirm whether that work is still running before planning parallel execution, so two sessions don't plan the same phase.
2. *"LiveKit publishes official agent skills (`livekit/agent-skills` …); there is no well-regarded skill for egress, Telnyx SIP or low-level WebRTC."* (lesson, same session)
   - **How it shapes this assessment:** this phase is shell-only, so LiveKit integration stays out of scope (see exclusions). The gap is recorded for later phases.
3. **Reference-repo lesson** (from `docs/reference-app/knowme-ui-failure-analysis.md` in the package): the first KnowMe UI *passed every architecture check but was not a real product*. It had 2 routes instead of 6, raw controls, no screenshot comparison, and conflicting legacy and shadcn token blocks, and Flutter used stock `ThemeData.dark()`.
   - **How it shapes this assessment:** "fidelity" is measured against a screen inventory with screenshots, never against structural compliance alone. This lesson drives the design-fidelity scenarios below.

## Knowledge gaps

*(none recorded in prior-context.md)*

## Implementation status

| Area | Status | Detail |
|---|---|---|
| Workspace and monorepo | MISSING | No root manifest, package manager config or toolchain pins in this repo |
| React 19 web shell | MISSING | Only static HTML prototypes exist |
| Tauri desktop powered by the web code | MISSING | — |
| Flutter mobile shell | MISSING | — |
| Clean-architecture layering | MISSING | No source code exists |
| shadcn/ui component set | MISSING | — |
| Design tokens as code | PARTIAL, **not reconciled** | `docs/design/tokens.json` (80 lines, schema `know-meet-tokens/v1`, dark and light) and `tokens.css` (49 lines). No build consumes them. They are **not** complete relative to what the prototype renders. See "Token source reconciliation" below |
| Look-and-feel reference | DONE (as reference) | 9 prototype pages plus `brand-guide.html`, `mood-board.html` and `brand-template.html`. `km.css` (778 lines) and `room.css` hold the component styling the shell must reproduce |
| Project rules (AGENTS.md, CLAUDE.md) | MISSING → created this stage | Written at the operator's request: kebab-case naming and the 500-line rule (see "Naming and size rules" below) |
| Build, test and lint commands | MISSING | `project.json` holds null placeholders |

## Token source reconciliation (blocks goal 6)

The prototype renders from `docs/design/prototype/assets/km.css` (lines 62–161), not from `tokens.json`.

- **Missing tokens.** `km.css` defines 17 tokens that are absent from `tokens.json`:
  - Surfaces: `--tile`, `--tile-2`, `--scrim`
  - Status colours: `--green-text`, `--green-soft`, `--amber-text`, `--amber-soft`, `--red-text`, `--red-soft`
  - Hover states: `--ember-btn-hov`, `--danger-btn-hov`
  - Elevation and focus: `--shadow-float`, `--shadow-card`, `--ring-input`
  - Layout: `--header-h`, `--page-max`
  - Other: `--orb`
- **Conflicting value.** `--text-display` is `clamp(36px, 3.6vw + 18px, 64px)` in `km.css` (line 109) but `clamp(40px, 4vw + 16px, 72px)` in `tokens.json` (line 36) and `tokens.css`.
- **No weights or line heights.** `tokens.json` has neither. `km.css` uses weights 500/600/700 and a 1.5 body line-height.
- **Consequence.** Under the blocking constraint `design-tokens-single-source`, a shell generated from `tokens.json` today *cannot* reproduce the prototype.
- **Wider scope still to reconcile** (round-2 review): hardcoded colours and sizes inside component rules (for example `#D5DAE1`; 11/13/15px text), per-rule weights and line-heights (body weight 400 included), animation durations and keyframes, and the reverse direction (`radius-pill`, `dot-*` exist in `tokens.json` but not in `km.css`). `--orb` is a component alias, not a missing primitive.
- **Fonts:** the prototype loads Space Grotesk, Inter and JetBrains Mono from the Google Fonts CDN. The shells need bundled fonts: offline Tauri, a CSP that allows them, Flutter asset fonts, and a licence check (all three are OFL).
- **Theme behaviour to replicate:** dark by default, `km-meet-theme` in localStorage, falling back to `prefers-color-scheme`, set by a pre-paint script on `<html data-theme>` so there's no flash of the wrong theme.
- **Prerequisite for any token pipeline work.** Decide which file is canonical (`km.css` is what actually renders). Then reconcile the missing and conflicting tokens into the single source.

## Generator fit (hybrid-mobile-architecture package)

Source: `/Users/gqadonis/Projects/hybrid-mobile-architecture-src`, read-only. Entry skill: `skills/hybrid-mobile-architecture/SKILL.md` (KnowMe Builder v2.0.0-alpha.5). Generator: the Rust `knowme-builder` CLI.

1. **No profile matches the phase goal.** The `builder.manifest.json` profiles are:
   - `sovereign-hybrid`: flutter-mobile + tauri-desktop + rust-core
   - `governed-web-shell` / `axum-web`: react-web + axum-bff
   - `tauri-desktop`
   - `flutter-mobile`

   None produces "React web + Tauri using the same web code + Flutter".
2. **Web and desktop are generated as duplicates.** `baselines/web/web/src/features/notes/*` mirrors `baselines/tauri/desktop/src/features/notes/*`. Each JS app has its own npm `package.json` and lockfile, and there is no pnpm, turbo or melos workspace. The package's own docs (`knowme-poc-…plan.md` §5.3, "same Vite bundle serves the native webview and plain web") describe the target this phase wants, but the generator doesn't emit it. Goal 2 cannot be met by running a profile unchanged.
3. **The reference repo is read-only** (constraint `reference-repo-read-only`). A new combined profile therefore cannot be added upstream from this phase. Analyze must choose between:
   - **(a)** generating the closest profiles, then restructuring into one shared web package under an OpenSpec change;
   - **(b)** asking the operator to add a profile upstream in a separate phase in that repo;
   - **(c)** generating `sovereign-hybrid` + `governed-web-shell` side by side and merging.

   Goal 1 ("no hand-rolled substitute for what the skill provides") rules out writing the shell from scratch. It needs an explicit definition of how much post-generation restructuring is allowed.
3a. **What each profile generates besides UI**, which none of options (a), (b) or (c) can ignore:
   - **`sovereign-hybrid`:** flutter-mobile + tauri-desktop + **rust-core** with `uarMode: "hybrid"`, plus the `rust/gen_ui_db`, `gen_ui_notes` and `gen_ui_ffi` crates and `mobile/flutter_rust_bridge.yaml` with `rust_builder`.
   - **`governed-web-shell`:** react-web + **axum-bff**, plus "service UAR, AG-UI/A2UI, PEM/PGlite, governed identity" (`web/server`).
   - **Web and desktop baselines:** both depend on `@prometheus-ags/prometheus-entity-management`, `entity-graph-core` and `zustand`.
   - **Architectural invariant:** SKILL.md Step 3, rule 1 says all networking, LLM, inference, MCP and agent logic lives in Rust.

   The proposed exclusions (authentication, real data and persistence) conflict with several of these payloads. Analyze must classify each surface as **keep, strip or stub** for a shell-only phase. It must also decide whether the Rust-core invariant applies now, and that classification sets the post-generation restructuring budget behind the Goal 1 risk acceptance.
4. **Design-token pipeline gaps** (`skills/hybrid-design-tokens`, `scripts/gen-design-tokens.mjs`):
   - **Source format:** TOML (`tokens.toml`). Know Meet's source of truth is `tokens.json` in a custom schema, so a mapping step or a source decision is needed.
   - **Outputs:** it writes `desktop/src/theme.css` (Tailwind 4 `@theme`) and `mobile/lib/core/theme/tokens.dart` (constants only). It writes **nothing for `web/`**, **no shadcn CSS variables** (`--background`, `--primary`, …) and **no Flutter `ThemeData`**.
   - **Doc mismatch:** a comment says `index.css`, but the script writes `theme.css`.
   **Concrete incompatibilities with Know Meet's values** (`runtime/src/native-helpers/gen-design-tokens.mts`, bundled as `scripts/gen-design-tokens.mjs`, lines 790–836):
   - **Alpha colours rejected.** Every colour must match `/^#[0-9a-fA-F]{6}$/`, so `cyan-soft: rgba(0, 194, 220, 0.14)` and the other rgba tokens fail.
   - **Fonts hardcoded.** The mapping is `{display: spaceGrotesk, sans: inter, prose: roboto, mono: jetBrainsMono}`, and the script expects TOML type entries with size, weight and role, not CSS stacks.
   - **No Flutter equivalent for `clamp()` sizes.**
   - **Missing directories are skipped silently.** An output whose directory doesn't exist (`existsSync(dirname(path))`) is dropped without error, so a combined-workspace layout gets no output and no warning.

   Each of these affects the "write a mapper vs migrate to TOML" decision.
5. **shadcn/ui:**
   - No components are pre-generated and there is no `components.json`. There is no shadcn pin, and Tailwind 4 is not in `versions.toml` (it only appears in `references/tauri/patterns.md`).
   - Nothing links shadcn theming to the tokens. That missing link is the failure mode recorded in lesson 3.
   - For Flutter, the docs reference `shadcn_flutter`, which the package's own lessons flag as having had a stale or invented pin.
6. **Naming conventions conflict.** The generated React baseline uses `NotesScreen.tsx` (PascalCase) and `useNotes.ts` (camelCase), which violates the new kebab-case rule. The package has no file-size limit.
7. **Layering conflict with Goal 4.** Goal 4 and `AGENTS.md` already require **domain / application / infrastructure / presentation**, and neither generator form matches:
   - SKILL.md Step 3 (lines 197–206): `features/<name>/{data,domain,presentation}`, with `app/` acting as the application layer.
   - React baseline: `{api,components,entities,hooks,stores}`.

   Plan must define the **mapping** onto the four mandated layers, for example `data`/`api` → infrastructure, `app/`/`stores`/`hooks` → application, `entities` → domain, `components` → presentation. This is not a choice between two non-compliant options.
8. **Useful sibling skills to bind in Plan:**
   - `hybrid-design-tokens`
   - `reference-ui-fidelity` (screen and state inventory)
   - `tauri-ui-review` (screenshots at 320/768/1024/1440 in both themes)
   - `flutter-golden-ui`
   - `a11y-gate` (WCAG 2.2 AA)
   - `dependency-pin-discipline`
   - `hybrid-runtime-verification` ("works" means observed at runtime)
   - `tauri-custom-titlebar`
   - `mobile-navigation`
9. **Known Tauri pitfalls: verification checks, not work items.** Package `…plan.md` §5.2 is titled "Tauri desktop shell defects (fixed at source)". The baseline already ships `src-tauri/build.rs`, `capabilities/default.json` and `src/vite-env.d.ts`. Plan should *verify* that the generated output still has these, not schedule fixes:
   - Missing `build.rs` / `tauri-build`.
   - No `capabilities/default.json`, so Tauri v2 IPC is blocked by default.
   - `invoke_handler` commented out.
   - Any startup Tauri call blanks the plain web build. Every call must sit behind `isTauri()`.
   - TypeScript 7 removed `baseUrl`, and `vite-env.d.ts` was missing.
   - The dock icon only appears in `tauri build`.

## Build health

- **Build check:** UNKNOWN. No build command exists yet.
- **Toolchain drift.** This was read-only observation; `knowme-builder doctor --json` returned `ok: false` with 4 failing Prometheus health checks.

  | Tool | Installed | Package pin (`versions.toml`) |
  |---|---|---|
  | `knowme-builder` | **2.0.0-alpha.1** | source is **alpha.5**, so the install is stale and must be reinstalled before generating |
  | rustc | 1.99.1 | 1.97.1 |
  | tauri-cli | 2.10.0 | 2.11.4 |
  | pnpm | 11.25.0 | 11.15.0 |
  | Node | 26.5.0 | 26.5.0 (match) |
  | Flutter | **3.48.0-0.5.pre (beta channel)** | 3.47.5 (stable) — channel and version both drift; affects generator preflight and golden-test reproducibility |
  | Dart | 3.14.0-95.2.beta | 3.13.4 |

  Xcode 27.2 is present. `ANDROID_HOME` is set. (An earlier capture of `flutter --version` printed nothing; the adversarial review re-ran it and got 3.48.0-0.5.pre beta, which I confirmed.)
- **Known violations:** none in application code, because there is none.
- **Test coverage:** NONE.

## Constraint check

- **AGENTS.md violations:** N/A before this stage. The file is created now.
- **`constraints.md` violations:**
  - `design-tokens-single-source`: N/A, no app code.
  - `reference-repo-read-only`: respected; this assessment only read it.
  - `no-livekit-secrets-in-repo`: PASS, but only once untracked files are included. The defined check uses `git grep`, which skips untracked files, and `docs/design/live/`, `live/`, `AGENTS.md`, `CLAUDE.md` and `.kbd-orchestrator/` are all **untracked**. Re-run with `git grep --untracked`: no matches for the secret or key patterns. `constraints.md` now uses `git grep --untracked` (updated during this stage).
- **New 500-line rule.** No application code exists yet. The files over 500 lines are design references (below) plus **7 OpenSpec-generated harness files**: `openspec-onboard/SKILL.md` at 575 lines in each of `.agents`, `.claude`, `.dsh`, `.kimi-code` and `.opencode`; `.claude/commands/opsx/onboard.md` at 571; and `.opencode/commands/opsx-onboard.md` at 567. Those are covered by the new exception E-L8. Design references:

  | Lines | File(s) |
  |---|---|
  | 3415 | `meet.html` (in both `prototype/` and `live/`) |
  | 1592 / 1573 | `settings.html` (`live/` / `prototype/`) |
  | 1574 | `agents.html` (both) |
  | 1552 | `dashboard.html` (both) |
  | 1159 | `recordings.html` (both) |
  | 785 | `assets/km.js` (both) |
  | 778 | `assets/km.css` (both) |
  | 719 | `live/assets/live-room.js` |
  | 592 / 588 | `index.html` (`prototype/` / `live/`) |

  See the proposed exception E-L6 below.
- **New kebab-case rule:** project-authored file names comply apart from conventional names (`README.md`, `LICENSE`, `.gitignore`, `.gitkeep`). Tool-generated harness folders contain **60 tracked `SKILL.md` files** plus `.openspec-target`, now covered by the new exception E-N6.
- **Tracking status:** `docs/design/live/`, `AGENTS.md`, `CLAUDE.md` and `.kbd-orchestrator/` are untracked. `docs/design/live/` is a named fidelity source, so it should be committed before it serves as an oracle.
- **Stale duplicate:** the root `live/` folder duplicates `docs/design/live` with outdated run paths. Delete it, pending operator approval.

## Naming and size rules (operator requirement, 2026-11-09)

The adopted rules are in `AGENTS.md` and `CLAUDE.md` at the repo root:

- **Kebab-case file and directory names**, for example `meeting-tile.tsx` exporting `MeetingTile`.
- **No file over 500 lines, whatever the language.** When a file would pass 500 lines, it becomes a directory named for the function or feature. Its contents are split along clean-architecture lines (domain / application / infrastructure / presentation, or the agreed feature-slice equivalent), with an `index` entry that re-exports the public surface.

The exceptions below are **written into `AGENTS.md` and `constraints.md` now so the rules are usable**. They remain **subject to operator confirmation**; E-L6 and E-L7 are explicitly undecided:

### Naming exceptions (where kebab-case is impossible or harmful)

- **E-N1 Dart/Flutter:** `lower_snake_case.dart`. The Dart `file_names` lint and import conventions require it; hyphens break `package:` imports by convention.
- **E-N2 Rust:** source module files are `snake_case.rs`, because hyphens are not valid module identifiers. Crate *package* names may stay kebab-case.
- **E-N3 Tool-mandated names:**
  - Project docs: `README.md`, `LICENSE`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`
  - Rust: `Cargo.toml`, `Cargo.lock`, `build.rs`, `main.rs`, `lib.rs`, `mod.rs`
  - Dart: `pubspec.yaml`, `analysis_options.yaml`
  - JS tooling: `package.json`, `tsconfig*.json`, `vite.config.ts`, `components.json`, `tauri.conf.json`
  - Containers: `Dockerfile`
  - Dotfiles
- **E-N4 Platform scaffolding** generated by `flutter create` or Xcode/Gradle: `AppDelegate.swift`, `MainActivity.kt`, `Info.plist`, `AndroidManifest.xml`, `build.gradle(.kts)`, and so on.
- **E-N5 Framework-generated files** whose names a tool owns, for example `routeTree.gen.ts`, `*.g.dart`, `*.freezed.dart`.
- **E-N6 AI-harness integration files** generated by OpenSpec and other tools inside harness dot-directories (`.agents/`, `.claude/`, `.codex/`, `.dsh/`, `.kimi-code/`, `.opencode/`, `.qwen/`, `.zed/`): `SKILL.md`, command files, `.openspec-target`. Dot-directory contents owned by a tool are exempt; project-authored files elsewhere are not.

### 500-line exceptions (files that cannot or should not be split)

- **E-L1** Lockfiles (`pnpm-lock.yaml`, `Cargo.lock`, `pubspec.lock`).
- **E-L2** Generated code: flutter_rust_bridge output, `*.g.dart`, `*.freezed.dart`, `routeTree.gen.ts`, Tauri `gen/` schemas. Regenerate rather than edit.
- **E-L3** Vendored third-party code, for example `assets/vendor/livekit-client.umd.js`.
- **E-L4** Native platform project files, for example `project.pbxproj` and Gradle wrappers.
- **E-L5** Test fixtures, golden images or snapshot data, and recorded API fixtures.
- **E-L6 (operator decision needed)** The design reference prototypes in `docs/design/**/*.html|css|js`. These are frozen design artifacts, not app code. Splitting them gains nothing for the shell and risks drift from the published brand kit.
- **E-L7 (operator decision needed)** Long-form Markdown docs and specs, for example OpenSpec specs and design READMEs. The proposal is that they *are* covered but split by section into a directory with an index, and that `CHANGELOG.md` is exempt.
- **E-L8** Tool-generated AI-harness skill and command files (same paths as E-N6). They are regenerated by `openspec init/update`, so editing them is futile.

**Enforcement gap:** no checker exists yet. Plan must add a line-count and naming check to the lint command, a pre-commit hook and CI, honouring the exception globs above.

## Spec gap summary

- `openspec/specs/` is empty. There are no capability specs for:
  - the workspace layout
  - the token pipeline (`tokens.json` → Tailwind/shadcn CSS variables → Flutter `ThemeData`)
  - the shared UI kit
  - the shell navigation and screens
  - the naming and size rules
- No screen and state inventory exists to define "perfect replication". The prototypes contain one: `docs/design/prototype/screens.html` lists every screen and state. It should become the fidelity oracle.
- **Unplanned scope to watch:** the prototypes include LiveKit, recording and agent behaviour. Replicating *look* must not pull in *function*.

## Goal progress

| # | Goal | Status | Reason |
|---|---|---|---|
| 1 | Generate with the hybrid-mobile-architecture skill | NOT MET | No combined profile exists; strategy undecided (see Generator fit, item 3) |
| 2 | Tauri UI = React 19 web app | NOT MET | The generator duplicates the web code |
| 3 | Flutter shell | NOT MET | — |
| 4 | React 19 shell with clean architecture | NOT MET | Layering convention conflict unresolved |
| 5 | Shared shadcn/ui set themed by tokens | NOT MET | No generator support; bridge needed |
| 6 | Perfect look and feel first | NOT MET | References exist; no oracle, inventory or screenshot baseline yet |
| 7 | Flutter theme mirrors the tokens | NOT MET | The generator emits constants only, not `ThemeData` |
| 8 | Real build, test and lint commands | NOT MET | — |
| 9 | Full KBD process | PARTIAL | Init, new-phase and assess are done; adopted contract and method decision pending |

## Value scenarios (proposal; not adopted)

These candidates are bounded at 6. Discovery stops once each goal has at least one positive scenario and the rare-critical cases are covered. Likelihood is qualitative.

| ID | Actor → outcome | Basis | Why now | Likelihood | Mandatory constraints | Proposed observation and oracle | Next decision |
|---|---|---|---|---|---|---|---|
| VS-1 | Developer runs the web shell and sees every **in-scope route** from `screens.html` identical to the prototype in dark and light | Goal 6 | Fidelity comes first | High | Tokens reconciled first | Screenshots at 375/768/1024/1440, both themes, per in-scope route. False positive: the same layout with wrong token values, or a subset of routes (lesson 3) | Fix the in-scope route list |
| VS-7 | Operator approves the in-scope subset of the 68 routes in `screens.html` (for example all chrome, navigation and static screens, with function stubbed) | Goal 6; lesson 3 | Without it, "perfect replication" has no finite oracle | High | — | A route list in the adopted contract, each with a screenshot oracle | Adopt the route scope |
| VS-2 | Developer runs `tauri dev` and gets the *same* web build in a native window with a branded titlebar | Goals 2, 4 | Core architecture claim | High | `isTauri()` guard; capabilities file present | Same screenshots inside the Tauri webview plus a bundle-identity check. False positive: a duplicate app that merely looks the same | Confirm the shared-package strategy |
| VS-3 | Mobile user opens the Flutter shell and sees matching colour, type and spacing in both themes | Goals 3, 7 | Lesson 3 (stock `ThemeData`) | Medium | `ThemeData` built from the tokens | Flutter goldens compared with the prototype at 375. False positive: matching colours but default Material type | Accept the mobile fidelity tolerance |
| VS-4 | A designer changes one token value and all three shells update after regeneration | Goals 5, 7 | Prevents token drift | Medium | No ad-hoc hex values | Change a token, regenerate, diff the three outputs | Pick the token source format |
| VS-5 (rare-critical) | Plain web build loads with no Tauri runtime present (no blank screen) | Package pitfall §5 | Silent failure seen before | Medium | Every Tauri call guarded | Load the web build in a browser and check the console. False positive: dev server only | Adopt as a required safety check |
| VS-6 (rejected/deferred) | Working LiveKit room inside the shell | Prototype behaviour | — | — | — | Deferred: look-and-feel phase only | Confirm the exclusion |

## Adopted-outcome contract inputs

These come from explicit operator instructions in `goals.md` and the 2026-11-09 requests. They become adopted only through the contract writer.

- **User operation:** a developer starts each shell (web in a browser, desktop through Tauri, mobile through Flutter) and sees the Know Meet shell, in dark and light themes, visually matching the design reference for **the operator-approved subset of the 68 routes in `screens.html`** (VS-7). Scope is **UNKNOWN** until that subset is adopted; "home and app frame only" would repeat lesson 3.
- **Observed baseline:**
  - No shell code exists.
  - The tokens and 9 reference pages exist.
  - The generator is installed but stale (alpha.1 vs alpha.5).
  - **UNKNOWN:** the cause of the 4 failing Prometheus doctor checks.
  - **UNKNOWN:** the status of the parallel agent-team session.
- **Desired observable result:** VS-1 to VS-5 pass. Build, test and lint commands are defined and green. All files obey the naming and 500-line rules with the adopted exceptions.
- **Supported environments:**
  - macOS (Apple Silicon) for development
  - Web: current Chrome, Safari and Firefox
  - Desktop: Tauri on macOS first. **UNKNOWN** whether Windows and Linux are required in this phase.
  - Mobile: iOS simulator and Android emulator. **UNKNOWN** whether physical devices are needed.
- **Required safety checks:**
  - No LiveKit secrets in the repo or in client code.
  - Tauri capabilities are least-privilege.
  - The web build doesn't break without the Tauri runtime.
  - WCAG 2.2 AA contrast in both themes.
- **Exclusions (proposed):**
  - LiveKit media, recording, agents and the token service
  - Authentication
  - Telnyx and calendars
  - Real data and persistence
  - App-store packaging and signing
  - Changes to the reference repo
- **Risk acceptance:** **UNKNOWN**. The operator should decide how much post-generation restructuring of generator output is acceptable under Goal 1.
- **Decision owner:** Travis James (operator).

## Open questions for Analyze / Plan

0. **Token canonical source:** `km.css` (what renders) or `tokens.json`? Reconcile the 17 missing tokens and the `--text-display` conflict before any pipeline work.
1. Generator strategy for the missing combined profile: options (a), (b) or (c) in Generator fit, item 3, informed by the keep/strip/stub classification in item 3a.
2. Token source of truth: keep `tokens.json` and write a mapper into the package's TOML pipeline, or migrate to TOML? Also, where do the web, shadcn and Flutter `ThemeData` outputs get generated?
3. Mapping of generator layering onto the mandated domain / application / infrastructure / presentation layers (Generator fit, item 7). Files stay kebab-case except under E-N1 and E-N2.
4. Confirm exceptions E-N1 to E-N6 and E-L1 to E-L8 (already enforced provisionally), and decide E-L6 and E-L7.
5. Should Windows and Linux desktop and physical mobile devices be in this phase?
6. Reinstall `knowme-builder` at alpha.5 and align toolchain pins before any generation: rustc, tauri-cli, pnpm, and **Flutter (switch from 3.48.0-0.5.pre beta to pinned 3.47.5 stable)**.
7. Coordinate with, or retire, the parallel agent-team session.
8. **Workspace tooling:** a pnpm workspace with one shared web package consumed by web and Tauri (`versions.toml` pins pnpm 11.15.0, but the baselines ship npm lockfiles); the lockfile strategy; and a Flutter workspace (melos or pub workspaces). Draft the build, test and lint commands for `project.json` (Goal 8) from this.
9. **In-scope route subset** of the 68 prototype routes (VS-7).
10. Commit `docs/design/live/`, `AGENTS.md` and `CLAUDE.md` so the fidelity sources and rules are versioned,. (The secrets constraint already uses `--untracked`.)

## Adversarial review

- **Isolation:** harness-native fresh-context subagent, the documented fallback. The REST gateway was unavailable: preflight found 0 providers and 0 distinct models. The judge and producer are both `claude-opus-5-5`, so this is recorded as `same-model-collision`, a weaker guarantee than a cross-model review. The packet was assembled by hand because `build-review-packet.sh` was refused by a local guard ("Use `uv run python` instead of `python3`").
- **Round 1:** BLOCK, with 2 critical, 7 warnings and 2 suggestions (`review/assess/findings-round-1.json`). The criticals were the incomplete token source and the unassessed generator payloads. All findings were addressed in this revision.
- **Round 2:** PASS, with 0 critical, 4 warnings and 1 suggestion (`review/assess/findings.json`). All three items that could be fixed in the text were corrected after round 2: the wider token-reconciliation scope plus fonts, the stale secrets item, and the exception-status contradiction. The theme-behaviour suggestion is recorded too.
- **Anti-theater screen:** skipped, because the gate script couldn't find the `sycophancy.sh` library. The separate `detect_sycophancy` check on the assessment scored 0.0.

## Sycophancy self-check

- S-02: no existing pattern is endorsed without evidence. The generator is assessed as *not* fitting the goal.
- S-03: twelve concrete gaps and risks are listed.
- S-06: no "clearly" or "obviously".
- `detect_sycophancy` (standard, detect-only) on a condensed summary of this assessment returned score 0.0 with no patterns. Saved to `sycophancy/assess-20261109T084104Z.json`.

ASSESSMENT COMPLETE
