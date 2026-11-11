# Gate 16.3 follow-up: O's ~1 s WebKit stall on the 20 KB streams

Change `c16-agentic-core-gates`, gate 16.3 follow-up. Date: 2026-11-11. Author: architect (prototype O owner).
Raw evidence: [`raw/16-3-followup/`](raw/16-3-followup/). Spike VLBV exception applies (prototype O only).

## Verdict

**Root cause found and fixed.** The stall was Shiki's first syntax-highlighting call, not the 16.1
publish scheduler, entity-graph commits, Streamdown re-parsing, KaTeX, Mermaid or GC. O highlights the
answer's first ```` ```ts ```` fence with `@streamdown/code` 2.0.0. That plugin uses Shiki 4.6.0's JavaScript
regex engine on the main thread. The first `codeToTokens` for a grammar compiles the grammar's regular
expressions, which for TypeScript takes **~1.07 s in WebKit (JSC)** and ~75 ms in Chromium, as one
uninterruptible task. H never pays this cost because **H does not syntax-highlight at all**: its code
fences render as plain `<pre><code>` (0 highlighted spans; O has 308).

**Fix:** O now runs the unchanged `@streamdown/code` plugin inside a dedicated module Worker. A small
main-thread adapter keeps Streamdown's plugin contract. Highlighting is unchanged: 308 highlighted spans.

Paired O − H, 10 pairs per cell, median [95% CI]; before = 16.3, after = this follow-up:

| WebKit 27.2 | `long-markdown` before → after | `cancel-mid-stream` before → after |
|---|---|---|
| Worst input latency in-stream (ms) | +908 [885, 1112] → **+2 [−1, 4]** | +939 [925, 966] → **+1 [−5, 3]** |
| Worst animation frame (ms), O median | 1,113 → **21.5** (H 30) | 898 → **26** (H 40) |
| Dropped frames, O − H | +65 [64, 67] → **−1.5 [−2.5, −1]** | +59 [52, 64] → **+1.5 [−2, 3]** (n.s.) |

| Chromium 158 | before → after |
|---|---|
| `long-markdown` long-task total, O − H (ms) | +76.5 [75, 78] → **0 [0, 0]** (O: one 74–86 ms task per run → none) |
| `long-markdown` / `cancel-mid-stream` dropped frames | +3 / +2 (M) → **0 / 0** |
| `hostile/huge-table` long-task total | +66.5 [31, 95] → +79.5 [41.5, 97]: **not this cause, not fixed** (§3 notes) |

Hostile 88/88, conformance 14/14 per engine, unit tests 34/34. O is on entity-graph 4.4.0
(`batchGraphWrites`, `createLiveLayer`).

## 1. Reproduction and evidence: what runs during the gap

`gates/scripts/webkit-stall-probe.ts` (Playwright WebKit 27.2, headless, 1280×720, the 16.3
non-profiling build of O unchanged, harness :4317, corpus pacing) records from page load: every rAF
timestamp; a 10 ms `setTimeout` heartbeat with the rendered `.km-md` text length; resource-timing entries.

| Run (fresh browser each) | Largest frame gap | Starts at (from submit) | Text rendered at gap start | Largest heartbeat gap | Shiki chunks finished loading |
|---|---|---|---|---|---|
| 1 | 1082 ms | 276 ms | 657 chars | 1075 ms (from 282 ms) | 287 ms |
| 2 | 1096 ms | 295 ms | 745 chars | 1077 ms (from 306 ms) | 306 ms |
| 3 | 1109 ms | 288 ms | 732 chars | 1094 ms (from 294 ms) | 298 ms |
| 4 | 1100 ms | 296 ms | 732 chars | 1085 ms (from 302 ms) | 307 ms |
| 5 | 1097 ms | 277 ms | 677 chars | 1090 ms (from 283 ms) | 288 ms |
| **after fix**, 5 runs | 23–30 ms | n/a | n/a | 73–74 ms (all before submit) | in the worker |

- **The main thread is blocked**, not just rendering: the 10 ms heartbeat stops for the same ~1.08 s.
  So this is one long JavaScript task, not a compositor or frame-throttling effect. That rules out the
  16.1 scheduler's deadline/MessageChannel/visibility paths, which only decide *when* a flush runs:
  every flush is short, and no other heartbeat gap exceeds 90 ms.
- **It always starts 0–7 ms after Shiki's lazy chunks arrive** (`github-light`, `github-dark`,
  `typescript` grammar, ~250–310 ms after submit). That is when the first fence (` ```ts `, ~650–750
  characters into the answer) becomes highlightable. No KaTeX or Mermaid chunk loads near the gap:
  KaTeX fonts arrive ~1.1 s later, after the gap, and the corpus has no Mermaid fence.
- **H in the same probe:** largest gap 36 ms, and no Shiki chunk is ever requested
  (`probe-hybrid-baseline-webkit-long-markdown.json`). A DOM check after the stream
  (`gates/scripts/highlight-dom-check.mjs`) shows H's 22 `<pre>` blocks have 0 highlighted spans; O's have 308.

### Isolating the cost (micro-benchmark, no React, no Streamdown)

`gates/bench/` builds a page that runs Shiki 4.6.0 exactly as `@streamdown/code` does
(`createHighlighter({ themes: [github-light, github-dark], langs: [typescript], engine:
createJavaScriptRegexEngine({ forgiving: true }) })`) on the 22 fences of the corpus. 3 runs per cell,
`raw/16-3-followup/shiki-first-use-bench.jsonl`:

| Engine, mode | import | createHighlighter | **first `codeToTokens`** | 2nd call | all 22 fences after | main-thread max gap |
|---|---|---|---|---|---|---|
| webkit, regex | 47–55 | 11–12 | **1063–1080** | 1–1 | 8–9 | = first call |
| webkit, precompiled | 855–871 | 2–3 | **601–609** | 0–1 | 7–8 | = first call |
| webkit, worker | — | 9–10 | **1065–1071** | — | 8–9 | 16–16 |
| chromium, regex | 15–23 | 8–8 | **74–76** | 1–1 | 8–8 | = first call |
| chromium, precompiled | 33–34 | 2–2 | **39–40** | 1–1 | 8–9 | = first call |
| chromium, worker | — | 9–10 | **75–76** | — | 8–9 | 13–13 |

All times are in ms. In worker mode, the first-call column is the time measured inside the worker; the main thread only waits for a message.

- The whole cost is the **first tokenisation**: Shiki compiles a grammar's patterns lazily, on first
  use. Later calls cost ~1 ms. WebKit is ~14× slower than Chromium here.
- **Precompiled grammars do not help in WebKit.** `@shikijs/langs-precompiled` with the raw engine
  skips the Oniguruma-to-JS transpile but moves ~860 ms into parsing the precompiled regex literals at
  import, and still pays ~600 ms on first use. The cost is JSC compiling large regular expressions, not
  the transpile. (In Chromium precompiled halves it: 40 ms.)
- **The same cost explains the Chromium long task.** In 16.3, O's `long-markdown` had exactly one long
  task per run, 74–86 ms (H: none). Shiki's first use costs 73–78 ms in Chromium.
- **A Worker removes it from the main thread.** In WebKit the worker pays the same 1.07 s, but the
  main-thread heartbeat's largest gap stays at 16 ms.

## 2. The fix

| File | Change |
|---|---|
| `src/infrastructure/shiki-highlight.worker.ts` (new) | Worker endpoint: the unchanged `createCodePlugin()` from `@streamdown/code` (its result cache and incremental grammar-state cache for streaming blocks included). Replies drop `grammarState`, which cannot be structured-cloned and which Streamdown's renderer does not read. |
| `src/infrastructure/worker-code-highlighter.ts` (new) | Main-thread `CodeHighlighterPlugin`. `highlight()` returns a cached complete-block result synchronously, or posts to the worker, returns `null` and calls back later. Streamdown keeps the previous tokens or the plain code meanwhile. Identical in-flight requests are posted once. Only complete blocks are cached (LRU 256). The worker is created on first use. Language support and theme names come from the main-thread `code` plugin, which is never asked to highlight. With no `Worker`, or after a worker error, every call falls back to the main-thread plugin. The worker sits behind a `HighlightWorker` port. |
| `src/main.tsx` | Composition root builds the highlighter and puts it in `SessionServices.codeHighlighter`. |
| `src/presentation/{markdown,message-view,session-context}.tsx` | `Markdown` takes the highlighter as a prop instead of importing `code`. Presentation no longer chooses an adapter. |
| `vite.config.ts` | `worker: { format: "es" }` (Shiki's lazy grammar and theme imports need an ES-module worker). |

Behaviour notes:
- **First highlight arrives later, not sooner.** In WebKit the first fence shows plain monospace code for
  ~1.1 s, then highlights. In Chromium the delay is ~0.1 s. Every later fence highlights within one
  worker round trip.
- **CSP.** The worker is a same-origin file, so the apps/web policy needs no change (`worker-src` falls
  back to `script-src 'self'`). Checked under the 16.5 policy, see §4.
- **Bundle.** One extra chunk: `shiki-highlight.worker-*.js`, plus the worker's own lazy grammar and
  theme chunks. The main bundle still contains `@streamdown/code`, because language support is read
  from it.

### entity-graph 4.4.0

O now uses `@prometheus-ags/entity-graph-core` / `-react` **4.4.0**, up from 4.3.0. The API was
verified against the installed `dist/index.d.ts` and `CHANGELOG.md`.

| 4.4.0 feature | What it replaces in O |
|---|---|
| `batchGraphWrites(fn)` | `EntityGraphTranscriptStore.commit` made one `upsertEntities` or `removeEntity` call per entity type, which meant one graph publication each. Now every write of a commit goes into one batch: one atomic publication per commit. |
| `createLiveLayer()` | `LiveTextBuffer` held published streaming text in its own map with its own listeners. Published text now lives in the render-only live layer: a `text` field on the `KmMessage` entity, never a graph write, never persisted, never sent to devtools. It sits behind a new application port, `LiveTextOverlay` (`ports.ts`), with the adapter `infrastructure/entity-graph-live-text.ts`. Staging and the publish cadence stay in the application layer. `InMemoryLiveTextOverlay` keeps unit tests graph-free. Live values are discarded, not committed, when a message stops streaming, because the durable text already arrives through boundary and checkpoint commits. |
| Lossless, ordered AG-UI bridge | Used unchanged through `applyAgUiSnapshot` / `applyAgUiDelta`. O ignored the old `void` return, so the new `{ applied, state }` return needs no change. Behaviour change adopted: entities the agent removes are now removed. `state-snapshot-delta` conformance passes. |
| Production devtools gating | O had no workaround. 4.4.0 turns emission off by itself in production browser bundles. |

## 3. Before / after: paired measurement against H

Method: unchanged 16.3 tooling (`harness/src/measure/paired-measure.ts` → `render-run.ts` →
`render-timeline.ts`). 10 interleaved, randomised pairs per scenario and engine (seed 1637, +1000 for
WebKit), a fresh context per run, Chromium 158 headless shell and WebKit 27.2. H is the 16.3
non-profiling build, unchanged (`harness/reports/builds-16-3/hybrid-no-profiling`, :4295). O is the
fixed non-profiling build (`gates/builds/own-fix-no-profiling`, built with the same
`measurements/scripts/vite-variant.config.mts`, :4298). **Before** = the 16.3 measured runs of the same
scenarios. **After** = this run. Statistics: `gates/scripts/summarize-16-3-followup.ts`, the same method
as `paired-report.ts`: median of O − H within a repetition, 95% percentile bootstrap, 10,000 resamples,
same per-cell seeds. "M" = the CI excludes 0. Raw:
`raw/16-3-followup/paired/followup-{chromium,webkit}.json`, `summary.json`, `summary.md`.

120 new runs (60 per engine: 3 scenarios × 10 pairs), 0 errors, 0 render-complete timeouts.
Chromium 08:49–09:21 UTC, WebKit 09:21–09:54 UTC, 1-min load 4.4–19.3 (median 5.6 / 5.7).
Each cell: O median vs H median: **median O − H** [95% CI], pairs O>H/O<H, M if meaningful.

| Metric | Engine | Scenario | Before (16.3) | After |
|---|---|---|---|---|
| Worst input latency (ms) | webkit | `long-markdown` | 932 vs 23: **908** [885, 1112] 10/0 M | 22 vs 20.5: **2** [-1, 4] 7/3 |
| Worst input latency (ms) | webkit | `cancel-mid-stream` | 964 vs 24.5: **939** [925, 966] 10/0 M | 25.5 vs 23.5: **1** [-5, 3] 6/3 |
| Worst input latency (ms) | webkit | `hostile/huge-table` | 83 vs 66: **12.5** [-13.5, 52] 6/4 | 85.5 vs 50.5: **38** [1, 66.5] 8/2 M |
| Worst frame (ms) | webkit | `long-markdown` | 1112 vs 39: **1074** [1067, 1085] 10/0 M | 21.5 vs 30: **-8** [-10.5, -5] 0/10 M |
| Worst frame (ms) | webkit | `cancel-mid-stream` | 898 vs 47.5: **842** [587, 950] 10/0 M | 26 vs 40: **-11.5** [-17, -8] 0/10 M |
| Worst frame (ms) | webkit | `hostile/huge-table` | 66 vs 52.5: **14.5** [10.5, 18] 10/0 M | 64 vs 47: **17** [13, 65] 10/0 M |
| Dropped frames | webkit | `long-markdown` | 69 vs 3: **65** [64, 67] 10/0 M | 0 vs 1.5: **-1.5** [-2.5, -1] 0/9 M |
| Dropped frames | webkit | `cancel-mid-stream` | 84 vs 26.5: **59** [52, 64] 10/0 M | 5.5 vs 4: **1.5** [-2, 3] 6/3 |
| Dropped frames | webkit | `hostile/huge-table` | 14.5 vs 25: **-9** [-10, -8] 0/10 M | 14 vs 20.5: **-4.5** [-6.5, -1] 2/8 M |
| Median input latency (ms) | webkit | `hostile/huge-table` | 34.5 vs 46.5: **-12** [-21.8, -6.8] 1/9 M | 39.5 vs 21.8: **12** [8.8, 23.2] 9/1 M |
| Render-complete (ms) | webkit | `long-markdown` | 5866 vs 5866: **-3.5** [-41, 5.5] 5/5 | 5896 vs 5910: **-19** [-33, 0.5] 2/8 |
| Render-complete (ms) | webkit | `hostile/huge-table` | 1162 vs 1144: **12.5** [0.5, 25.5] 8/2 M | 1156 vs 1132: **19** [6, 26] 8/2 M |
| Long-task total (ms) | chromium | `long-markdown` | 76.5 vs 0: **76.5** [75, 78] 10/0 M | 0 vs 0: **0** [0, 0] 0/0 |
| Long-task total (ms) | chromium | `hostile/huge-table` | 264 vs 212: **66.5** [31, 95] 9/1 M | 260 vs 168: **79.5** [41.5, 97] 9/1 M |
| Worst frame (ms) | chromium | `long-markdown` | 66.6 vs 16.8: **49.8** [33.2, 49.9] 10/0 M | 16.8 vs 16.8: **0** [0, 0] 0/0 |
| Worst frame (ms) | chromium | `cancel-mid-stream` | 41.7 vs 16.8: **24.9** [16.5, 33.2] 10/0 M | 16.8 vs 16.8: **0** [0, 0] 0/0 |
| Dropped frames | chromium | `long-markdown` | 3 vs 0: **3** [2, 3] 10/0 M | 0 vs 0: **0** [0, 0] 0/0 |
| Dropped frames | chromium | `cancel-mid-stream` | 2 vs 0: **2** [1, 2] 10/0 M | 0 vs 0: **0** [0, 0] 0/0 |
| Worst input latency (ms) | chromium | `long-markdown` | 19.5 vs 18.2: **1.1** [-1.5, 45.2] 5/5 | 17.8 vs 23.8: **-6.1** [-7.8, -2.3] 1/9 M |
| Main-thread task time (ms) | chromium | `long-markdown` | 807 vs 2393: **-1595** [-1655, -1538] 0/10 M | 780 vs 2345: **-1551** [-1605, -1511] 0/10 M |
| Scripting time (ms) | chromium | `long-markdown` | 334 vs 1624: **-1303** [-1342, -1254] 0/10 M | 372 vs 1571: **-1186** [-1220, -1159] 0/10 M |
| JS heap after GC (MB) | chromium | `long-markdown` | 19.1 vs 20.9: **-1.8** [-1.9, -1.8] 0/10 M | 15.7 vs 20.9: **-5.2** [-5.2, -5.1] 0/10 M |
| JS heap after GC (MB) | chromium | `cancel-mid-stream` | 20.6 vs 21.5: **-0.9** [-0.9, -0.8] 0/10 M | 17.1 vs 21.5: **-4.3** [-4.4, -4.3] 0/10 M |

Every metric × scenario × engine cell (render-complete, render lag, TTFT, CPU, heap, input median) is in `raw/16-3-followup/summary.md`.

Notes:
- **The stall is gone in both long streams and both engines.** WebKit worst input latency and worst
  frame are now within a few ms of H. All 10 O runs have a worst frame below H's on both long streams.
  Chromium's single 74–86 ms Shiki long task is gone (0 in all 10 runs).
- **Other O − H differences on the long streams are unchanged in sign**: TTFT, main-thread and
  scripting time (O still −1.2 to −1.6 s of scripting on `long-markdown`), render-complete.
  O's heap after GC is ~3.4 MB lower than before because the Shiki highlighter and grammar now live in
  the worker's heap. CDP `JSHeapUsedSize` does not count the worker's heap, so this is moved memory, not saved memory.
- **`hostile/huge-table` is a separate, unfixed issue.** It has no code fences and the fix does not
  touch it: O's Chromium long-task total is still higher (+80 ms) even though its total main-thread time
  is ~480 ms lower. WebKit's worst frame is +17 ms. In this run, unlike 16.3, O's WebKit input latency is
  also higher (median +12, worst +38). The 16.3 data show the pattern: O has 3–5 long tasks of ~65 ms;
  H has 2–4. Hypothesis, **not established**: O's adaptive publish interval (16 ms + 1 ms per 400 chars)
  makes fewer but larger re-parses of the growing 400-row table, and each crosses the 50 ms long-task
  line. H spreads the same work over more, smaller tasks. Next step: a Chromium CPU profile of one
  `huge-table` run, then cap per-publish work (for example, publish a block-stable prefix).

## 4. Suites

| Suite | Build | Result | Evidence |
|---|---|---|---|
| Hostile (`pnpm check --grep @hostile`, Chromium + WebKit) | fixed, non-profiling | **88 / 88** passed, 0 flaky | `raw/16-3-followup/hostile-check-summary.json` |
| Conformance (`checks/conformance.spec.ts`, Chromium + WebKit) | fixed, non-profiling | **14 / 14 in each engine** (28 / 28), 0 flaky | `raw/16-3-followup/conformance-check-summary.json` |
| O unit tests (`node --test test/*.test.ts`) | source | **34 / 34**: the previous 27, plus 6 for the worker highlighter (contract, cache, coalescing, lazy creation, no-worker and worker-error fallback) and 1 for the live-layer overlay | `raw/16-3-followup/unit-tests.txt` |
| Typecheck (`tsc --noEmit`) | source | clean | n/a |
| Worker under the apps/web CSP (16.5 policy + harness `connect-src`), `long-markdown` | fixed, non-profiling | WebKit (CSP as response header): worker loaded, finished, 308 highlighted spans, only violation the known zod `script-src eval` probe (16.5). Chromium (CSP as `<meta>`, because Playwright interception breaks the SSE stream there even without a CSP): worker loaded, 308 spans, no violations | `raw/16-3-followup/csp-worker-check.json` |
| DOM highlight check (WebKit, after settle) | H 16.3 / O 16.3 / O fixed | `<pre>` 22 / 22 / 22, highlighted spans **0** / 308 / 308 | `raw/16-3-followup/highlight-dom-check.jsonl` |

## 5. Reproduce (from `spikes/agentic-ui/own/`, harness on :4317)

```sh
# builds (O's own vite.config.ts through the 16.3 variant wrapper)
KM_BUILD_VARIANT=no-profiling pnpm exec vite build --configLoader native \
  --config ../measurements/scripts/vite-variant.config.mts --outDir gates/builds/own-fix-no-profiling --emptyOutDir
pnpm exec vite preview --outDir gates/builds/own-fix-no-profiling --port 4298 --strictPort --host 127.0.0.1 &
pnpm exec vite preview --outDir ../harness/reports/builds-16-3/own-no-profiling --port 4296 --strictPort --host 127.0.0.1 &   # before
(cd ../hybrid && pnpm exec vite preview --outDir ../harness/reports/builds-16-3/hybrid-no-profiling --port 4295 --strictPort --host 127.0.0.1 &)
# stall probe (before / after), fresh browser per run
node gates/scripts/webkit-stall-probe.ts --url http://127.0.0.1:4296/ --runs 5 --fresh-browser 1 --label baseline-fresh
node gates/scripts/webkit-stall-probe.ts --url http://127.0.0.1:4298/ --runs 5 --fresh-browser 1 --label fix-fresh
# Shiki micro-benchmark
pnpm exec vite build --configLoader native --config gates/bench/vite.config.ts   # -> /tmp/km-bench-dist, serve on :4297, open ?mode=regex|precompiled|worker
# paired measurement subset (the 16.3 driver; --scenarios selects the subset)
(cd ../harness && node src/measure/paired-measure.ts --hybrid-url http://127.0.0.1:4295/ --own-url http://127.0.0.1:4298/ \
  --label followup --out ../own/gates/raw/16-3-followup/paired --repeats 10 --seed 1637 \
  --scenarios long-markdown,cancel-mid-stream,hostile/huge-table)
node gates/scripts/summarize-16-3-followup.ts > gates/raw/16-3-followup/summary.md
# suites
(cd ../harness && SPIKE_URL=http://127.0.0.1:4298/ SPIKE_NAME=own-16-3-followup-hostile SPIKE_BROWSERS=chromium,webkit pnpm check --grep @hostile)
(cd ../harness && SPIKE_URL=http://127.0.0.1:4298/ SPIKE_NAME=own-16-3-followup-conformance SPIKE_BROWSERS=chromium,webkit pnpm check checks/conformance.spec.ts)
node gates/scripts/csp-worker-check.ts --url http://127.0.0.1:4298/
```

## 6. Limits and open items

- **Headless Playwright engines only**, as in 16.3. Not run in WKWebView/Tauri or WebView2. The Worker
  path relies on module workers. Both WKWebView (macOS 13+) and WebView2 support them, but neither was
  exercised here.
- **Feature-parity caveat for the O-vs-H comparison.** O highlights code and H does not, so O does
  strictly more rendering work on code-heavy answers. The fix moves that work off the main thread, so
  it no longer shows in frame and input metrics. It is still CPU spent in a worker: the CDP
  `TaskDuration` and `ScriptDuration` metrics count the page's main thread only. Why H's
  `@assistant-ui/react-streamdown` path does not highlight with the `code` plugin it is given was not
  investigated (H is not mine to change).
- **Dependencies.** `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs-precompiled` and
  `@shikijs/themes` 4.6.0 are dev-only (the benchmark). The product path uses only `@streamdown/code`.
  The entity-graph 4.4.0 packages were inside pnpm's `minimumReleaseAge` window: pnpm recorded them in
  `minimumReleaseAgeExclude` in `own/pnpm-workspace.yaml`, which pnpm created.
- Other agents shared the machine (load average 4.4–19.3 during the paired runs).
