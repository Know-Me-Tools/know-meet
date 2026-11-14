# Fidelity and value-scenario suite (c03)

Owned by `bdd-quality`. Holds the step definitions for the root `features/`
(VS-1 to VS-5, VS-8, VS-9, accessibility, motion), the prototype screenshot
baselines and the frozen comparison oracle.

**Boundary-only (VLBV).** Nothing here runs per change. There is deliberately
no `test` script, so `turbo run test` never picks it up. The suite runs once, at
the c13 boundary, with `pnpm --filter @know-meet/fidelity-tests test:boundary`
(or `playwright test -c tests/fidelity/playwright.config.ts`). Until then every
scenario is `NOT_EXERCISED`.

## Runner

playwright-bdd 9.2.1 on @playwright/test 1.65.0, with @axe-core/playwright
4.14.0. Feature files compile to Playwright tests, so VS-1's oracle is native
`toHaveScreenshot` against the baselines, and traces, videos, HTML and
cucumber-JSON reports come with it. Command scenarios (VS-2, VS-3, VS-4, VS-8,
VS-9) run in the same runner under the `cli` project, giving one evidence
format. `updateSnapshots: "none"`: the boundary run can never write a baseline.

## Layout

| Path                                                           | What                                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baselines/<theme>/<viewport>/<state-id, dots as hyphens>.png` | Prototype baselines (fixtures, exempt from the line rule, E-L5)                                                                                                    |
| `baselines/reference/**`                                       | Brand guide (logo, construction, clear space, colour, type) and live room layout. Design-lead reviews these; they are never threshold-gated                        |
| `baselines/manifest.json`                                      | Per baseline: state ID, theme, viewport, source path and sha256, URL, method, image sha256; plus environment, fonts, shared-source digests and `baselineSetDigest` |
| `oracle/thresholds.json`                                       | Frozen per-state thresholds (default `maxDiffPixelRatio` 0.01), the verdict rule, and the exception rubric with design-lead as adjudicator                         |
| `oracle/app-state-map.json`                                    | State ID → app URL and `data-testid` roles. **Proposed**: client-shell confirms it before c09                                                                      |
| `oracle/flutter-golden-provenance.json`                        | VS-3 golden approval rule (design-lead approves goldens against the 375 baselines)                                                                                 |
| `src/capture/`                                                 | Baseline capture (`pnpm capture:baselines`)                                                                                                                        |
| `src/support/`                                                 | Capture environment, state drivers, inventory, oracle, digests, commands                                                                                           |
| `src/bundle-identity/check-bundle-identity.ts`                 | VS-2 digest check (exit 0 identical, 1 mismatch, 2 usage)                                                                                                          |
| `src/smoke/`, `src/motion/`, `src/flutter/`                    | VS-5 Tauri-global trap, motion probes, golden provenance                                                                                                           |
| `steps/`                                                       | Step definitions                                                                                                                                                   |

## Capture conditions

Docs/design is served read-only by `src/capture/static-server.ts`. Theme and
sign-in are set through `km-meet-theme` and `km-auth` before page scripts run.
The clock is frozen at 2026-11-10T15:00Z (UTC, en-US), DPR is 1, animations are
disabled and the caret is hidden. Google Fonts requests are answered with
`@font-face` rules for the self-hosted files in `packages/design-tokens/fonts`, which are the
same files the shells ship. Every other external request is blocked and
recorded. Frame states that need an interaction use the prototype's own controls
(`.acct-btn`, `.theme-toggle`, Tab).

Reference revision v2 (route inventory v2.0.0, `docs/design/token-reconciliation/discrepancy-log.md`
section F; prototype corrections through v2.2, F5 RV-19 to RV-28, recaptured in full): 71 in-scope states, 568 cells, 16 not applicable, 552 captures, plus 48 reference
captures. The v1 set is kept in `baselines-v1-archive/`. Navigation is adaptive: km.js sets
`html[data-nav-class]` to `bar` (< 600), `rail` (600 to 1023) or `inline` (>= 1024).
`frame.nav-bar` exists only at 375, `frame.nav-rail` only at 768 and `frame.nav-inline` only at
1024 and 1440; their other cells are recorded as not applicable. Nav states are captured
full-page after requiring the expected nav class; the fixed bar and rail render at their
first-viewport position, exactly as in the app, which is captured the same way.

The capture is resumable: finished cells are journaled in `baselines/.capture-journal.jsonl`
and a relaunch reuses those whose capture key (drivers, environment, shared sources, fonts,
inventory) and page-source sha256 are unchanged. The journal is removed when the manifest is
written.

The live room's in-call view needs a LiveKit connection, so its reference capture
un-hides `#v-room` in the DOM. That gives the layout skeleton only.
