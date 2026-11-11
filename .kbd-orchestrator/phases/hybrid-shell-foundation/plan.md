# PLAN: hybrid-shell-foundation

- **Project:** know-meet
- **Date:** 2026-11-09
- **OpenSpec available:** YES (1.16.1, managed runner)
- **Changes to implement:** 14
- **Contract:** `.kbd-orchestrator/phases/hybrid-shell-foundation/adopted-contract.json`, sha256 `f91e7c30ac98e27256e4b6d4bcbf4b630760061580f65cd3b923b07b86d786c9`, planRevision 1, decision `contract-adoption-hybrid-shell-foundation-f91e7c30`
- **Inputs:** `assessment.md`, `analysis.md`, `library-candidates.json`, the operator decisions in `decision-log.md` (2026-11-09), `AGENTS.md`, and `.agent-team/know-meet-team/team.json`

## Recalled lessons that change this plan

- *"The hybrid-mobile-architecture package … also supplies skills worth binding: design tokens, UI fidelity, Flutter goldens, accessibility gate, sync doctrine and dependency pinning."* The changes below bind each of those skills to the role that uses them.
- Reference-repo lesson (`knowme-ui-failure-analysis.md`): a UI that passed the architecture checks still wasn't a real product. **Value scenarios and prototype baselines are therefore defined in c03, before any screen is generated.** Fidelity is judged by screenshots against the prototype, not structure.
- Package pitfall: an unguarded Tauri call blanks the plain web build. **VS-5 is a required scenario**, and the `isTauri()` guards are part of c06.

## Operator decisions this plan implements

- **Keep everything the generator produces.** That covers Rust core, flutter_rust_bridge, the Axum BFF, UAR and PEM. Restructuring is limited to three things: merging the duplicated web and desktop React apps into one bundle, kebab-case and 500-line compliance, and mapping onto the four clean-architecture layers.
- **Token values:** what the prototype renders, reconciled into `docs/design/tokens.json`, which stays hand-edited.
- **Token generator:** the package's generator, vendored into this repo and extended.
- **Screen scope:** the app frame plus static home, sign-in, join, dashboard, agents, recordings and settings screens, and the meeting-room layout with media stubbed.
- **500-line exceptions:** the frozen design prototypes are exempt; long docs follow the rule; `CHANGELOG.md` is exempt.

## Trade-offs and scope cuts (surfaced, not hidden)

- **Root `live/` blocks the 500-line check.** It's a stale duplicate of `docs/design/live/` holding files of up to 3,415 lines, and the adopted exemption covers only `docs/design/prototype/**` and `docs/design/live/**`. Recommended: delete it in c01 (task 1.6). Awaiting the operator's answer; the alternative is a temporary exception.

- **"Keep everything" widens this phase.** The Axum BFF, UAR and PEM come in and have to build (VS-9), even though no in-scope screen uses them. That adds build surface and risk; c05 owns it.
- **Ownership gap.** Generator output for `crates/**`, `services/bff/**` and the generator's `uar` folders has **no owner** in `team.json`. The delivery lead must assign it before c05 runs (task 5.1). Proposed owners: architect for `crates/**` and the PEM wiring, build-platform for `services/bff/**` and the UAR directories.
- **Deferred:** Windows and Linux desktop builds, physical-device testing, and interactive flows on the in-scope screens (contract `deferredOptional`).
- **Version drift:** this phase uses the `versions.toml` pins. Installed rustc 1.99.1, tauri-cli 2.10.0, pnpm 11.25.0 and Flutter 3.48 beta are realigned in c01. The generator must be reinstalled at alpha.5 before c05.

## CHANGE LIST (ordered)

1. **c01-workspace-and-repo-rules:** pnpm workspace, toolchain pins and enforced repo rules.
   - Scope: tooling / CI. Depends on: NONE. Owner role: build-platform. Library: cand-003, cand-010, cand-015, cand-016.
   - Size: complexity M; model class medium; customer value MEDIUM (unblocks everything).
   - Details: create the root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` and `turbo.json`. Check in `tooling/versions.toml`, copied from `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/versions.toml` with its source digest recorded. It pins rustc 1.97.1, Node 26.5.0, pnpm 11.15.0, Flutter 3.47.5 stable, Dart 3.13.4, TypeScript 7.0.2, Vite 8.1.5, React 19.2.7 and **tauri-cli 2.11.4**. Derive `rust-toolchain.toml`, `engines` and `packageManager` from it. Task 1.5 installs and verifies every pinned tool plus knowme-builder alpha.5, and blocks c05 and c06 if any version mismatches. Configure Biome and ls-lint with the E-N1 to E-N6 exceptions, and build the line-count checker in `tooling/repo-rules` with the E-L1 to E-L8 exceptions. Wire `lint`, `typecheck`, `test` and `build` scripts, a pre-commit hook and CI. `lint` includes the secret scans from `constraints.md` (`git grep --untracked`). They cover `LIVEKIT_API_SECRET` **and** `LIVEKIT_API_KEY` in every assignment syntax, with negative fixtures proving each pattern fires. Biome import rules (or `tooling/repo-rules`) **enforce dependency direction**: `packages/domain` and `packages/application` may not import UI, Tauri, Flutter or LiveKit modules, and adapters implement application-owned ports. Further rules, each with a negative fixture:
     - **no `any`**: Biome `noExplicitAny` set to error across all TypeScript, generated React included
     - **no ad-hoc colours**: a hex-literal scan over `apps/**` and `packages/ui/**` TS/TSX/CSS and `apps/mobile/lib/**` Dart; only `docs/design/tokens.*` and the generated token outputs are allowed
     - **zero warnings**: `cargo clippy --workspace --all-targets -- -D warnings`, `flutter analyze --fatal-infos`, and Biome errors all exit non-zero

     **Task 1.6** (blocked on the operator): delete the stale root `live/` (recommended) or record an explicit temporary exception. c01 can't complete until this is resolved.
2. **c02-design-token-reconciliation:** make `tokens.json` match what the prototype renders.
   - Scope: design source. Depends on: NONE. Owner role: design-lead.
   - Size: complexity M; model class frontier; customer value HIGH.
   - Details: reconcile the 17 missing tokens, the `--text-display` value, weights, line heights and font families from `docs/design/prototype/assets/km.css` into `docs/design/tokens.json` for both themes, with a WCAG 2.2 AA contrast record. Self-host the OFL fonts in `packages/design-tokens/fonts`. Write a **machine-readable inventory** of in-scope routes, screens and states, with stable IDs and counts, from `docs/design/prototype/screens.html` (VS-7), plus the theme behaviour notes. Record the **source hierarchy** (`tokens.json`, then brand guide, then prototype, then live prototype), and resolve and log every discrepancy between them. **All design sources are `docs/design/prototype/**` or `docs/design/live/**`; the root `live/` duplicate is prohibited.** Each source file's path and digest is recorded.
3. **c03-value-scenarios-and-baselines:** acceptance defined before any generation.
   - Scope: tests. Depends on: c01, c02 (task 2.3). Owner role: bdd-quality. Library: cand-011.
   - Size: complexity M; model class frontier; customer value HIGH.
   - Details: Gherkin features for VS-1 to VS-5, VS-8 and VS-9. Capture prototype screenshot baselines from `docs/design/prototype/**` for every in-scope route, in both themes, at 375, 768, 1024 and 1440, recording source path and digest. Define the **comparison oracle**:
     - a route × viewport × theme matrix
     - a **route/state** × viewport × theme matrix, with every state ID from the c02 inventory mapped to its own baseline
     - per-route pixel-diff thresholds (default `maxDiffPixelRatio` 0.01) and an exception rubric, **frozen before c05 starts**, with design-lead as adjudicator
     - at the boundary, an above-threshold diff FAILs; a below-threshold diff PASSes unless design-lead logs it as a fidelity defect before the run

     The matrix also covers the brand guide (logo, clear space, type rules) and the `docs/design/live/room.html` room layout. Add an **axe-core accessibility check** and **motion checks** to the same Playwright suite: tokenized durations and easing on representative transitions, plus a `prefers-reduced-motion` scenario. **Flutter golden provenance:** design-lead approves the initial goldens against the prototype screenshots before they become the VS-3 oracle. Define the bundle-identity check (VS-2) and the no-Tauri web smoke (VS-5), including their negative controls.
4. **c04-token-generator:** the vendored package generator, extended.
   - Scope: tooling / design. Depends on: c01, c02. Owner role: design-lead. Library: cand-005.
   - Size: complexity L; model class frontier; customer value HIGH.
   - Details: vendor `gen-design-tokens` **unmodified** into `packages/design-tokens/generator/vendor/` (it's over 830 lines; vendored code is exempt under E-L3), recording its source version and licence. Write the extensions as separate modules of at most 500 lines that wrap or replace vendor functions. Replace the TOML reader with a `tokens.json` adapter, and add support for rgba colours, `clamp()` breakpoint resolution and configurable fonts. Make missing output folders a hard error. Emit:
     - web CSS variables for both themes
     - shadcn variable mappings
     - a Tailwind 4 `@theme` file
     - Dart `tokens.dart` and a `ThemeData` builder
5. **c05-scaffold-generation-import:** generate and import everything.
   - Scope: all. Depends on: c01 (including the 1.5 toolchain verification) and **c03**, so acceptance exists before generation. Owner roles: build-platform and architect. Library: cand-001.
   - Size: complexity L; model class frontier; customer value MEDIUM.
   - Details: reinstall knowme-builder alpha.5. Generate `sovereign-hybrid` and `governed-web-shell` in runnable mode into a scratch directory, recording a manifest and digests. Import every surface:
     - Rust crates into `crates/*`, as one Cargo workspace
     - the Axum BFF into `services/bff`
     - UAR and PEM wiring kept intact

     Apply kebab-case renames, keeping the Dart and Rust exceptions. **Task 5.2:** capture `knowme-builder doctor --json` with each failing check ID and diagnostic, map each to a cause and remediation, and confirm the generated React version (19.2.7) and the Flutter iOS and Android platform folders before importing.

     **Task 5.6:** inventory every imported authored file **across all surfaces** (React web and desktop, Flutter, Rust crates, BFF, UAR, PEM), split any file over 500 lines into a feature directory by clean-architecture layer, and run the c01 line checker before downstream work starts. c06 and c07 rerun the checker on their merged outputs before handing off.

     **Task 5.7:** an initial security trace of every token and LiveKit-secret path in the imported BFF, PEM, UAR and Tauri code. The **authoritative trace** is task 13.8, after c06, c07 and c12 are final. It covers `apps/web`, the Tauri webview and Rust host, Flutter, and the Rust bridge and PEM, and must prove every client receives only server-minted tokens.
6. **c06-web-desktop-single-bundle:** one React 19 build for web and Tauri.
   - Scope: UI and desktop. Depends on: c05, c04. Owner roles: client-shell and architect. Library: cand-002, cand-018.
   - Size: complexity L; model class frontier; customer value HIGH.
   - Details: merge the duplicated React baselines into `apps/web`, mapped onto the four layers:
     - feature types → `packages/domain`
     - stores and use cases → `packages/application`
     - PEM, API and Tauri adapters → `apps/web/src/infrastructure`
     - components → `apps/web/src/presentation`

     `apps/desktop` holds only `src-tauri`, with `frontendDist` pointing at `apps/web/dist`. Guard every Tauri call with `isTauri()`. Load the token CSS and self-hosted fonts, and set the CSP to `font-src 'self'`.
7. **c07-flutter-shell-import:** the Flutter app in the workspace.
   - Scope: mobile. Depends on: c05, c04. Owner role: mobile-engineer. Library: cand-017.
   - Size: complexity M; model class medium; customer value MEDIUM.
   - Details: move the mobile app into `apps/mobile`, keeping flutter_rust_bridge and the rust builder. Rerun the c01 line checker on `apps/mobile`. Pin riverpod 3.3.1 (`versions.toml`), plus `go_router` and `shared_preferences` at pub.dev versions checked during this change and recorded with their licences. Wire the generated light and dark `ThemeData`, persist the theme mode, and set up `flutter_lints`.
8. **c08-shared-ui-kit:** the shadcn/ui kit, themed by the tokens.
   - Scope: UI. Depends on: c06, c04. Owner role: ui-engineer. Library: cand-006, cand-007.
   - Size: complexity M; model class frontier; customer value HIGH.
   - Details: initialize shadcn in `packages/ui` with Tailwind 4, the generated CSS variables and class-based dark mode, using kebab-case file names. Add only the components the in-scope screens use, restyled to match the prototype's components in `docs/design/prototype/assets/km.css` and `docs/design/live/assets/room.css`.
9. **c09-app-frame-and-navigation:** the frame on web and desktop.
   - Scope: UI and desktop. Depends on: c08. Owner roles: client-shell and ui-engineer. Library: cand-018.
   - Size: complexity M; model class frontier; customer value HIGH.
   - Details: a TanStack Router route tree for the in-scope routes, and an app bar and navigation that match the prototype. The theme toggle uses `km-meet-theme`, falls back to `prefers-color-scheme` and applies the theme before first paint. The Tauri custom titlebar follows the `tauri-custom-titlebar` skill. Every control gets an accessible name and visible focus, and motion respects `prefers-reduced-motion`.
10. **c10-public-screens:** home, sign-in and join.
    - Scope: UI. Depends on: c09. Owner role: ui-engineer.
    - Size: complexity M; model class frontier; customer value HIGH.
    - Details: static screens matching `docs/design/prototype/index.html`, the `auth.html` sign-in views and `join.html` from the same folder, using the shared kit. Forms render but don't submit. Semantic HTML, keyboard focus and reduced motion are required.
11. **c11-app-screens:** dashboard, agents, recordings, settings and the meeting room.
    - Scope: UI. Depends on: c09. Owner role: ui-engineer.
    - Size: complexity L; model class frontier; customer value HIGH.
    - Details: static screens matching `docs/design/prototype/dashboard.html`, `agents.html`, `recordings.html` and `settings.html`, plus the `meet.html` room layout with media tiles stubbed. Semantic HTML, keyboard focus and reduced motion are required. Each screen is its own feature folder under the 500-line rule.
12. **c12-flutter-frame-and-screens:** the same frame and screens on Flutter.
    - Scope: mobile. Depends on: c07. Owner role: mobile-engineer. Library: cand-009.
    - Size: complexity L; model class frontier; customer value HIGH.
    - Details: a `shadcn_flutter` app frame themed by the generated `ThemeData`, with the `mobile-navigation` skill's bottom bar and rail, and the in-scope screens in phone layouts with golden tests. Flutter accessibility: semantics labels on every interactive widget, focus-traversal order checks, reduced-motion (`MediaQuery.disableAnimations`) tests, and the `a11y-gate` checklist.
13. **c13-fidelity-verification-and-evidence:** the single boundary run.
    - Scope: tests. Depends on: c03, c06 to c12, and **c14** (c13 runs c14's commands). Owner roles: bdd-quality, independent-reviewer and security-reviewer.
    - Size: complexity M; model class frontier; customer value HIGH.
    - Details: after all implementation is complete, run the contract's boundary packet once. The fidelity step evaluates the full route × viewport × theme matrix against the c03 thresholds, and **any unresolved difference blocks the boundary**. Record evidence for VS-1 to VS-5, VS-8 and VS-9. Task 13.8 is the security review: rerun the secret scans and re-check the 5.5 token trace. Task 13.10 is the accessibility gate (axe, reduced motion, contrast) at every viewport and theme. Then the independent UI review.
14. **c14-aggregate-commands:** the real build, test and lint commands across all surfaces.
    - Scope: tooling. Depends on: c05, c06, c07. Owner roles: build-platform, plus delivery-lead for `project.json`.
    - Size: complexity S; model class medium; customer value MEDIUM (Goal 8).
    - Details: must complete before the c13 boundary starts. Extend the root `build`, `test` and `lint` scripts to cover web, desktop, Rust/BFF and Flutter:
      - `cargo check --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace` (including `apps/desktop/src-tauri`), `cargo build -p bff`
      - `flutter analyze --fatal-infos`, `flutter test`, and the non-signing mobile builds `flutter build apk --debug` and `flutter build ios --simulator --no-codesign`, all in `build_health_command`
      - `tauri build --debug`

      Set `build_health_command`, `test_command` and `lint_command` in `.kbd-orchestrator/project.json`. These are the commands c13 runs.

## EXECUTION ROUND ORDER

- **Round 1 (parallel):** c01, c02
- **Round 2 (parallel):** c03, c04
- **Round 3:** c05, after c03's acceptance exists
- **Round 4 (parallel):** c06, c07
- **Round 5 (parallel):** c08, c12, c14
- **Round 6:** c09
- **Round 7 (parallel):** c10, c11
- **Round 8:** c13. This is the boundary; reviewers stay dormant until it.
- **After execute:** `/kbd-reflect` captures lessons, reconciles review findings, and archives or syncs the OpenSpec changes. It's a KBD stage, not a change.

## Scenario → task coverage

| Scenario | Tasks |
|---|---|
| VS-1 | 3.2, 10.1–10.3, 11.1–11.5, 13.1 |
| VS-2 | 6.2, 9.2, 13.2 |
| VS-3 | 7.2, 12.1–12.3, 13.3 |
| VS-4 | 4.2–4.4, 13.4 |
| VS-5 | 3.3, 6.2, 13.5 |
| Safety and accessibility checks (contract `requiredSafetyChecks`) | 1.4, 5.7, 13.8, 13.10 |
| VS-8 | 1.3, 1.4, 13.6 |
| VS-9 | 5.4, 5.6, 13.7 |
| VS-6 | **Deferred:** the working LiveKit room is a contract exclusion (operator Q-A3, 2026-11-09). No tasks. |
| VS-7 | **Scope decision, not a runtime scenario:** the in-scope route list is recorded in 2.3 and adopted by operator Q-A3. Every listed route is checked under VS-1 and VS-3. |

## TASK MODEL ASSIGNMENTS

The following is shared by every row below, so the table doesn't repeat it.

- **Phase path:** `hybrid-shell-foundation`.
- **Harness:** Claude Code (this session, model `claude-opus-5-5`).
- **Worker route:** the native team subagent for the owning role (`.claude/agents/<role>.md`, discovered in this session's agent list). Each worker is launched with that role's owned paths, the repo root as working directory, and the role's skills from `SKILLS.md`. Its result goes back to the KBD driver as evidence.
- **Reasoning effort:** "high" means the harness default plus extended thinking; "standard" means the default.
- **Availability:**
  - The Claude routes are **configured**: the role subagents appear in this session's agent list.
  - Reviewer routes go through **liter-llm** (port 4000) and are **verified** answering on 2026-11-09: judge `k3.1-pro`, critic `MiniMax-M3`.
  - **Codex native alternative:** documentation-verified only; Codex isn't exercised on this machine.

| Change ID | Backend task ID | Requirements | Provider/model | Reasoning | Rationale and dated evidence | Native alternative | Prerequisites |
|---|---|---|---|---|---|---|---|
| c01 | 1.1 | Workspace config, low uncertainty | anthropic/claude-sonnet-5-5 | standard | Mechanical config; fast. Agent tool `model` override, 2026-11-09 | codex (doc-verified) | none |
| c01 | 1.2 | Toolchain pins, environment drift | anthropic/claude-sonnet-5-5 | standard | Pins come straight from `versions.toml` | codex | Operator approval to change local toolchains |
| c01 | 1.3 | Biome, ls-lint, line checker with exception globs | anthropic/claude-opus-5-5 | high | Exception logic is easy to get wrong (round-1 review) | claude-sonnet-5-5 | none |
| c01 | 1.4 | Scripts (lint, typecheck, test, build), secret scans, hook, CI | anthropic/claude-sonnet-5-5 | standard | Conventional wiring | codex | none |
| c01 | 1.5 | Install and verify pinned toolchain and knowme-builder alpha.5 | anthropic/claude-sonnet-5-5 | standard | Gate before c05/c06 (plan review 2026-11-09) | codex | Operator approval to change local toolchains |
| c02 | 2.1 | Token reconciliation, judgement-heavy | anthropic/claude-opus-5-5 | high | Visual fidelity is priority #1 | none | none |
| c02 | 2.2 | Self-host fonts and licences | anthropic/claude-sonnet-5-5 | standard | Asset copying | codex | none |
| c02 | 2.3 | Route inventory and theme notes | anthropic/claude-opus-5-5 | high | Defines the VS-7 scope | none | none |
| c03 | 3.1 | Gherkin features | anthropic/claude-opus-5-5 | high | Acceptance before generation (VLBV) | none | none |
| c03 | 3.2 | Playwright baseline capture | anthropic/claude-sonnet-5-5 | standard | Tooling; needs browsers | codex | Playwright browsers installed |
| c03 | 3.3 | Identity and no-Tauri checks, negative controls | anthropic/claude-opus-5-5 | high | Negative controls need care | none | none |
| c04 | 4.1 | Vendor the generator | anthropic/claude-sonnet-5-5 | standard | Copy and record provenance | codex | Read-only access to the reference repo |
| c04 | 4.2 | Adapter, rgba, clamp, fonts, loud failures | anthropic/claude-opus-5-5 | high | Parser changes; analysis found 4 incompatibilities | none | none |
| c04 | 4.3 | Web, shadcn and Tailwind outputs | anthropic/claude-opus-5-5 | high | Variable mapping drives VS-1 | none | none |
| c04 | 4.4 | Dart tokens and ThemeData | anthropic/claude-opus-5-5 | high | Lesson: stock ThemeData failure | none | Flutter 3.47.5 |
| c05 | 5.1 | Assign owners for `crates/**`, `services/bff/**`, every generated UAR directory and any separate PEM path | anthropic/claude-opus-5-5 | standard | Team-manifest edit by delivery-lead | none | Operator confirms owners |
| c05 | 5.2 | Doctor diagnostics, React 19.2.7 and Flutter platform check | anthropic/claude-sonnet-5-5 | standard | Plan review round 1 | codex | knowme-builder alpha.5 installed |
| c05 | 5.3 | Scratch generation | anthropic/claude-sonnet-5-5 | standard | CLI run with recorded digests | codex | knowme-builder alpha.5 installed |
| c05 | 5.4 | Import all surfaces (React, Flutter, Rust, BFF, UAR, PEM); Cargo workspace | anthropic/claude-opus-5-5 | high | Cross-language integration | none | rustc 1.97.1 |
| c05 | 5.5 | Kebab-case renames and import fixes | anthropic/claude-sonnet-5-5 | standard | Mechanical, wide | codex | c01 rules in place |
| c05 | 5.6 | 500-line inventory and clean-architecture splits | anthropic/claude-opus-5-5 | high | Splitting needs design judgement | none | c01 line checker |
| c05 | 5.7 | Initial security trace of token and secret paths | anthropic/claude-opus-5-5 (security-reviewer) | high | Required safety check | MiniMax-M3 via liter-llm | none |
| c06 | 6.1 | Merge into one bundle and map to four layers | anthropic/claude-opus-5-5 | high | Architecture-defining | none | none |
| c06 | 6.2 | Tauri host, `frontendDist`, `isTauri()` guards | anthropic/claude-opus-5-5 | high | Package pitfalls | none | tauri-cli 2.11.4 |
| c06 | 6.3 | Tokens, fonts, CSP | anthropic/claude-sonnet-5-5 | standard | Wiring | codex | c04 outputs |
| c07 | 7.1 | Import the Flutter app | anthropic/claude-sonnet-5-5 | standard | Move plus lint config | codex | Flutter 3.47.5, Xcode, Android SDK |
| c07 | 7.2 | ThemeData wiring and theme persistence | anthropic/claude-opus-5-5 | high | VS-3 oracle | none | c04 Dart output |
| c08 | 8.1 | shadcn init themed by tokens | anthropic/claude-opus-5-5 | high | Lesson: conflicting token blocks | none | c04 outputs |
| c08 | 8.2 | Components restyled to match the prototype | anthropic/claude-opus-5-5 | high | Fidelity-critical | none | none |
| c09 | 9.1 | Router, app bar, navigation, theme toggle | anthropic/claude-opus-5-5 | high | Frame fidelity | none | none |
| c09 | 9.2 | Tauri custom titlebar | anthropic/claude-opus-5-5 | standard | Skill-guided | none | none |
| c10 | 10.1–10.3 | Home, sign-in, join screens | anthropic/claude-opus-5-5 | high | Visual fidelity | none | c03 baselines |
| c11 | 11.1–11.5 | Dashboard, agents, recordings, settings, room layout | anthropic/claude-opus-5-5 | high | Large visual surface | none | c03 baselines |
| c12 | 12.1–12.3 | Flutter frame, screens, goldens | anthropic/claude-opus-5-5 | high | Cross-platform parity | none | c07 |
| c13 | 13.1–13.7 | Single boundary run and evidence | anthropic/claude-opus-5-5 | high | Boundary packet | none | Operator approval of the boundary run |
| c14 | 14.1–14.2 | Aggregate commands and `project.json` | anthropic/claude-sonnet-5-5 | standard | Wiring after the surfaces exist | codex | c05–c07 done |
| c01 | 1.6 | Delete root `live/` or record an exception | anthropic/claude-sonnet-5-5 | standard | Unblocks the 500-line gate | codex | **Operator decision pending** |
| c13 | 13.10 | Accessibility gate (axe, reduced motion, contrast); Flutter semantics are checked in c12 | anthropic/claude-opus-5-5 | high | Required safety check | none | c03 axe suite |
| c13 | 13.8 | Authoritative security trace after c06/c07/c12 (web, Tauri, Flutter, bridge, PEM) and secret scans | anthropic/claude-opus-5-5 (security-reviewer) plus liter-llm MiniMax-M3 critic | high | Independent of the producer | k3.1-pro | Gateway keys present (verified 2026-11-09) |
| c13 | 13.9 | Independent UI and code review | liter-llm moonshot/k3.1-pro judge | high | Cross-model judge, per operator instruction 2026-11-09 | MiniMax-M3 | Gateway verified; long calls may hit upstream 524 (seen 2026-11-09) |

## Plan review

- **Round 1** (liter-llm, judge MiniMax-M3; Kimi k3.1-pro timed out upstream with 524): BLOCK, with 4 critical and 6 warnings (`review/plan/findings-gateway.json`). All 10 are addressed in this revision:
  - c05 now runs after c03.
  - VS-6 and VS-7 are covered explicitly.
  - `tooling/versions.toml` pins tauri-cli, and task 1.5 verifies the toolchain.
  - c14 adds the aggregate commands.
  - Design source paths are explicit, and the root `live/` folder is prohibited.
  - Task 5.6 adds the 500-line splits.
  - A comparison oracle with thresholds is defined.
  - Secret scans and a token trace are added.
  - An accessibility and reduced-motion gate is added.
  - The reflect stage is noted.
- **Streamed re-reviews of assess and analyze** (MiniMax-M3, 2026-11-09; `review/{assess,analyze}/findings-minimax-stream.json`) raised 6 critical and 12 warnings between them.
  - **Already settled:** token source (operator Q-A2), build command (c14), OpenSpec lifecycle, exceptions E-L6/E-L7.
  - **Folded into this plan:** secret patterns, source hierarchy and machine-readable inventory, brand-guide and live-prototype coverage, motion and reduced-motion checks, golden provenance, the vendored-generator 500-line placement, dependency-direction lint, doctor diagnostics, the React and Flutter platform checks, Rust tests, and dependency pins.
- The judge saw `versions.toml` as missing because the packet lacks the reference repo. The file exists at `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/versions.toml`; c01 now checks in a copy anyway.

- **Round 2** (streamed, judge MiniMax-M3, 2026-11-09; `review/plan/findings-round-2.json`): 5 critical, 7 warnings. All are addressed in this revision:
  - The root `live/` decision is now task 1.6 and blocks c01's completion.
  - Rules for no `any`, no hex colours and zero warnings.
  - Non-signing Flutter APK and iOS-simulator builds in `build_health_command`.
  - An authoritative token trace across every client in task 13.8.
  - 500-line checks on all surfaces.
  - c13 depends on c14.
  - UAR and PEM ownership.
  - The route/state oracle.
  - Thresholds frozen before c05, with an adjudicator.
  - Flutter accessibility.
  - Clippy with `-D warnings`.
- **Unresolved review findings:** the root `live/` deletion vs exception (task 1.6) needs an operator answer. Everything else is resolved in the text. The review-round cap (2) is reached, so this is accepted with the item open, and c01 cannot complete until it is answered.
- The mobile builds run through the `build-passes` constraint at each change's archive. They are not added to the contract's boundary packet, so no contract amendment is needed.

## Contract binding

- **Identity:** the contract path and sha256 digest given at the top of this plan.
- **Freshness keys** (contract `evidenceInvalidation`): contract digest, tested git commit, `tokens.json` digest and prototype baseline digest.
- **Budgets:** 2,400 minutes and 3,000 tool calls; 3 repair attempts; a no-progress limit of 3; tokens UNKNOWN with a per-change checkpoint. When a budget runs out: checkpoint, then mark BLOCKED.
- **Boundary packet:** the contract's `boundaryPacket`. It runs once, only after c01 to c12 are complete, and needs operator approval first.

## COMMANDS TO RUN

The changes are emitted through the managed OpenSpec runner:

```
/opsx:new c01-workspace-and-repo-rules
/opsx:new c02-design-token-reconciliation
/opsx:new c03-value-scenarios-and-baselines
/opsx:new c04-token-generator
/opsx:new c05-scaffold-generation-import
/opsx:new c06-web-desktop-single-bundle
/opsx:new c07-flutter-shell-import
/opsx:new c08-shared-ui-kit
/opsx:new c09-app-frame-and-navigation
/opsx:new c10-public-screens
/opsx:new c11-app-screens
/opsx:new c12-flutter-frame-and-screens
/opsx:new c13-fidelity-verification-and-evidence
/opsx:new c14-aggregate-commands
```

PLAN COMPLETE

## Contract task-ID mapping

`adopted-contract.json` was adopted before c05's tasks were renumbered. Its `ownerTask` reference "c05 5.2" for VS-9 maps to the renumbered **c05 5.4** (import). This is traceability only, not a scope change, so no amendment is needed. Every other contract task reference matches.
