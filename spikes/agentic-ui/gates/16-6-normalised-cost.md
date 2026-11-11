# Gate 16.6: normalised work breakdown and first-year cost, O vs H

KBD change `c16-agentic-core-gates`, gate 16.6. Date: 2026-11-10. Author: independent estimator. I did not
build either prototype.

**The objection being answered.** Both reviewers said the 22 vs 31 engineer-day figures compare estimates from
different builders with different scopes. O's figure leaves out entity-graph work, theming, threads and
WebView2. H's includes theming but leaves out entity-graph and documentation. Neither includes maintenance
other than H's "0.5 day/week" (critic F6/F7, judge F5 in
`.kbd-orchestrator/phases/hybrid-shell-foundation/review/agentic-ui-spike/`).

**Method.** I priced one work breakdown with the same line items for both paths. The target is the same
production outcome for both: the c15 harness passes in Chromium, WebKit, Tauri WKWebView and WebView2, plus the
c16 gates (`report.md` §Gates). Each line has a low, likely and high estimate in engineer-days. Each
estimate is tied to evidence in the prototype results, the code or the dependency release history. Flutter is
priced once and applied to both paths, because neither path provides a Flutter AG-UI client.

## 1. Answer

| First-year total (web, build + maintenance) | Low | Likely | High |
|---|---|---|---|
| **O: own AG-UI core on entity-graph** | **61.5** | **92** | **148.5** |
| **H: assistant-ui hybrid** | **71.5** | **107** | **170.5** |
| Delta (H − O) | +10 | **+15** | +22 |
| Flutter, the same for both (§5) | 33.5 | 47 | 67.5 |

- **Build cost is effectively equal: O 50 likely days, H 51.5.** Once the scopes match, the 9-day build
  advantage claimed for O disappears. O's 22 days becomes 50, mostly because entity-graph hardening is
  added. H's 31 days becomes 51.5.
- **O's first-year advantage comes from maintenance: 42 vs 55.5 likely days.** H carries an
  assistant-ui upgrade tax and a coupling to `@ag-ui/client`'s internals. O's own heavier entity-graph
  ownership offsets only part of that.
- **The ranges overlap heavily, so the 15-day gap is not a decisive margin.** In the adverse case for
  O, entity-graph lands at the high end and assistant-ui upgrades come in cheap. H is then about 4 days
  cheaper (§6).
- **Verdict:** normalisation does **not** overturn the O decision. It also removes cost as an argument
  for O: the decision stays an architecture and ownership choice. The numbers support O weakly, on maintenance,
  as long as the entity-graph hardening stays within its range. A tripwire is set in §7.

## 2. Evidence base (read 2026-11-10)

| Source | What it gave |
|---|---|
| `spikes/agentic-ui/report.md` | Measured tie, gate list, reviewer corrections |
| `own/results.md`, `own/src/` (3,151 own lines; reducer 261, agent-session 230, a2ui-host 207, entity-graph-store 134) | 7 entity-graph gaps; 8 unit tests; 22-day self-estimate |
| `hybrid/results.md`, `hybrid/src/` (2,554 lines; projector 352, transport 205, assistant-ui adapter 169) | Dual-model, hydration-as-third-mapping, expiry divergence; 0 unit tests; 31-day self-estimate |
| `measurements/comparison.md` | Tauri results (42/44 hostile each; axe: H 1, O 2 violations); CSP findings; WebView2 untested; O's rAF anomaly |
| `a2ui-flutter/results.md` | 2.5–3.5 eng-weeks to A2UI *rendering* parity; alpha churn; no Dart AG-UI transport |
| `critic.json` (MiniMax-M3), `judge.json` (Kimi k3.1-pro) | Estimate criticisms answered here |
| `AGENTS.md` | Decision record: own core, no chat framework; `versions.toml` is authoritative for pins |
| npm registry, pub.dev API, GitHub API (§4) | Release cadence and breaking-change history |

## 3. Normalised work breakdown (build, engineer-days)

Each line's scope is identical for both paths. The rationale is "why this path costs this much".

| # | Line item (identical scope) | O low / likely / high | H low / likely / high | Rationale (evidence) |
|---|---|---|---|---|
| 1 | Package extraction and boundaries: domain/application into `packages/`, contracts, boundary lint, read-model port | 2 / 3 / 4 | 2 / 3 / 4.5 | O: 3,151 lines with 3 known presentation→infrastructure leaks (`own/results.md` "Clean-architecture compromises"). H: fewer lines, but assistant-ui (and its zod 4, `assistant-cloud` hard dependency) must be fenced into one adapter package. |
| 2 | Transport: SSE, Last-Event-ID reconnect, malformed frames, cancel/resume idempotency keys | 2 / 3 / 4.5 | 2.5 / 3.5 / 5 | Both already own SSE parsing and reconnect (O 156 lines; H 205). H also needs delta coalescing before `subscriber.next` (its pain point 4). Its `AbstractAgent` subclass rides `@ag-ui/client` 1.0's new enforcement pipeline (GitHub commit 2026-09-16). |
| 3 | State model, persistence and restart hydration: threads/history, `MESSAGES_SNAPSHOT` reconciliation, HITL re-arm/expiry on reload, live-text publishing scheduler | 5 / 7 / 10 | 7 / 10 / 14 | O: one reducer and an explicit HITL machine with tests. It still needs hydration, re-arming, and a non-rAF publishing fallback tested across window states (gate 1; the observed 907 vs 281 ms run). H: must settle the dual model (4 days, own estimate). Hydration is a third mapping (journal → entities → `ThreadMessage` via `ThreadHistoryAdapter`). The runtime's `approval.resolution` has no supported setter. Thread-list APIs are marked experimental. |
| 4 | entity-graph upstream hardening, counting only what each path needs | 6 / 9 / 14 | 3 / 4.5 / 7 | O needs all 7 gaps: atomic batch without `structuredClone` of the whole graph, a render-only live layer, a lossless ordered AG-UI bridge, a devtools production guard, a freeze opt-out, an ordered collection, and hydration. That is a library major bump with its own tests. H needs 4 of them: atomic batch (it opens a `createGraphTransaction` per checkpoint, so cost grows with session length), the devtools guard, the freeze/clone hazard it hit in run 1, and ordered collections for hydration. It needs neither the live layer nor the bridge. |
| 5 | A2UI catalog to design fidelity, validation UX, unknown-component fallback, data-model sync | 4 / 5 / 8 | 4.5 / 5.5 / 8.5 | Same approach on both paths: `@a2ui/react` 0.15.0 with a Know Meet catalog (O 327 lines, H 348). Both self-estimated 4. H adds hiding assistant-ui's lossy `present` part and keeping the action return through `useAgUiSendA2uiAction`. |
| 6 | Markdown, media and SVG security: Streamdown origin/scheme allowlists, Mermaid/SVG sanitising, CSP `img-src`/`media-src`, KaTeX font | 1.5 / 2 / 3 | 1.5 / 2 / 3 | Shared finding (gate 5). The work and its fixes are the same in both (`comparison.md` CSP table). |
| 7 | Accessibility: VoiceOver and NVDA, the full a11y spec in Tauri with trusted input, reduced motion, focus | 3 / 4 / 6 | 3 / 4 / 6.5 | Gate 4. Tauri axe found O 2 violations (contrast, target size) and H 1. H's high case is higher because focus and announcement behaviour inside `ThreadPrimitive` is library-owned. |
| 8 | Theming and visual fidelity, both themes, 375 to 1440 | 3 / 4 / 6 | 3 / 4 / 6 | Neither path built the light theme. O's estimate omitted it; H priced it inside a 3-day line. The work is the same. |
| 9 | Tauri WKWebView, WebView2 and CSP verification | 3 / 4 / 7 | 2.5 / 3.5 / 6 | WebView2 is "a gap: nothing here says anything about it" (`comparison.md`). It needs a Windows runner. O adds controlled window-state runs for its rAF risk. |
| 10 | Bundle diet: lazy KaTeX, Shiki subset, A2UI on first surface, no parse5 path, no profiling build | 1.5 / 2 / 3 | 2.5 / 3 / 4.5 | Entry chunks: O 436,623 B brotli, H 585,680 B. H must also drop `@ag-ui/proto` (168 KB source) and the duplicate zod. `@assistant-ui/core` (482 KB source) cannot be removed. |
| 11 | Test suites: reducer/projector property tests, transport fault injection, component tests, e2e harness in CI | 3 / 4 / 6 | 4 / 5 / 7 | O starts with 8 unit tests, H with 0. H also needs runtime-vs-store divergence tests, because "nothing structurally enforces" that the two models agree (`hybrid/results.md`). |
| 12 | Security review of sanitiser, allowlists, supply chain | 1 / 1.5 / 2.5 | 1 / 2 / 3 | H has the larger dependency surface: 4 assistant-ui packages plus `assistant-stream`, and the excluded `assistant-cloud` arrives as a hard dependency. |
| 13 | Documentation: ADR, package READMEs, runbook for protocol upgrades | 1 / 1.5 / 2.5 | 1 / 1.5 / 2.5 | The same deliverable. Neither self-estimate included it. |
| | **Build total** | **36 / 50 / 76.5** | **37.5 / 51.5 / 77.5** | |

Totals are column sums. The low and high sums are an envelope: not every line will land at an extreme together.

Excluded from both: gate 3, the interleaved re-measurement. It is a decision cost of about 1–2 days per
prototype and is not productionisation. Also excluded are agent-server work, and React, Vite, Tailwind and
TypeScript upgrades, which are common to the whole app.

### Reconciliation with the self-estimates

| | O | H |
|---|---|---|
| Self-estimate | 22 | 31 |
| Added: entity-graph (line 4) | +9 | +4.5 |
| Added: theming both themes and real screen-reader passes (lines 7–8) | +6 | +5 |
| Added: threads/hydration widened to the full line 3 (scheduler for O; thread list and `approval.resolution` for H) | +2 | +2 |
| Added: WebView2 / window states (line 9) | +2 | +1.5 |
| Added: documentation, security and supply-chain review (lines 12–13) | +2 | +2.5 |
| Adjusted to the shared scope: transport (O had no line), markdown/CSP security, A2UI, tests | +7 | +5 |
| **Normalised likely** | **50** | **51.5** |

## 4. Observed release cadence (verified 2026-11-10)

Commands: `npm view <pkg> time --json` (stable versions only, prereleases excluded);
`curl https://pub.dev/api/packages/<pkg>`; `gh api repos/<owner>/<repo>/releases` and `/commits?path=`.

| Dependency | Owned by | Stable releases, last 365 d / 90 d / 30 d | Breaking-change history (0.x minor or major) | Latest |
|---|---|---|---|---|
| `@assistant-ui/react` | H | 105 / 21 / 8 (463 since 2024-05) | 0.12.0 2026-01-24, 0.14.0 2026-05-07, 0.15.0 2026-07-28; several APIs marked "Experimental, may change in any release" | 0.15.34, 2026-11-10 07:56 UTC (the morning of the spike; tripped the 24 h `minimumReleaseAge`) |
| `@assistant-ui/react-ag-ui` | H | 70 / 21 / 9 (first 2025-11-19) | 0.1.0 2026-10-22 | 0.1.3, 2026-11-10 (the critic's "69 releases" checks out: 70 now) |
| `@assistant-ui/react-streamdown` | H | 35 / 11 / 1 | 0.1.0 2026-01-29, 0.3.0 2026-05-07 | 0.3.21, 2026-10-28 |
| `@ag-ui/client` | H (subclassed) | 24 / 7 / 2 | 1.0.0 2026-09-17: "the 1.0 client — generated models, the enforcement pipeline, the protobuf wire, compatibility middleware" | 1.0.4, 2026-11-05 |
| `@ag-ui/core` | O and H | 24 / 7 / 2 | 1.0.0 2026-09-17. `events.ts` saw 13 commits since 2026-05-10, adding subagent lifecycle events, token usage on terminal events and metadata semantics | 1.0.4, 2026-11-05 |
| AG-UI monorepo | protocol | 76 dated releases since 2025-11-10 (every 1–3 days) | as above | `release/2026-11-10` |
| `streamdown` | O and H | 24 / 3 / 1 | 2.0.0 2026-01-12 | 2.7.1, 2026-10-19 |
| `@a2ui/react` | O and H | 12 / 6 / 2 (first 2026-03-17) | **every minor**: 0.8 → 0.15 in 8 months, 5 of them since 2026-09-01 | 0.15.0, 2026-11-02 |
| `@a2ui/web_core` | O and H | 17 / 6 / 2 | 0.8 → 0.15, in lockstep with the React renderer | 0.15.0, 2026-11-02 |
| A2UI spec (`a2ui-project/a2ui`, `specification/`) | protocol | 141 commits since 2026-05-10 | v0.8 → v0.9 → v1.0 during 2026 | Python core 0.5.0, 2026-11-02 |
| `@prometheus-ags/entity-graph-core` | ours | 15 / 15 / 1 (all since 2026-08-23) | 3.0.0 2026-08-23 → 4.0.0 2026-09-05: two majors in 13 days | 4.3.0, 2026-10-28 |
| `a2ui_flutter` (pub.dev) | Flutter, both | 2 stable (0.1.0 2026-11-04, 0.2.0 2026-11-09) | 0.1.0 changed fallback rendering; 0.2.0 bumped core | 0.2.0 |
| `a2ui_core` (pub.dev) | Flutter, both | 6 stable since 2026-07-20 | 0.1 → 0.6 in under 4 months; re-exported by `a2ui_flutter`, so every core minor breaks the renderer | 0.6.0, 2026-11-09 |
| `ag_ui` (pub.dev, community) | Flutter, both | 2 (0.1.0 2025-09-21, 0.3.0 2026-06-24) | unevaluated; behind AG-UI 1.0 | 0.3.0 |

`streamdown`'s npm metadata lists a 1.0.0 from 2020, before the package's `created` date of 2025-08-14 (a reused
name). Only the last-365-day figures are used.

## 5. Flutter (scoped once, identical for both paths)

Neither path gives Flutter an AG-UI client. O's TypeScript reducer is a readable reference for a Dart port and
H's assistant-ui is React-only, but I give O no credit for that: the port is new code either way.

| Item | Low / likely / high | Basis |
|---|---|---|
| A2UI rendering parity: catalog wrapper, 18 shadcn_flutter builders with goldens, validation UX, a11y | 12.5 / 15 / 17.5 | `a2ui-flutter/results.md` §6, excluding its transport row |
| End-to-end agentic session in Dart: AG-UI transport (or `ag_ui` 0.3.0 evaluation and hardening), reconnect, reducer port, HITL with expiry, streaming markdown, km.* chunks, the A2UI `ACTIVITY_*` channel and action return, hydration | 15 / 22 / 35 | Judge F9: the 58/58 result covers rendering only. Sized from the web reducer, HITL and transport lines, plus Dart's lack of a Streamdown equivalent |
| **Flutter build** | **27.5 / 37 / 52.5** | |
| Year-one upkeep: `a2ui_flutter`/`a2ui_core` re-pin and re-run at ~0.5 day per release; `ag_ui` drift | 6 / 10 / 15 | 8 stable releases of the two packages in 4 months (§4) |
| **Flutter first year** | **33.5 / 47 / 67.5** | Add to either path's total; it does not change the delta |

## 6. First-year maintenance model (engineer-days over 220 working days)

| Driver | O low / likely / high | H low / likely / high | Basis |
|---|---|---|---|
| AG-UI protocol evolution: new event families and semantic changes in the reducer/projector and guard | 4 / 7 / 12 | 3 / 5.5 / 10 | `events.ts` changed 13 times in 6 months (subagents, token usage, metadata). That projects to 4–8 changes a year at 1–1.5 days each. O owns every semantic. H's projector and guard must also follow each change, but the runtime renders some of it. H also has to wait for `react-ag-ui` support. |
| A2UI spec and renderer evolution: catalog re-pins across `@a2ui/react`/`web_core` minors | 4 / 7 / 12 | 4 / 7 / 12 | 8 breaking minors in 8 months; 141 spec commits in 6 months. The catalog is the same on both paths, so the cost is the same. |
| Dependency upgrades, path-specific | 3.5 / 6 / 10 | 15 / 24 / 38 | O: `@ag-ui/core` (24/yr, 1 major) plus Streamdown (24/yr, 1 major). H: the same, plus the assistant-ui set (210 releases/yr across 3 packages; 3–4 breaking minors/yr) at 10 / 16 / 25. That is consistent with H's own "0.5 day/week" (22/yr) less batching. H also adds `@ag-ui/client`, which it subclasses, at 3 / 5 / 8; its 1.0 rewrite of the pipeline landed 2 months ago. |
| entity-graph ownership: fixes, releases and migrations for what each path uses | 6 / 10 / 18 | 3 / 5 / 9 | 15 releases and 2 majors in 66 days, so the library is still moving. O depends on it for the hot path (live layer, bridge, ordered transcript). H uses it only for checkpoints. |
| On-call and bug load: production defects in owned agentic code | 8 / 12 / 20 | 9 / 14 / 24 | O owns about 3,150 lines with no framework, and carries the scheduler/window-state risk. H owns about 2,550 lines plus divergence bugs between the two status models (the expiry defect already found). H is also exposed to regressions from near-daily upstream releases. |
| **Maintenance total** | **25.5 / 42 / 72** | **34 / 55.5 / 93** | |

### Sensitivity: what would flip the answer

- **Adverse for O.** Line 4 comes in high (+5) and entity-graph ownership runs high (+8), while
  assistant-ui upgrades come in low (−6) and on-call is equal. The likely delta then moves from +15 to about **−4**:
  H becomes cheaper by about 4 days. The single largest swing factor for O is entity-graph.
- **Adverse for H.** assistant-ui ships another breaking minor during the hydration work, so the dual-model
  line runs high and upgrades run high. The delta widens to about **+33**.
- **assistant-ui at 0.15 day/week (batched quarterly).** H's maintenance falls by about 8; the delta is
  about **+7**.

## 7. Assumptions and biggest uncertainties

**Assumptions**
- An engineer-day is one experienced TypeScript/React engineer who knows this repo, working at the
  pace the spike showed. Totals are not calendar time.
- Year one has 220 working days and begins when the build begins.
- Both paths stay on exact pins with the 24-hour `minimumReleaseAge` policy, and upgrades are batched about monthly.
- entity-graph work is charged only for the agentic-UI share. Other Know Meet uses of the library are not counted.
- Neither path adopts assistant-ui's experimental thread-list APIs without wrapping them.
- Gates 1–5 are part of "production". Their acceptance work is inside lines 3, 4, 6, 7 and 9.

**Biggest uncertainties, in order**
1. **entity-graph hardening (O line 4 and the ownership row).** These are library changes behind two majors in 13
   days, with no test history at streaming load. They are the widest O range and the main way O loses.
2. **H's dual-model settlement (line 3).** The spike did not test whether status can be driven entirely from the
   store, or whether assistant-ui would accept upstream changes. Either outcome moves H by ±4.
3. **The O publishing scheduler.** The cause of the 907 ms WKWebView run is unknown. If it is not rAF, line 3
   or line 9 grows.
4. **WebView2.** It is completely unmeasured on both paths; the high values assume one real defect.
5. **The A2UI churn rate.** 0.x minors arrive every 2–4 weeks. If v1.0 stabilises, both paths save equally; if
   it forks again, both lose equally.
6. **Flutter's end-to-end line.** It is the widest range in the document, but it is the same for both paths.

**Tripwire.** This makes gate 16.2 quantitative. Reopen H if O's entity-graph hardening (line 4) exceeds **14
engineer-days**, or if the gate 2 restart, hydration and expiry tests are not green within line 3's high of
10 days. At that point O's first-year cost is at or above H's likely total.

## 8. Does normalisation change the O decision?

**No.** Normalised, the paths cost the same to build: 50 vs 51.5 likely days. O's lower first-year cost (92 vs
107 likely; ranges 61.5–148.5 vs 71.5–170.5) comes from lower dependency churn, partly offset by owning
entity-graph. The difference is real but smaller than the uncertainty. Cost is therefore no longer a reason to
choose O, and it is not a reason to reverse the choice. O still rests on the architecture argument from
`report.md`: one canonical reducer for run and HITL state, no runtime/store divergence, and no framework
coupling, consistent with `AGENTS.md`. H remains the funded fallback under the §7 tripwire.

## Sources (all accessed 2026-11-10)

- Repo: `spikes/agentic-ui/{report.md, own/results.md, hybrid/results.md, measurements/comparison.md,
  a2ui-flutter/results.md}`, `own/src/`, `hybrid/src/`, `AGENTS.md`,
  `.kbd-orchestrator/phases/hybrid-shell-foundation/review/agentic-ui-spike/{critic.json, judge.json}`.
- npm registry via `npm view <pkg> time --json`: `@assistant-ui/react`, `@assistant-ui/react-ag-ui`,
  `@assistant-ui/react-streamdown`, `@ag-ui/core`, `@ag-ui/client`, `streamdown`, `@a2ui/react`,
  `@a2ui/web_core`, `@prometheus-ags/entity-graph-core`.
- pub.dev API: https://pub.dev/api/packages/a2ui_flutter, https://pub.dev/api/packages/a2ui_core,
  https://pub.dev/api/packages/ag_ui.
- GitHub API: `repos/ag-ui-protocol/ag-ui/releases`;
  `repos/ag-ui-protocol/ag-ui/commits?path=sdks/typescript/packages/core/src/events.ts&since=2026-05-10`;
  `repos/a2ui-project/a2ui/releases` (formerly `google/A2UI`);
  `repos/a2ui-project/a2ui/commits?path=specification&since=2026-05-10`.
