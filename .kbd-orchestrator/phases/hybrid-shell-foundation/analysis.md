# ANALYSIS: hybrid-shell-foundation

- **Project:** know-meet
- **Date:** 2026-11-09
- **Mode:** stack specified, by `goals.md`: React 19, Tauri, Flutter, shadcn/ui, clean architecture. No stack discovery was run, so there is no `stack-recommendation.md`.
- **Inputs:**
  - `assessment.md` (adversarial review PASS, round 2)
  - `prior-context.md`
  - The read-only survey of `/Users/gqadonis/Projects/hybrid-mobile-architecture-src`
- **Budget:** 8 queries per tier and 20 minutes. Used: tier 1: 5, tier 2: 6, tier 3: 3 batches (14 packages), tier 4: 0, matching `library-candidates.json`. Time used was about 18 minutes, under the cap, so confidence was not lowered for budget reasons.

## Recalled lessons and knowledge gaps

- **Applicable lesson:** the knowme-builder package "also supplies skills worth binding: design tokens, UI fidelity, Flutter goldens, accessibility gate, sync doctrine and dependency pinning." Each of those skills appears below as an adopt or reference candidate, not just the generator.
- **Knowledge gaps:** none recorded in `prior-context.md`.

## Landscape summary

1. **Shared web and desktop workspace.** GitHub shows only small, low-star Tauri monorepo templates (`Stormix/vite-tauri-monorepo` 5★, last updated 2024; `rviso/tauri-monorepo-template` 3★, Vue). None is a credible base. Tauri itself supports the pattern natively: `build.frontendDist`, `devUrl`, `beforeDevCommand` and `beforeBuildCommand` accept any path and command (Tauri v2 docs, `start/frontend/vite.mdx`). So `src-tauri` can build and serve a React app that lives in another workspace package. This is a **pattern to adopt, not a dependency**.
2. **Token pipeline.** The package's `gen-design-tokens.mjs` *does* emit a Tailwind 4 `@theme` file, but only to `desktop/src/theme.css` (line 798; the `existsSync` guard is at line 830). It is hex-only, reads TOML, hardcodes its fonts, and writes no shadcn variables, no `apps/web` output and no `ThemeData`. Style Dictionary 5.8.0 (Apache-2.0, released 2026-11-03) accepts DTCG/JSON sources and has a built-in `css/variables` format and a built-in `flutter/class.dart` format, plus custom formats and transform groups (Context7 `/style-dictionary/style-dictionary`).
3. **UI kit.**
   - **Web:** shadcn CLI 4.23.0 with Tailwind 4.3.5 (both MIT, current). Components are copied into the repo as source, so they can be renamed to kebab-case and themed through CSS variables.
   - **Flutter:** the package **directs `shadcn_flutter`** (SKILL.md line 194; AGENTS.md line 218: "prefer shadcn_flutter equivalents in Flutter"). `shadcn_flutter` 0.0.55 (2026-10-01, 55 releases) and `forui` 0.27.7 (2026-10-26) both require Flutter ≥ 3.47. Neither is demonstrably more mature from registry data alone. The package's lessons record a stale *pin* for `shadcn_flutter`, not a defect in the library.
4. **Rule enforcement.**
   - **Naming:** `@ls-lint/ls-lint` 2.3.2 (MIT) supports per-directory, per-extension rules, `.dir` rules, globs and ignore lists. That covers kebab-case everywhere plus `snake_case` for `.dart` and `.rs`, and the E-N exception list.
   - **Line counts:** no cross-language line-count checker turned up within the budget. `eslint` `max-lines` covers JS and TS only.
4a. **Lint and test tooling (Goal 8).** `typescript-eslint`, every release including canary, declares `typescript >=4.8.4 <6.1.0`, but the package pins **TypeScript 7.0.2**. The standard ESLint TS setup therefore **cannot install** under these pins. Options without a TypeScript peer dependency:
   - Biome 2.6.6 (MIT OR Apache-2.0, 2026-11-06): linter and formatter, with a `useFilenamingConvention` rule
   - oxlint 1.92.0
   
   For the rest of the stack: Vitest 5.1.0 for unit tests; `flutter_lints` 6.0.0 plus `dart analyze`, which enforces `file_names`; and `cargo clippy` for `src-tauri`.
4b. **Routing, theme switching and motion** are prescribed or implied, not open:
   - **Web routing:** TanStack Router (`references/tauri/patterns.md`).
   - **Flutter routing:** follows the package's `mobile-navigation` skill.
   - **Theme switching** must replicate the prototype: `km-meet-theme` in localStorage, `prefers-color-scheme` fallback, and a pre-paint `data-theme`. On Flutter that maps to `ThemeMode` with persisted preference.
   - **Motion** uses token durations and easing, and respects reduced motion on both platforms.
4c. **Fonts.** The prototype loads Space Grotesk, Inter and JetBrains Mono from the Google Fonts CDN. The shells must self-host the OFL font files in `packages/design-tokens/fonts`: web `@font-face`, a Tauri CSP `font-src 'self'`, and Flutter `pubspec` asset fonts. Otherwise Tauri goes offline-blank and the CSP is broken.
5. **Fidelity verification.**
   - **Web:** `@playwright/test` 1.65.0 (`toHaveScreenshot`) can capture both the prototype pages and the shells at fixed viewports and themes.
   - **Flutter:** use Flutter's built-in `matchesGoldenFile`, which the package's `flutter-golden-ui` skill uses. `alchemist` 0.14.1 is reference only, for multi-theme scenario grids, if needed.
   - **Tauri webview:** screenshots are not covered by any candidate checked. The package's `tauri-ui-review` skill is a manual or agent screenshot procedure. Proving the bundle is the same build (VS-2) can instead rest on the web build's artifact hash plus Tauri's `frontendDist` pointing at that artifact.

## Build-vs-adopt decisions

| Gap | Decision | Candidate | Readiness effect |
|---|---|---|---|
| Generator (Goal 1) | **adapt** | cand-001 knowme-builder | `scenarioMatrix` and `functionalScope`. READY only after the operator approves the restructuring budget (Q-A1) |
| Shared web → Tauri (Goal 2) | **adopt pattern** | cand-002 Tauri `frontendDist` and `before*Command` | Satisfies VS-2 with no new runtime code beyond the workspace layout |
| Workspace tooling (Goal 8) | **adopt** | cand-003 pnpm workspace (pinned 11.15.0 in `versions.toml`) | Defines build, test and lint commands |
| Token pipeline (Goals 5, 7) | **Operator gate (Q-A8)**: extend the package generator (cand-005, recommended for Goal 1) or substitute Style Dictionary (cand-004) | cand-004, cand-005 | Requires token reconciliation first (assessment Q0) |
| Web UI kit (Goal 5) | **adopt** | cand-006 shadcn, cand-007 Tailwind 4 | Components live as source in a shared `ui` package, kebab-case |
| Flutter UI kit (Goals 3, 7) | **adopt `shadcn_flutter`** as the package directs; forui is the fallback | cand-009, cand-008 | Goal 1 alignment; pin exactly; operator may override (Q-A4) |
| Lint and test (Goal 8) | **adopt** Biome (not typescript-eslint), Vitest, `flutter_lints` + `dart analyze`, `cargo clippy` | cand-015, cand-016, cand-017 | Defines `lint_command` and `test_command` under the TS 7 pin |
| Routing | **adopt** TanStack Router (package-prescribed) | cand-018 | Shell navigation for VS-1 and VS-7 |
| Naming rule | **adopt** | cand-010 ls-lint | Blocking constraint `kebab-case-file-names` becomes checkable |
| 500-line rule | **build** (small script) | — (`build_required`) | Blocking constraint `max-500-lines-per-file` becomes checkable |
| Web fidelity oracle (VS-1, VS-7) | **adopt** | cand-011 Playwright | Screenshot baseline from the prototype pages |
| Flutter fidelity (VS-3) | **adopt** built-in goldens via the `flutter-golden-ui` skill; alchemist as reference | cand-013, cand-012 | — |
| Package process skills | **adopt** | cand-013 the package's sibling skills | Bound into Plan roles |

### cand-001 knowme-builder: adapt

- **Fit.** It produces the Tauri `src-tauri` baseline (with `build.rs`, capabilities, icons and `vite-env.d.ts` fixed at source) and the Flutter shell. It does not produce a shared web package.
- **Proposed procedure** (option (a) from the assessment, now recommended):
  1. Reinstall the builder at alpha.5 and align the pins.
  2. Generate `sovereign-hybrid` and `governed-web-shell` into a **scratch directory**, never the repo root.
  3. Move only the shell surfaces into the target layout below.
- **Keep, strip or stub** (assessment item 3a):

  | Surface | Recommendation | Reason |
  |---|---|---|
  | Tauri `src-tauri` | **Keep** | Desktop host |
  | Flutter app | **Keep** | Mobile host |
  | React notes feature | **Keep as reference only** | Replaced by the Know Meet shell |
  | `rust/gen_ui_*` crates and flutter_rust_bridge | **Strip** this phase | No Rust domain logic is in scope |
  | Axum BFF and service UAR | **Strip** | Server, auth and agents are excluded |
  | PEM / entity-graph dependencies | **Strip** | No data or persistence is in scope |

  **Coupling caveat.** The kept shells are wired to the stripped code. `src-tauri/src/main.rs` commands call `gen_ui_notes` (lines 11–30), and the Flutter shell depends on flutter_rust_bridge. Keeping the hosts therefore means **replacing those commands and bindings with shell-only stubs** (an empty `invoke_handler` or a theme/window command; no FRB). That is real post-generation editing, which lowers cand-001 coverage to about 0.35 and is part of what Q-A1 approves.

  Stripping Rust core diverges from SKILL.md Step 3 rule 1 ("all networking … agent logic lives in Rust"). That rule governs *where* such logic goes. A shell phase that has none of that logic doesn't violate it, but the operator must accept the deferral explicitly (Q-A1).
- **Why not option (b) or (c).**
  - (b), an upstream profile, needs writes to the read-only reference repo, so it would need a separate phase there.
  - (c), merging two generated trees, duplicates the web app, which defeats Goal 2.

### Target layout (input to Spec)

```text
apps/
  web/           # Vite entry → builds packages/app-shell for the browser
  desktop/       # src-tauri only; frontendDist → apps/web/dist (one bundle, VS-2)
  mobile/        # Flutter (lower_snake_case Dart files, E-N1)
packages/
  app-shell/     # React 19 shell: features/<feature>/{domain,application,infrastructure,presentation}
  ui/            # shadcn components (kebab-case), themed by tokens
  design-tokens/ # generator config + generated outputs (CSS vars, Tailwind @theme, Dart); reads docs/design/tokens.json
tools/
  repo-rules/    # line-count checker + ls-lint config wiring
```

Layer mapping for generator code moved into `packages/app-shell` (assessment item 7):

| Generator layer | Mandated layer |
|---|---|
| `types.ts` (feature types) | domain |
| `entities/` (`useNoteEntities.ts`, a PEM-backed hook) | application (and removed with PEM this phase) |
| `stores`, `hooks`, `app/` | application |
| `api`, `data`, Tauri IPC adapters | infrastructure, behind `isTauri()` guards |
| `components`, screens | presentation |

### cand-004 / cand-005 token pipeline

This is an **operator decision (Q-A8)**. Goal 1 forbids a hand-rolled substitute for what the skill provides, and the package does provide a token generator.

- **Option 1 (recommended for Goal 1): vendor and extend the package generator.** Copy `gen-design-tokens` into `tools/design-tokens/` (the reference repo stays read-only) and extend it to:
  - accept rgba colours
  - add `clamp()` breakpoint handling
  - support configurable fonts
  - add shadcn variable and `apps/web` targets
  - emit a `ThemeData` builder
  - fail loudly on missing directories

  This keeps the package's role names and its WCAG 2.2 AA rule for both themes. The cost is maintaining a fork.
- **Option 2: adopt Style Dictionary 5.8.0** with one DTCG JSON source. The custom formats needed are listed below. There's less bespoke parsing, but it is a substitute and needs explicit operator approval.

Either option reads a **reconciled source owned by `docs/design/`**. `docs/design/tokens.json` is upgraded in place with the 17 missing tokens, the `--text-display` fix, weights and line heights, and stays design-owned and hand-edited. That keeps the `design-tokens-single-source` constraint and the path-ownership rule intact (round-1 review warning). If Option 2 is chosen, it emits:
  - `css/variables` for both themes, including shadcn's variable names (`--background`, `--primary` and so on), mapped from Know Meet roles
  - A Tailwind 4 `@theme` file (a custom format)
  - `flutter/class.dart` constants, plus a custom format that emits a `ThemeData` builder
- **Source-format conversion is required under either option** (round-2 review). `docs/design/tokens.json` uses a custom `know-meet-tokens/v1` schema with no `$value` keys. Option 1 needs an adapter from that schema into the generator's model, replacing its TOML reader. Option 2 needs either a DTCG upgrade of `tokens.json` (still design-owned) or a custom Style Dictionary parser. Spec must name the conversion and who owns it.
- **Flutter cannot express `clamp()`.** The Dart output takes the maximum and minimum and resolves sizes by breakpoint. That is a design decision to record in Spec.

## Contested choices and open questions

None is contested at the stack level, because the stack is specified. The questions below need the operator before or during Spec. Each has a recommended default.

- **Q-A1 Generator restructuring budget.** Is option (a) accepted, with Rust core, Axum, UAR and PEM stripped this phase and Tauri and Flutter kept from the generator? *Recommended: yes.* Without this, Goal 1 has no testable meaning.
- **Q-A2 Token source of truth.** *Recommended:* take `km.css`'s rendered values as truth, reconcile them into `docs/design/tokens.json` (design-owned, hand-edited), and have the pipeline read it. Turning `docs/design/tokens.*` into generated outputs would need amendments to the `design-tokens-single-source` constraint and the path-ownership rule, so it's not recommended.
- **Q-A3 In-scope routes (VS-7).** *Recommended:* the app frame (header, navigation, theme toggle) plus the static screens of `index`, `auth`, `join`, `dashboard`, `agents`, `recordings` and `settings`, and the `meet` room layout with media stubbed. Exclude interactive flows.
- **Q-A4 Flutter UI kit.** *Recommended: `shadcn_flutter`, as the package directs* (SKILL.md line 194, AGENTS.md line 218), pinned exactly. `forui` is the fallback if `shadcn_flutter` can't take the Know Meet theme.
- **Q-A5 Toolchain pins.** Choose between the package pins (`versions.toml`: tauri-cli 2.11.4, Flutter 3.47.5 stable) and the current upstream releases (tauri-cli and `@tauri-apps/api` 2.12.4). *Recommended:* follow `versions.toml` for this phase, because the generator was verified against it. Record the drift as a known item.
- **Q-A6 Exceptions E-L6 and E-L7** (carried over from the assessment).
- **Q-A7 Parallel agent-team session is active.** During this stage it created `.agent-team/know-meet-team/` with 16 roles: delivery lead, architect, build platform, BDD quality, design lead, UI engineer, client shell, mobile, WebRTC, LiveKit platform and agents, CRDT, integrations, security reviewer, independent reviewer and team. It appended a `prometheus-team-routing` block to `AGENTS.md` and `CLAUDE.md`, and added per-harness agent definitions. Plan must bind its changes to these roles, not invent new ones, and confirm the two sessions don't plan the same phase.
- **Q-A8 Token generator.** Extend the package generator (Option 1, recommended for Goal 1) or substitute Style Dictionary (Option 2)?
- **Q-A9 TypeScript 7 lint stack.** Accept Biome (or oxlint) instead of typescript-eslint, because typescript-eslint can't support the TS 7.0.2 pin.

## Build required

- **Cross-language line-count checker.** Implement it as a small Node script in `tools/repo-rules/`, honouring the E-L exception globs. It runs in lint, pre-commit and CI. No maintained tool covers every language within the budget, and `eslint` `max-lines` can't be used under the TS 7 pin anyway.
- **Token generator work.** This is either the Option 1 extensions to the vendored package generator, or **Style Dictionary custom formats** (Option 2) for:
  - shadcn CSS variable names
  - the Tailwind 4 `@theme` block
  - the Flutter `ThemeData` builder
- **Fidelity harness.** A Playwright spec that captures the prototype route screenshots (dark and light; 375, 768, 1024 and 1440) as the baseline, and the same routes from `apps/web`.

## Adversarial review

- **Isolation:** harness-native fresh-context subagent. No gateway models are configured; preflight found 0 providers. The judge equals the producer (`claude-opus-5-5`), so this is recorded as `same-model-collision`, a weaker guarantee.
- **Round 1:** BLOCK, with 3 critical, 6 warnings and 1 suggestion (`review/analyze/findings-round-1.json`). The criticals were:
  - recommending forui against the package's `shadcn_flutter` direction
  - substituting the token pipeline without an operator gate
  - no lint or test tooling, with `typescript-eslint` unable to support the TypeScript 7.0.2 pin

  All three were verified and fixed.
- **Round 2:** PASS, with 0 critical, 2 warnings and 4 suggestions (`review/analyze/findings.json`). Both warnings were fixed in the text: the source-format conversion and the leftover Style Dictionary wording. The suggestions were also addressed: named commands, pinned versions still to check, and the query count.

## Readiness recommendation

**Named commands for Goal 8** (draft):
- **lint:** `biome check`, `ls-lint` and the line-count checker; `dart analyze`; `cargo clippy`
- **typecheck:** `tsc --noEmit` on TypeScript 7.0.2
- **test:** `vitest run`; `flutter test`, with goldens; the Playwright fidelity suite

**Pinned versions still to check in Spec:**
- **TanStack Router:** the current release is 1.170.46, MIT. Pin it after Spec confirms it.
- **Flutter routing and state** follow the package: `go_router` and riverpod 3.3.1 (`versions.toml`), plus `shared_preferences` for the persisted theme mode. Spec must pin and confirm each one.

**BLOCKED, minimal:** Spec can be written once **Q-A1** (restructuring budget), **Q-A2** (token source), **Q-A3** (route scope) and **Q-A8** (token generator) are answered. Q-A4, Q-A5, Q-A6 and Q-A9 have recommended defaults that Spec can adopt unless overridden. Q-A7 (the active agent-team session) must be acknowledged before Plan. No runtime code is needed to reach READY to spec; only operator decisions are.

The version-drift list now also includes **pnpm 12.18.0**, the current upstream release, against the pin of 11.15.0.
