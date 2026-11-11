# c15 agentic-UI spike: H vs O measured head-to-head (task 15.5)

OpenSpec change `c15-agentic-ui-spike`, task 15.5. Recorded 2026-11-10 by the know-meet-team bdd-quality role.
This file holds measured facts and their limits only. It makes no recommendation; that belongs to task 15.6.

- **H** is `spikes/agentic-ui/hybrid/`: assistant-ui AG-UI runtime and entity-graph.
- **O** is `spikes/agentic-ui/own/`: its own reducer on entity-graph.

Both were rebuilt with their own `pnpm build` (`tsc --noEmit && vite build`) before every run below.
Neither prototype's source was modified. The raw data is in [`raw/`](raw/), which is indexed at the end.

## Headline (medians; ranges are across the 15 measured scenarios)

| | H | O |
|---|---|---|
| Tauri WKWebView conformance (14 AG-UI scenarios) | 14 / 14 | 14 / 14 |
| Tauri WKWebView hostile corpus (44 items), apps/web CSP | 42 / 44 | 42 / 44 |
| Same 2 media items + 6 other media items + `custom-chunks`, CSP also allowing the harness media origin | 9 / 9 | 9 / 9 |
| Driver parity check: the same in-page driver in Playwright WebKit, no CSP (58 scenarios) | 58 / 58 | 58 / 58 |
| Time to first token, Chromium / WebKit / Tauri (ms) | 71–348 / 45–359 / 28–349 | 93–324 / 12–327 / 16–331 |
| `long-markdown` (20 KB, 3,459 deltas) React commits, Chromium / WebKit / Tauri | 4,574 / 4,483 / 4,481 | 164 / 130 / 170 |
| `hostile/huge-table` (400 rows) React commits, Chromium / WebKit / Tauri | 411 / 412 / 414 | 17 / 23 / 22 |
| Long-task total, Chromium, the other 12 scenarios (ms) | 0 on all 12 | 66–135 |
| Long-task total, Chromium, `long-markdown` / `parallel-tool-calls` / `huge-table` (ms) | 57 / 105 / 327 | 163 / 111 / 494 |
| JS heap after forced GC, Chromium (MB) | 12.5–21.1 | 10.1–20.7 |
| Initial load (index.html + entry JS + runtime + CSS), gzip -9 / brotli -11 | 731,787 B / 600,261 B | 544,899 B / 449,383 B |
| Whole dist without source maps, brotli -11 | 4,241,452 B | 4,090,550 B |

Total stream time is set mostly by the mock server's pacing (`tokensPerSecond`, `eventGapMs`). H and O
differ by at most 21 ms on every sub-second scenario and by at most 1.5% on the longer ones, with these
exceptions:

- Chromium `run-cancelled-by-agent`: H 201 ms, O 109 ms.
- Chromium `run-error`: H 152 ms, O 110 ms.
- Tauri `hostile/huge-table`: H 1,122 ms, O 1,209 ms.

Store commits (entity-graph transactions) are equal or within a few per scenario. O records more on
`malformed-out-of-order` (7–13 against 4) and `parallel-tool-calls` (17–18 against 13).

## Environment

| | |
|---|---|
| Machine | Apple M1 Max, 64 GB, macOS 26.7.3 (25G416), Darwin 25.6.0 arm64 |
| Node / pnpm | v24.11.1 / 11.15.0 |
| Playwright | `@playwright/test` 1.65.0: Chromium 158.0.8127.18 (headless shell), WebKit 27.2 (`webkit-2388`), headless |
| Tauri | `tauri-cli` 2.11.4, `tauri` 2.11.3, `tauri-build` 2.6.3, `tauri-runtime-wry` 2.11.4, `wry` 0.55.1, `tao` 0.35.3, Rust 1.97.1, release build with `custom-protocol` (assets embedded, served from `tauri://localhost`) |
| WKWebView | System WebKit.framework 21624.5.1.11.3; UA `AppleWebKit/605.1.15 … Version/27.2 Safari/605.1.15` |
| Harness | `spikes/agentic-ui/harness`, contract version 1, corpus format 1, `@ag-ui/core` 1.0.4, `@a2ui/web_core` 0.15.0; mock server on 127.0.0.1:4317 |
| Pacing | Corpus defaults for both prototypes (no `rate`/`gap` overrides) everywhere |
| Window / viewport | Playwright 1280×720 (fresh context per run); Tauri window 1280×720 logical, `background_throttling: Disabled` |

## Method

**Same build, same commit counter.** Both `vite.config.ts` files alias `react-dom/client` to
`react-dom/profiling`. Both `main.tsx` files import `createRoot` from `react-dom/client`, so the alias applies.
Both wrap their transcript root in `<Profiler onRender>`: H in `infrastructure/assistant-ui/transcript-view.tsx`,
O in `presentation/transcript.tsx`. The React commit counts are therefore measured the same way. They are not
an identical scope: each Profiler wraps that prototype's own transcript subtree, and H's subtree includes
assistant-ui's thread primitives. Store commits are each prototype's own `storeCommits` (entity-graph
transactions) from `window.__spike.renderCounts()`.

**Browsers.** `measurements/scripts/run-browser.sh` serves each `dist/` with its own `vite preview` (H on 4175,
O on 4173). It then runs the harness `measure` script, unchanged in method, on 15 scenarios × 5 repeats. The
order is H-Chromium, O-Chromium, H-WebKit, O-WebKit, each run in a fresh browser context.
- The 15 scenarios are all 14 AG-UI scenarios plus `hostile/huge-table`.
- Interactive scenarios (`a2ui-over-agui`, `cancel-mid-stream`, `hitl-*`) are measured to their first
  settle without interactions, as the measure script defines. `cancel-mid-stream` therefore streams its whole
  20 KB (about 86.7 s).

**Tauri.** macOS WKWebView has no WebDriver, so Playwright cannot drive the Tauri window. The harness gained
an in-webview driver (`harness/src/webview-driver/`) and a collector (`POST /spike-report`,
`harness/src/server/spike-report.ts`).
- The minimal shell (`tauri-shell/`) installs the driver as the window's initialization script
  (`KM_DRIVER_SCRIPT`).
- The driver walks the plan one page load per step. It sets the composer text (native value setter plus an
  `input` event), clicks submit and waits for settle. In conformance mode it performs the scenario's
  interactions. It then posts `window.__spike.snapshot()`, `renderCounts()`, page metrics, CSP violations
  (`securitypolicyviolation`) and its in-page DOM and hostile checks.
- The collector judges each result with the checks' own `checks/support/compare.ts`, plus the server-side
  hostile guards (evil-listener hits, allowed-media hits). The driver re-posts for up to 10 s while problems
  remain, which matches the checks' `expect.poll`.
- Conformance mode ran all 14 AG-UI scenarios and all 44 hostile items once. It also ran axe-core 4.14.0
  (WCAG 2.0–2.2 A/AA tags) at the settled state of every scenario. Measure mode ran the same 15 scenarios × 5
  as the browsers, with no interactions and no axe.

**Driver parity.** `harness/src/webview-driver/browser-dry-run.ts` runs the identical driver script in
Playwright WebKit against each `vite preview`. The driver alone, with no Tauri and no CSP, gives 58/58 for
both prototypes, the same as the Playwright suites recorded in each `results.md`. The Tauri-only failures
below therefore come from the Tauri environment, not from the driver.

**CSP.** The shell's CSP is `apps/web/scripts/content-security-policy.ts` `buildContentSecurityPolicy` (no
LiveKit URL), with `http://127.0.0.1:4317` appended to `connect-src`. `tauri-shell/scripts/build-shell.ts`
computes it, so it tracks apps/web:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:4317
```

The variant build (`build-shell.ts <p> media`) also adds the harness origin to `img-src` and adds
`media-src 'self' http://127.0.0.1:4317`.

## Browser results (Vite production build, 5 repeats, median / p95)

p95 is nearest-rank over 5 runs, so p95 = the maximum. "n/m" = not measured. All 300 browser runs completed
(0 errors). Raw: `raw/browser-measure-<proto>-<browser>.json` (per-run values, including per-component
renders and DOM nodes).

#### Time to first token (ms)

| Scenario | H-chromium med / p95 | H-webkit med / p95 | O-chromium med / p95 | O-webkit med / p95 |
|---|---|---|---|---|
| `a2ui-over-agui` | 71 / 90 | 81 / 89 | 159 / 237 | 39 / 44 |
| `cancel-mid-stream` | 75 / 92 | 73 / 75 | 127 / 197 | 12 / 13 |
| `custom-chunks` | 128 / 210 | 72 / 76 | 163 / 248 | 39 / 41 |
| `disconnect-reconnect-replay` | 165 / 226 | 70 / 257 | 93 / 110 | 30 / 33 |
| `hitl-approve` | 153 / 234 | 74 / 79 | 114 / 184 | 40 / 47 |
| `hitl-expire` | 128 / 188 | 71 / 79 | 127 / 224 | 40 / 40 |
| `hitl-reject` | 130 / 189 | 73 / 80 | 124 / 213 | 39 / 40 |
| `long-markdown` | 265 / 373 | 99 / 108 | 106 / 132 | 20 / 22 |
| `malformed-out-of-order` | 163 / 192 | 159 / 173 | 123 / 123 | 126 / 131 |
| `parallel-tool-calls` | 146 / 219 | 87 / 95 | 138 / 176 | 58 / 63 |
| `reasoning-subagents-snapshot` | 348 / 351 | 359 / 366 | 324 / 325 | 327 / 327 |
| `run-cancelled-by-agent` | 170 / 193 | 68 / 70 | 100 / 160 | 39 / 43 |
| `run-error` | 140 / 217 | 67 / 71 | 108 / 189 | 39 / 39 |
| `state-snapshot-delta` | 168 / 247 | 172 / 174 | 146 / 188 | 145 / 145 |
| `hostile/huge-table` | 154 / 209 | 45 / 50 | 134 / 324 | 22 / 25 |

#### Total stream time (ms)

| Scenario | H-chromium med / p95 | H-webkit med / p95 | O-chromium med / p95 | O-webkit med / p95 |
|---|---|---|---|---|
| `a2ui-over-agui` | 192 / 203 | 210 / 227 | 189 / 240 | 190 / 193 |
| `cancel-mid-stream` | 86,679 / 86,984 | 86,760 / 86,833 | 86,709 / 86,749 | 86,712 / 86,740 |
| `custom-chunks` | 414 / 422 | 434 / 537 | 404 / 411 | 413 / 440 |
| `disconnect-reconnect-replay` | 1,014 / 1,015 | 1,038 / 1,042 | 1,007 / 1,008 | 1,024 / 1,027 |
| `hitl-approve` | 276 / 284 | 297 / 302 | 268 / 269 | 277 / 293 |
| `hitl-expire` | 276 / 277 | 295 / 295 | 268 / 289 | 273 / 279 |
| `hitl-reject` | 275 / 276 | 296 / 301 | 268 / 269 | 278 / 284 |
| `long-markdown` | 5,855 / 5,859 | 5,924 / 5,952 | 5,871 / 5,895 | 5,852 / 6,022 |
| `malformed-out-of-order` | 275 / 276 | 298 / 318 | 268 / 271 | 277 / 278 |
| `parallel-tool-calls` | 693 / 694 | 704 / 711 | 689 / 705 | 689 / 712 |
| `reasoning-subagents-snapshot` | 493 / 497 | 510 / 511 | 489 / 490 | 496 / 500 |
| `run-cancelled-by-agent` | 201 / 204 | 131 / 133 | 109 / 161 | 112 / 113 |
| `run-error` | 152 / 229 | 111 / 113 | 110 / 191 | 109 / 111 |
| `state-snapshot-delta` | 253 / 262 | 268 / 270 | 250 / 253 | 249 / 259 |
| `hostile/huge-table` | 1,141 / 1,154 | 1,117 / 1,132 | 1,134 / 1,168 | 1,143 / 1,157 |

#### React commits

| Scenario | H-chromium med / p95 | H-webkit med / p95 | O-chromium med / p95 | O-webkit med / p95 |
|---|---|---|---|---|
| `a2ui-over-agui` | 26 / 27 | 26 / 26 | 6 / 13 | 13 / 13 |
| `cancel-mid-stream` | 6,922 / 6,922 | 6,917 / 6,920 | 2,243 / 2,253 | 2,165 / 2,173 |
| `custom-chunks` | 50 / 58 | 58 / 58 | 16 / 20 | 24 / 24 |
| `disconnect-reconnect-replay` | 88 / 89 | 94 / 94 | 44 / 46 | 48 / 49 |
| `hitl-approve` | 28 / 28 | 35 / 36 | 7 / 12 | 12 / 12 |
| `hitl-expire` | 28 / 35 | 35 / 35 | 7 / 12 | 12 / 12 |
| `hitl-reject` | 28 / 32 | 35 / 36 | 7 / 8 | 11 / 12 |
| `long-markdown` | 4,574 / 4,608 | 4,483 / 4,540 | 164 / 167 | 130 / 131 |
| `malformed-out-of-order` | 21 / 24 | 23 / 24 | 12 / 17 | 18 / 19 |
| `parallel-tool-calls` | 97 / 104 | 105 / 106 | 31 / 33 | 35 / 37 |
| `reasoning-subagents-snapshot` | 61 / 61 | 61 / 61 | 24 / 26 | 29 / 29 |
| `run-cancelled-by-agent` | 10 / 15 | 15 / 16 | 4 / 4 | 6 / 7 |
| `run-error` | 10 / 11 | 13 / 14 | 2 / 4 | 6 / 6 |
| `state-snapshot-delta` | 20 / 20 | 20 / 20 | 8 / 8 | 8 / 9 |
| `hostile/huge-table` | 411 / 411 | 412 / 413 | 17 / 18 | 23 / 23 |

#### Store commits

| Scenario | H-chromium med / p95 | H-webkit med / p95 | O-chromium med / p95 | O-webkit med / p95 |
|---|---|---|---|---|
| `a2ui-over-agui` | 6 / 6 | 6 / 6 | 5 / 6 | 6 / 6 |
| `cancel-mid-stream` | 89 / 89 | 89 / 89 | 89 / 89 | 89 / 89 |
| `custom-chunks` | 11 / 11 | 11 / 11 | 11 / 11 | 11 / 11 |
| `disconnect-reconnect-replay` | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 |
| `hitl-approve` | 5 / 5 | 5 / 5 | 6 / 6 | 6 / 6 |
| `hitl-expire` | 5 / 5 | 5 / 5 | 6 / 6 | 6 / 6 |
| `hitl-reject` | 5 / 5 | 5 / 5 | 6 / 6 | 6 / 6 |
| `long-markdown` | 9 / 9 | 9 / 9 | 8 / 8 | 8 / 8 |
| `malformed-out-of-order` | 4 / 4 | 4 / 4 | 7 / 12 | 13 / 13 |
| `parallel-tool-calls` | 13 / 13 | 13 / 13 | 17 / 17 | 18 / 18 |
| `reasoning-subagents-snapshot` | 10 / 10 | 10 / 10 | 13 / 13 | 13 / 13 |
| `run-cancelled-by-agent` | 3 / 3 | 3 / 3 | 3 / 3 | 3 / 3 |
| `run-error` | 3 / 3 | 3 / 3 | 2 / 3 | 3 / 3 |
| `state-snapshot-delta` | 11 / 11 | 11 / 11 | 11 / 11 | 11 / 11 |
| `hostile/huge-table` | 4 / 4 | 5 / 5 | 3 / 3 | 4 / 4 |

#### Long-task total (ms, Chromium only)

| Scenario | H-chromium med / p95 | O-chromium med / p95 |
|---|---|---|
| `a2ui-over-agui` | 0 / 0 | 133 / 200 |
| `cancel-mid-stream` | 0 / 0 | 122 / 173 |
| `custom-chunks` | 0 / 0 | 135 / 220 |
| `disconnect-reconnect-replay` | 0 / 0 | 66 / 83 |
| `hitl-approve` | 0 / 0 | 87 / 153 |
| `hitl-expire` | 0 / 0 | 98 / 196 |
| `hitl-reject` | 0 / 0 | 97 / 184 |
| `long-markdown` | 57 / 72 | 163 / 265 |
| `malformed-out-of-order` | 0 / 0 | 78 / 84 |
| `parallel-tool-calls` | 105 / 176 | 111 / 149 |
| `reasoning-subagents-snapshot` | 0 / 0 | 94 / 134 |
| `run-cancelled-by-agent` | 0 / 0 | 74 / 132 |
| `run-error` | 0 / 0 | 80 / 161 |
| `state-snapshot-delta` | 0 / 0 | 86 / 159 |
| `hostile/huge-table` | 327 / 330 | 494 / 751 |

#### JS heap used at settle, before GC (MB, Chromium only)

| Scenario | H-chromium med / p95 | O-chromium med / p95 |
|---|---|---|
| `a2ui-over-agui` | 17.0 / 17.1 | 14.7 / 15.5 |
| `cancel-mid-stream` | 31.2 / 33.0 | 29.8 / 39.7 |
| `custom-chunks` | 19.6 / 22.0 | 14.4 / 14.8 |
| `disconnect-reconnect-replay` | 21.6 / 21.9 | 15.1 / 15.2 |
| `hitl-approve` | 17.6 / 17.7 | 14.1 / 14.6 |
| `hitl-expire` | 17.6 / 18.9 | 14.0 / 14.6 |
| `hitl-reject` | 17.6 / 18.4 | 14.1 / 14.2 |
| `long-markdown` | 67.0 / 73.6 | 31.7 / 32.5 |
| `malformed-out-of-order` | 19.5 / 20.0 | 14.3 / 14.5 |
| `parallel-tool-calls` | 20.3 / 21.1 | 17.5 / 17.7 |
| `reasoning-subagents-snapshot` | 18.4 / 18.4 | 16.8 / 17.0 |
| `run-cancelled-by-agent` | 18.0 / 18.4 | 13.2 / 13.4 |
| `run-error` | 17.6 / 17.6 | 13.1 / 13.2 |
| `state-snapshot-delta` | 16.4 / 20.0 | 14.3 / 14.5 |
| `hostile/huge-table` | 92.1 / 116.4 | 62.5 / 65.1 |

#### JS heap used after forced GC (MB, Chromium only)

| Scenario | H-chromium med / p95 | O-chromium med / p95 |
|---|---|---|
| `a2ui-over-agui` | 14.0 / 14.0 | 10.8 / 11.0 |
| `cancel-mid-stream` | 21.1 / 21.1 | 20.4 / 20.5 |
| `custom-chunks` | 15.3 / 15.7 | 12.1 / 12.3 |
| `disconnect-reconnect-replay` | 13.7 / 13.7 | 10.8 / 10.8 |
| `hitl-approve` | 13.3 / 13.3 | 10.4 / 10.5 |
| `hitl-expire` | 13.3 / 13.7 | 10.4 / 10.5 |
| `hitl-reject` | 13.3 / 13.5 | 10.4 / 10.4 |
| `long-markdown` | 20.5 / 20.6 | 19.1 / 19.1 |
| `malformed-out-of-order` | 13.4 / 13.8 | 10.5 / 10.6 |
| `parallel-tool-calls` | 14.3 / 14.3 | 11.1 / 11.1 |
| `reasoning-subagents-snapshot` | 13.9 / 13.9 | 10.9 / 11.0 |
| `run-cancelled-by-agent` | 12.8 / 12.9 | 10.1 / 10.2 |
| `run-error` | 12.5 / 12.6 | 10.1 / 10.1 |
| `state-snapshot-delta` | 13.3 / 13.3 | 10.5 / 10.5 |
| `hostile/huge-table` | 20.1 / 20.1 | 20.5 / 20.7 |

Failed measurement runs: hybrid-chromium: 0 failed runs; hybrid-webkit: 0 failed runs; own-chromium: 0 failed runs; own-webkit: 0 failed runs.

H's long-task and DOM figures are taken at the instant `runStatus` settles, as the harness defines them. H
renders Streamdown deferred (`useDeferredValue`), so part of its render work, and its DOM, lands after settle
and is not counted here. H's own supplement (`hybrid/evidence/render-lag-*.json`) measures settle-to-render:
`huge-table` took +46 ms in Chromium with 214 ms of long tasks. The DOM-node column in
`raw/browser-measure-*.json` shows the same effect (H `huge-table` 28 nodes at settle).

## Bundle (`dist/`, the same files the Tauri shell embeds)

"Initial load" is `index.html` plus every script and stylesheet it references. Everything else (Shiki grammars,
Mermaid, lazy chunks) loads on demand.

| | Raw | gzip -9 | brotli -11 | Files |
|---|---|---|---|---|
| H initial load (index.html, assets/index-DhsX1UV8.js, assets/rolldown-runtime-vfrPO-fZ.js, assets/index-GbR0O9d6.css) | 2,531,656 | 731,787 | 600,261 | 4 |
| H all JS | 15,097,642 | 3,331,642 | 2,802,421 | 398 |
| H total dist (no source maps) | 16,814,672 | 4,795,327 | 4,241,452 | 465 |
| O initial load (index.html, assets/index-B5KV0FZv.js, assets/rolldown-runtime-COiEfhsA.js, assets/index-DI2BWDTu.css) | 1,857,597 | 544,899 | 449,383 | 4 |
| O all JS | 14,440,509 | 3,147,718 | 2,653,833 | 398 |
| O total dist (no source maps) | 16,140,763 | 4,608,328 | 4,090,550 | 465 |

## Tauri 2 / macOS WKWebView results

### Conformance and hostile corpus (one run each, apps/web CSP)

| | H | O |
|---|---|---|
| AG-UI conformance (`checks/conformance.spec.ts` equivalent) | 14 / 14 | 14 / 14 |
| Hostile corpus (`checks/hostile.spec.ts` equivalent) | 42 / 44 | 42 / 44 |
| Failing items | `hostile/media-md-image-allowed`, `hostile/media-custom-image-allowed` | the same two |
| Failure | "allowed media requests: expected at least 1, got 0" | the same |
| Same items with `img-src`/`media-src` allowing the harness origin | pass (9/9 incl. all 8 media items) | pass (9/9) |
| Re-posts needed (lazy render caught up within the 10 s poll) | `custom-chunks` (Mermaid SVG), `hostile/huge-table` | `custom-chunks`, `hostile/mermaid-html-label` |
| axe 4.14.0, WCAG 2.0–2.2 A/AA, settled state of all 58 scenarios | 1 violation: `color-contrast` (1 node) on `a2ui-over-agui` | 2: `color-contrast` (1 node) on `a2ui-over-agui`; `target-size` (2 nodes) on `custom-chunks` |
| Driver parity in Playwright WebKit (same driver, no CSP) | 58 / 58; axe the same as above | 58 / 58; axe the same as above |

Every other hostile guard held for both prototypes inside WKWebView:

- the `__kmXss` sentinel was never called;
- no `alert`, `confirm` or `prompt` call;
- no unexpected navigation;
- no resource-timing entry outside the page, harness, `data:` and `blob:` origins;
- zero evil-listener hits;
- no `on*` attribute;
- every forbidden and required selector, and every `mustShowText`, as in the corpus.

The axe result is broader than `checks/a11y.spec.ts`, which scans only `long-markdown` (idle, mid-stream,
settled) and a pending approval card. `long-markdown` settled is clean here. The pending-approval state was not
scanned in Tauri. The violations listed come from scenarios that the a11y spec does not scan with axe.

### CSP findings (`securitypolicyviolation` events; identical for H and O)

| Directive | Blocked | Count (58 scenarios) | Source |
|---|---|---|---|
| `script-src` | `eval` | 58 (once per page load) | Both entry bundles: zod 4's `allowsEval` probe (`try { Function("") } catch`). It is caught, and zod falls back to its non-JIT path. No functional effect observed |
| `font-src` | `data:` | 61 (O), 62 (H) | `KaTeX_Size3` woff2 inlined as a `data:` URI by Vite (`assetsInlineLimit`) in both CSS bundles; the next `src` (`.woff` file) is same-origin. H's extra 1 is attributed to `user-script` (the injected axe) |
| `img-src` | `http://127.0.0.1:4317/media/{whiteboard,poster,hostile}.png/svg` | 9 | The allowlisted media origin. Both prototypes render the `<img>` (snapshot `rendering: "renderer"`), and the CSP blocks the load. This causes the 2 hostile failures |
| `media-src` (falls back to `default-src 'self'`) | `clip.mp4`, `note.wav` | 3 | Same cause, for `<video>`/`<audio>` |

With the media variant CSP, only the `eval` probe and the `data:` font remain (19 events over 9 scenarios).
`style-src 'self' 'unsafe-inline'` produced no violations.

The effective policy Tauri served is the configured policy plus one `'sha256-…'` source in `script-src` for
every embedded JS asset: 398 hashes for each prototype, mostly lazy Shiki grammar chunks. The response header
is 21,764 bytes. WKWebView accepted it. Tauri added no nonce or hash to `style-src`, so `'unsafe-inline'` stays
effective.

### Metrics in WKWebView (measure mode, 15 scenarios × 5, median / p95)

| Scenario | TTFT ms H | TTFT ms O | Total ms H | Total ms O | React commits H | React commits O | Store commits H | Store commits O | DOM nodes at settle H | DOM nodes at settle O |
|---|---|---|---|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 64 / 83 | 48 / 51 | 210 / 218 | 210 / 212 | 27 / 27 | 11 / 13 | 6 / 6 | 6 / 6 | 42 / 42 | 40 / 40 |
| `cancel-mid-stream` | 72 / 77 | 16 / 21 | 86,711 / 86,841 | 86,695 / 86,728 | 6,880 / 6,889 | 2,201 / 2,213 | 89 / 89 | 89 / 89 | 1,790 / 1,790 | 2,208 / 2,208 |
| `custom-chunks` | 63 / 75 | 48 / 61 | 430 / 439 | 419 / 448 | 58 / 59 | 22 / 22 | 11 / 11 | 11 / 11 | 72 / 169 | 163 / 163 |
| `disconnect-reconnect-replay` | 63 / 67 | 35 / 36 | 1,028 / 1,056 | 1,025 / 1,047 | 94 / 94 | 44 / 48 | 4 / 4 | 4 / 4 | 28 / 28 | 26 / 26 |
| `hitl-approve` | 63 / 70 | 46 / 54 | 283 / 306 | 281 / 302 | 36 / 36 | 11 / 11 | 5 / 5 | 6 / 6 | 41 / 41 | 41 / 41 |
| `hitl-expire` | 64 / 68 | 45 / 46 | 286 / 298 | 279 / 280 | 36 / 36 | 11 / 12 | 5 / 5 | 6 / 6 | 41 / 41 | 41 / 41 |
| `hitl-reject` | 61 / 70 | 46 / 134 | 282 / 302 | 281 / 293 | 36 / 36 | 11 / 12 | 5 / 5 | 6 / 6 | 41 / 41 | 41 / 41 |
| `long-markdown` | 45 / 49 | 21 / 56 | 5,869 / 5,880 | 5,931 / 6,020 | 4,481 / 4,507 | 170 / 172 | 9 / 9 | 8 / 8 | 1,790 / 1,790 | 2,208 / 2,208 |
| `malformed-out-of-order` | 148 / 149 | 133 / 143 | 283 / 287 | 286 / 304 | 24 / 24 | 17 / 19 | 4 / 4 | 13 / 13 | 28 / 28 | 26 / 26 |
| `parallel-tool-calls` | 76 / 83 | 60 / 61 | 692 / 712 | 689 / 711 | 105 / 106 | 35 / 37 | 13 / 13 | 18 / 18 | 57 / 57 | 70 / 70 |
| `reasoning-subagents-snapshot` | 349 / 354 | 331 / 337 | 498 / 525 | 499 / 503 | 61 / 61 | 28 / 29 | 10 / 10 | 13 / 13 | 33 / 33 | 30 / 30 |
| `run-cancelled-by-agent` | 62 / 64 | 47 / 49 | 127 / 134 | 126 / 126 | 16 / 16 | 7 / 7 | 3 / 3 | 3 / 3 | 29 / 29 | 27 / 27 |
| `run-error` | 63 / 69 | 45 / 48 | 111 / 125 | 105 / 117 | 14 / 14 | 5 / 6 | 3 / 3 | 3 / 3 | 31 / 31 | 28 / 28 |
| `state-snapshot-delta` | 167 / 169 | 154 / 195 | 260 / 264 | 257 / 306 | 20 / 20 | 8 / 8 | 11 / 11 | 11 / 11 | 28 / 28 | 26 / 26 |
| `hostile/huge-table` | 28 / 35 | 18 / 22 | 1,122 / 1,187 | 1,209 / 1,240 | 414 / 415 | 22 / 23 | 5 / 5 | 4 / 4 | 163 / 229 | 4,441 / 4,441 |

Long-task total and JS heap: not measurable in WKWebView (no long-task entry type, no performance.memory); every run reported null.

### WKWebView-specific behaviour observed

- **`requestAnimationFrame` depends on the window's state, and O is sensitive to it.** O publishes streamed
  text and status through `requestAnimationFrame` (`browserScheduler.onFrame`); H does not depend on it for
  publishing. In the first O measure run, nobody controlled or recorded whether the window was in front.
  - Sub-second scenarios took about 900 ms in that run: `hitl-approve` 907 ms against 281 ms in the
    accepted run.
  - React commits collapsed: `long-markdown` 15 against 170, `huge-table` 4 against 22.
  - That run is kept in `raw/discarded/tauri-own-measure-mwax9aw9.jsonl` and is not used in any table.

  A diagnostic run with a continuous rAF loop measured 48–62 frames/s and O at browser-like values
  (`raw/diag-*.jsonl`). That run's O window was not frontmost. The accepted measure runs started with the
  app brought to the front (`osascript … set frontmost`, exit 0). The driver recorded `visibilityState` as
  `visible` for all 75 results of each run. `document.hasFocus()` was true for only 5/75 (H) and 9/75 (O),
  so focus alone does not explain the earlier slowdown. Window occlusion cannot be observed from page
  script, so the cause is not established. The fact that is established: O's measured latency in a
  WKWebView window can triple in a window state that this harness did not control.
- **No long-task API.** WKWebView accepts `PerformanceObserver.observe({ type: "longtask" })` without
  throwing but never emits entries. My first instrumentation therefore reported 0. It now checks
  `PerformanceObserver.supportedEntryTypes`, and the harness `page-timeline.ts` got the same guard. Long-task
  values for WKWebView are "not measured", not 0.
- **No JS heap.** `performance.memory` is absent, so JS heap is not measurable from page script in WKWebView.
  The WebContent process's RSS was not measured: it is shared XPC infrastructure, not attributable to one
  window.
- **`hostile/huge-table` DOM at settle** is far smaller for H (median 163 nodes) than for O (4,441). This is
  H's deferred render (see above), not missing content: the conformance run's 10 s re-poll found all 400 rows.

## What was not measured, and why

- **Windows WebView2**: out of scope on this Mac. It is a gap: nothing here says anything about WebView2.
- **Trusted input in Tauri.** There is no WebDriver for WKWebView, so the following ran as substitutions,
  each recorded per result in `client.deviations`:
  - keyboard approvals (`hitl-approve`/`hitl-reject` require Enter/Space) were activated with `focus()` +
    `click()`;
  - `a2ui-over-agui`'s pointer click was an `element.click()` on the component's button.

  Keyboard reachability and Enter/Space activation in WKWebView are **not verified**. The Playwright WebKit
  suite verified them in each `results.md`.
- **`checks/a11y.spec.ts` in Tauri** (aria-busy, live-region throttling and final announcement, focus not
  stolen, Tab order, `role=alert`): not run. Only the settled-state axe scan above ran.
- **`checks/a2ui-surfaces.spec.ts` (8 golden surfaces) in Tauri**: not run. Only `a2ui-over-agui` (part of
  conformance) exercised A2UI in WKWebView.
- **Long tasks and JS heap in WebKit and WKWebView**: no API (see above).
- **Tauri dev-server (`devUrl`) and bundled `.app` runs**: only the `--no-bundle` release binary was run.
  The `.app` bundle, code signing and App Sandbox were not exercised.

## Caveats

- **Sample sizes.** Five repeats: p95 is the maximum and sensitive to one outlier. Conformance and hostile
  ran once per prototype in Tauri.
- **Run conditions.** One machine, one session, a normal desktop with other apps open; no CPU pinning.
  - Browser order was H then O per browser. Tauri measure order was H then O.
  - Machine load during the browser runs was not otherwise controlled.
- **Discarded runs (kept in `raw/discarded/`, not used in any table):**
  - A first browser pass was stopped part-way, because I expected a Rust build to start alongside it. The
    build actually stalled in `sccache rustc -vV` and compiled nothing. That pass's partial JSON files were
    deleted when it was stopped; its log is kept (`browser-run-stopped.log`).
  - Two H Tauri measure runs were discarded. One overlapped a CSP-variant shell build by about 30 s. The
    other was superseded so that H and O were measured under the same window-activation procedure.
  - One O Tauri measure run was discarded for the rAF window-state reason above.
- **Built-in time resolution.** `totalStreamMs` uses 20 ms polling. TTFT is a MutationObserver timestamp
  from the submit click in the capture phase. In Tauri the click is `element.click()`; in Playwright it is a
  real click.
- **Browsers are headless Playwright builds**, not the Chrome or Safari applications. WKWebView here is the
  system WebKit framework, a different build from Playwright's WebKit 27.2.
- **The CSP is apps/web's current policy.** The 2 hostile failures measure that policy against
  harness-origin media; they do not measure prototype media handling. The variant run shows both
  prototypes pass when the origin is allowed.
- **Profiling build.** Both prototypes ship `react-dom/profiling` for comparable commit counts. Production
  bundles without it would be smaller and slightly faster for both.
- **Build workaround.** Shell builds ran with `RUSTC_WRAPPER=` because this machine's global
  `rustc-wrapper = sccache` hung. This does not affect runtime.

## Commands run (from `spikes/agentic-ui/`)

```bash
(cd hybrid && pnpm build); (cd own && pnpm build)
# harness mock server + collector, restarted to load POST /spike-report (left running on :4317)
(cd harness && node src/server/main.ts &)
# browsers: vite preview per prototype, then harness measure, 15 scenarios x 5, Chromium and WebKit
REPEATS=5 measurements/scripts/run-browser.sh
# Tauri shells (apps/web CSP + connect-src :4317), and the media-origin variants
(cd tauri-shell && RUSTC_WRAPPER= node scripts/build-shell.ts own && RUSTC_WRAPPER= node scripts/build-shell.ts hybrid)
(cd tauri-shell && RUSTC_WRAPPER= node scripts/build-shell.ts own media && RUSTC_WRAPPER= node scripts/build-shell.ts hybrid media)
# Tauri conformance (14 AG-UI + 44 hostile, axe at settle) and measure (15 x 5)
STAGES=conformance PROTOS="own hybrid" measurements/scripts/run-tauri.sh
STAGES=measure PROTOS="hybrid own" measurements/scripts/run-tauri.sh
# media-origin variant
(cd harness && node src/webview-driver/tauri-run.ts --binary ../tauri-shell/bin/km-spike-<p>-media --prototype <p>-media \
  --mode conformance --scenarios custom-chunks,hostile/media-md-image-allowed,hostile/media-md-image-disallowed,\
hostile/media-raw-video-audio,hostile/media-custom-image-allowed,hostile/media-custom-video-allowed,\
hostile/media-custom-audio-disallowed,hostile/media-custom-javascript-url,hostile/media-custom-svg-image)
# driver parity (needs vite preview of the prototype)
(cd harness && node src/webview-driver/browser-dry-run.ts --url http://127.0.0.1:<4175|4173>/ --prototype <p> --browser webkit)
# rAF diagnostic
(cd harness && node src/webview-driver/tauri-run.ts --binary ../tauri-shell/bin/km-spike-<p> --prototype <p> --mode measure \
  --repeats 3 --frame-probe --scenarios hitl-approve,long-markdown,state-snapshot-delta)
node measurements/scripts/summarize.ts   # writes raw/summary.json, prints these tables
```

The sequence used for the first conformance, dry-run and browser pass is `raw/logs/run-chain.sh.txt`; its
output is `raw/logs/run-chain.log`.

## Evidence index (`measurements/raw/`)

| File | Content |
|---|---|
| `browser-measure-{hybrid,own}-{chromium,webkit}.json` | Harness measure reports, every run, plus bundle sizes per asset |
| `tauri-{hybrid,own}-conformance-*.jsonl` | Every collector record of the Tauri conformance runs: snapshot, metrics, CSP violations, axe, deviations, verdict per attempt |
| `tauri-{hybrid,own}-measure-*.jsonl` | Tauri measure runs used in the tables |
| `tauri-{hybrid,own}-media-conformance-*.jsonl` | Media-origin CSP variant |
| `dryrun-*.jsonl` | Driver parity runs in Playwright WebKit |
| `diag-*-measure-fps-*.jsonl` | rAF frame-rate diagnostic |
| `summary.json` | Aggregates computed by `scripts/summarize.ts` |
| `discarded/` | Runs excluded from the tables, with the reasons given above |
| `logs/` | Chain log, shell build logs |
