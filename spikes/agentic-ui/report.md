# c15 agentic-UI spike — comparison report and recommendation (task 15.6)

Date: 2026-11-10. Author: delivery-lead. Evidence: `harness/`, `hybrid/results.md`, `own/results.md`,
`a2ui-flutter/results.md`, `measurements/comparison.md` and `measurements/raw/`.

## What was compared

- **H (hybrid):** `@assistant-ui/react` 0.15.33 + `@assistant-ui/react-ag-ui` 0.1.2 owning live run state
  behind a `ChatSession` port; `@prometheus-ags/entity-graph` 4.3.0 as the durable store via checkpoints and an
  AG-UI event journal; Streamdown; `@a2ui/react` 0.15.0 with a Know Meet catalog.
- **O (own core):** own SSE transport and a pure AG-UI reducer (`@ag-ui/core` 1.0.4 types) in domain/application;
  entity-graph as store of record with boundary commits and a throttled streaming buffer; explicit HITL state
  machine; Streamdown; `@a2ui/react` with a Know Meet catalog.

Both ran the same harness (14 AG-UI scenarios, 8 A2UI 1.0 surfaces, 44 hostile items, 8 a11y checks) as Vite
production builds in Chromium 158, Playwright WebKit 27.2 and a Tauri 2.11.3 WKWebView on macOS 26.7.3.

## Measured results

| | H | O |
|---|---|---|
| Harness checks, Chromium + WebKit | 148 / 148 | 148 / 148 |
| Tauri conformance (14 scenarios) | 14 / 14 | 14 / 14 |
| Tauri hostile (44), apps/web CSP | 42 / 44 | 42 / 44 |
| Same, CSP also allowing the media origin | 9 / 9 media | 9 / 9 media |
| `long-markdown` React commits (Chromium / WebKit / Tauri) | 4,574 / 4,483 / 4,481 | 164 / 130 / 170 |
| `huge-table` React commits (Chromium / WebKit / Tauri) | 411 / 412 / 414 | 17 / 23 / 22 |
| Long-task total, Chromium, 12 short scenarios | 0 ms | 66–135 ms |
| Long-task total, Chromium, `long-markdown` / `parallel-tool-calls` / `huge-table` | 57 / 105 / 327 ms | 163 / 111 / 494 ms |
| JS heap after GC, Chromium | 12.5–21.1 MB | 10.1–20.7 MB |
| Initial load, brotli | 600,261 B | 449,383 B |
| Whole dist, brotli | 4,241,452 B | 4,090,550 B |
| Total stream time | within 21 ms or 1.5% (exceptions in comparison.md) | — |
| Time to first token | differs per scenario in both directions (e.g. Chromium long-markdown 265 vs 106 ms; WebKit O lower on most) | see comparison.md |
| Code written | 2,554 lines | 3,151 lines |
| Productionise estimate (self-authored, different scopes) | ~31 eng-days + ~0.5 day/week upkeep | ~22 eng-days (excludes entity-graph upstream work) |

## What the builds revealed

**H — the library did less of the hard work than expected.**
- assistant-ui's runtime folds a run into one assistant message and keeps ids, steps, protocol errors and approval
  state internal, so it could not be the store of record. H rebuilt the normalised model from the event journal
  (a 384-line projector): two views of run status exist side by side.
- `HttpAgent` cannot reconnect with Last-Event-ID or skip malformed frames; H subclassed the agent base class with
  its own streaming transport.
- assistant-ui's A2UI converter drops Video, Modal, component ids, fallback and validation checks; H rendered A2UI
  through `@a2ui/react` with its own catalog, as O does.
- It re-renders on every delta (~28× O's React commits on long answers). Long-task totals stay low because
  Streamdown memoises blocks and H enabled deferred rendering; the 400-row table cost 13.3 s of long tasks before
  that change.

**O — the reducer was the easy part; dependencies needed hardening.**
- Boundary commits work: 3,459 deltas → 8 store commits and 164 React commits.
- entity-graph 4.3.0 gaps for streaming: transactions write per change and copy the graph on open; no
  render-only live-text layer; the AG-UI bridge drops plain fields, array order and removals; devtools events ship
  in production builds. These are fixable upstream in our own library.
- O publishes through `requestAnimationFrame`; WKWebView throttled it in one uncontrolled run (~900 ms vs 281 ms).
  Reported runs disable background throttling; the cause was not established.

**Shared findings (both paths):**
- Streamdown allows every link and image origin by default and pulls an unused HTML parser; it needs an explicit
  allowlist config. KaTeX's inlined `data:` font is blocked by the apps/web CSP (falls back to same-origin).
- apps/web's CSP needs `img-src`/`media-src` entries for allowed media origins (the 2 Tauri hostile failures).
- `@a2ui/react` 0.15.0 has no unknown-component fallback and disables failing-check Buttons; both prototypes
  replaced these in the catalog.
- Flutter: `a2ui_flutter` 0.2.0 (A2UI 1.0, labs.flutter.dev, alpha) reaches 58 / 58 parity checks only with a
  Know Meet catalog; stock it fails 2 surfaces; ~2.5–3.5 eng-weeks to A2UI *rendering* parity (not end-to-end mobile parity); `a2ui_flutter` has no AG-UI
  transport, and the community Dart `ag_ui` 0.3.0 package was not evaluated.

## Adversarial review (2026-11-10)

Both cross-model reviewers returned **REVISE** on the first draft of this report. Raw outputs:
`.kbd-orchestrator/phases/hybrid-shell-foundation/review/agentic-ui-spike/`.

| Reviewer | Verdict | Recommends | Confidence |
|---|---|---|---|
| MiniMax-M3 (critic) | REVISE | inconclusive | 0.94 |
| Kimi k3.1-pro (judge) | REVISE | O, conditionally | 0.76 |

Corrections both raised, now applied above or below:
- "Both pass everything" was overstated: they tie on the 148 browser checks and Tauri conformance; both score
  42/44 on the Tauri hostile corpus; the A2UI and a11y suites did not run inside Tauri; settled-state Tauri axe
  scans found 1 violation for H and 2 for O.
- The 21 ms / 1.5% equivalence applies to total stream time only; time-to-first-token differs per scenario.
- The long-task comparison is not like-for-like: H was measured at run settle while its deferred Streamdown work
  continues afterwards. Render-complete measurement is needed before either side claims a CPU win.
- The commit ratio is scenario- and engine-specific (26–35× on long-markdown; lower on cancel-mid-stream). It is
  an implementation-efficiency signal, not proof of user-visible performance.
- The 31 vs 22 eng-day estimates come from different builders with different scopes; O's omits entity-graph work.
- O has one canonical reducer for run status, not one representation of all state (it also has a live-text
  overlay, graph projections and an A2UI processor; its graph bridge is lossy today).
- "assistant-ui was bypassed" omits what H still gets from it: live message rendering, thread primitives,
  cancellation integration and the approval seam, in a 169-line adapter. H also wrote ~600 fewer lines.
- O's maintenance is not zero: it owns AG-UI semantics, entity-graph fixes, Streamdown and alpha A2UI packages.
- The WKWebView slowdown in one O run is an observation; its cause (rAF throttling or otherwise) is unproven.
- Runs were not interleaved (H always before O), with 5 repeats and Tauri conformance run once.

## Recommendation (revised)

**Functionally the spike is a tie. It does not prove a performance winner.** The decision is therefore an
architecture and ownership choice, made with the evidence above:

- **Proposed: O, conditionally** — our own AG-UI core on entity-graph, composed from `@ag-ui/core` types, our SSE
  transport and reducer, Streamdown with explicit allowlists, `@a2ui/react` with a Know Meet catalog and shadcn AI
  Elements patterns. It matches the operator's stated preference (no framework coupling, entity-graph as the store
  of record), keeps one canonical reducer for run and HITL state, and is smaller on initial load (−150,878 B
  brotli, spike builds). Kimi supports this conditionally; MiniMax judges it unproven.
- **H stays the funded fallback.** Reopen H if O misses the gates below within the normalised budget.

## Gates before c08/8.3 builds on O

1. Replace sole reliance on `requestAnimationFrame` for publishing; pass controlled WKWebView window states
   (focused, unfocused, occluded, minimised) and Windows WebView2 with bounded p95 latency.
2. entity-graph hardening: atomic batched transactions without whole-graph copy, render-only live layer,
   lossless ordered AG-UI bridge, no devtools in production — then restart/hydration tests (reload mid-stream,
   pending and expired interrupts, idempotent resume).
3. Re-run both prototypes interleaved, with non-profiling production builds, to render-complete: long tasks,
   CPU, dropped frames, input latency, long-session memory.
4. Full A2UI and a11y suites inside Tauri with trusted keyboard input, plus a real VoiceOver/NVDA pass.
5. Streamdown origin/scheme allowlists and the CSP fix (`img-src`/`media-src`, KaTeX font).
6. One normalised work breakdown and first-year cost for O and H with identical scope, including AG-UI protocol
   ownership and alpha-package upkeep.
7. A separate end-to-end Flutter plan (AG-UI transport, HITL, reconnect, markdown, A2UI) — the 58/58 result
   covers A2UI rendering only.
