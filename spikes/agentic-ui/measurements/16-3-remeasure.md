# Gate 16.3: like-for-like re-measure of H and O to render-complete

Change `c16-agentic-core-gates`, task 16.3. Recorded 2026-11-11 by the know-meet-team bdd-quality role.
This file reports measured facts, their statistical status and their limits. It makes no recommendation.
"Meaningful" below means only that the 95% bootstrap CI of the median paired difference excludes zero.

- **H** = `spikes/agentic-ui/hybrid/`, unchanged source.
- **O** = `spikes/agentic-ui/own/`, unchanged source, including the gate 16.1 publish scheduler
  (`src/application/publish-scheduler.ts`) and the gate 16.5 Streamdown/KaTeX changes.
- Raw data: [`raw/16-3/`](raw/16-3/). Tooling: `harness/src/measure/{render-timeline,render-run,paired-measure,paired-stats,paired-report,soak}.ts`,
  `measurements/scripts/{build-16-3.sh,vite-variant.config.mts,run-16-3.sh}`.

## Statistically meaningful differences (summary)

Sign convention: O − H. Negative means O is lower (less time, fewer frames, less memory). n = 10 pairs per cell.

| Metric | Chromium 158 | WebKit 27.2 |
|---|---|---|
| Time to first token | O lower in **15/15** scenarios: −6 ms (`huge-table`) to −41 ms (`cancel-mid-stream`); typically −25 ms | O lower in **15/15**: −22 to −66 ms (`long-markdown` −66 [−70, −60]) |
| Submit to render-complete | O lower in 12/15, by 4–18 ms (`huge-table` −18 [−39, −1], `custom-chunks` −16 [−22, −12]); 3 not meaningful | O lower in 10/15, by 10–29 ms; **O higher on `huge-table` +13 [1, 26]**; 4 not meaningful |
| Render lag after settle | `huge-table`: H 11 ms, O 0 (−11 [−13, −11]); `malformed-out-of-order`: O +7 [7, 7] | `huge-table`: H 61 ms, O 0 (−61 [−66, −59]); `custom-chunks` −15; `malformed` O +3 [1, 4]; small H lags on 2 long streams |
| Long-task total (submit to render-complete) | **O higher** on `long-markdown` +77 [75, 78] (H 0 ms) and `huge-table` +67 [31, 95] (H 212, O 264 ms); 13 not meaningful (both mostly 0) | not available (no Long Tasks API) |
| Main-thread task time (CDP) | O lower in **15/15**: e.g. `long-markdown` −1,595 [−1,655, −1,538] (H 2,393, O 807 ms), `huge-table` −469, `cancel-mid-stream` −3,655 | not available (no CDP) |
| Scripting time (CDP) | O lower in **15/15**: `long-markdown` −1,303 [−1,343, −1,254] (H 1,624, O 334 ms), `huge-table` −509, short scenarios −17 to −55 | not available |
| Dropped frames (rAF) | O fewer on `huge-table` −8 [−10, −7]; **O more** on `long-markdown` +3 [2, 3] and `cancel-mid-stream` +2 [1, 2] | O fewer on `huge-table` −9, `a2ui` −1; **O more on `long-markdown` +65 [64, 67] and `cancel-mid-stream` +59 [52, 64]** |
| Input latency, per-run median | O lower on `huge-table` −6, `long-markdown` −3, `state-snapshot-delta` −9 | O lower on `custom-chunks` −46, `huge-table` −12; **O higher** on `state-snapshot-delta` +18, `disconnect-reconnect-replay` +4, `cancel-mid-stream` +1 |
| Input latency, per-run worst | O lower on `huge-table` −27 [−43, −1], `state-snapshot-delta` −9 | **O higher on `long-markdown` +908 [885, 1,112] and `cancel-mid-stream` +939 [925, 966]**; O lower on `custom-chunks` −84; O higher `parallel-tool-calls` +5, `state-snapshot-delta` +18 |
| JS heap after GC at render-complete | O lower in **15/15**: −2.7 to −3.6 MB on short scenarios, −1.8 `long-markdown`, −0.9 `cancel-mid-stream`, −0.1 `huge-table` | not available |
| Long-session heap slope (30 min, Chromium) | H **+0.89 MB/min** [0.70, 1.08]; O +0.15 MB/min [−0.09, 0.38] (not distinguishable from 0) | not run |

Everything not listed is **not meaningful** at this sample size (CI includes 0). Full per-scenario tables follow.

### The one large adverse O result: a ~1 s main-thread stall in WebKit on long streams

In every one of the 10 WebKit runs of `long-markdown` and `cancel-mid-stream` (both stream the same 20 KB
answer), O shows one animation-frame gap of 0.6–1.17 s (`long-markdown`: 1,093–1,168 ms in all 10 runs), and
the keydown that lands in it waits ~0.9–1.2 s for its next paint. H's worst frame in the same runs is 28–61 ms
(one H `cancel-mid-stream` run had 699 ms). Chromium does not show it: O's worst long-markdown frame there is
~100 ms and its long-task total is 77 ms. The same stall was already visible in the dry run before the
measured runs (`own long-markdown`, worst input 1,146 ms). **Cause not established.** It is reproducible,
engine-specific and specific to O; WKWebView/Tauri was not measured in this gate.

## Method

**Builds (requirement 1).** `scripts/build-16-3.sh` builds each prototype twice with its own `vite.config.ts`, loaded
unchanged through `scripts/vite-variant.config.mts` (`vite build --configLoader native`), into
`harness/reports/builds-16-3/<proto>-<variant>/`. Prototype sources and their own `dist/` were not touched.
- `no-profiling`: drops only the `react-dom/client → react-dom/profiling` alias. All timing, CPU, frame, input and
  heap numbers come from this build. The script fails the build if Profiler timing code (`actualDuration`) remains.
- `profiling`: the c15 configuration. Used **only** for React commit counts, in a separate pass (3 interleaved
  repeats, Chromium + WebKit, `cancel-mid-stream` omitted). These runs are not mixed into any other table.
- The non-profiling builds expose no React commit count (the Profiler is inert). The probes' own counters still
  work: store commits and per-component render counters are in the raw files. The per-component counters
  instrument different components in each prototype, so they are not compared.

**Render-complete (requirement 2).** `render-timeline.ts` is an init script. From the submit click it records every DOM
mutation (child list, text, attributes, whole document), long tasks, every `requestAnimationFrame` timestamp,
and keydown latency. A run ends at **render-complete**: the run has settled (`__spike.snapshot().runStatus`
finished/interrupted/cancelled/error, polled every 20 ms as in c15) **and** no mutation or long task for 300 ms,
**and** ≥2 animation frames **and** one idle callback since the last activity (`requestIdleCallback`, else
`setTimeout`). Render-complete time = the last activity (mutation, long-task end or settle). Captured continuously
over [submit, render-complete]:
- long-task total (Chromium; PerformanceObserver `longtask`);
- main-thread `TaskDuration` and `ScriptDuration` deltas from CDP `Performance.getMetrics` (Chromium); the delta
  window also includes the ~300 ms quiet confirmation, identical for both;
- dropped frames = Σ max(0, round(Δ/16.67 ms) − 1) over rAF deltas (both engines; headless runs at 60 Hz, median
  frame 16.7 ms in both);
- input latency: from the first token (or settle) until settle, Playwright presses Shift every 250 ms (trusted CDP /
  WebKit input). Latency = keydown `timeStamp` to the MessageChannel task after the next rAF. Only presses that
  landed before settle count ("in-stream"); each run is summarised by its median and worst;
- JS heap (`JSHeapUsedSize`) after a forced GC at render-complete (Chromium), DOM nodes, mutation count.
Settle-time polling and input polling call `snapshot()` in both prototypes; that cost is inside the measured window.

**Pairing (requirement 3).** `paired-measure.ts`: per engine, per repetition, the 15 scenarios run in a seeded
random order (mulberry32, seed 163, +1000 for WebKit), and a seeded coin decides whether H or O goes first; the
other runs immediately after. The full order is in each raw file (`order`). Each run uses a fresh browser context
(1280×720) in one headless browser process per engine; previews: H :4285, O :4286 (`vite preview` of the
non-profiling builds), profiling builds on :4287/:4288. Corpus pacing, no overrides. 10 repetitions × 15 scenarios
× 2 prototypes × 2 engines = 600 runs, all completed. `os.loadavg()[0]` is stored with every run.

**Statistics.** Per cell: median, p90, p95 (linear interpolation, type 7) of each prototype's 10 runs. Paired
difference = O − H within the same repetition. CI = 95% percentile bootstrap of the median paired difference
(10,000 resamples, seeded per cell). Also reported: how many pairs went each way. With n = 10, p90/p95 are
interpolated between the two largest values, so they are a tail estimate, not a measured percentile.

**Soak (requirement 4).** `soak.ts`, Chromium, non-profiling builds, one page and one browser context per prototype
for 30 minutes. The composer is submitted repeatedly; Playwright reroutes each POST to the next scenario of a fixed
cycle (`long-markdown`, `parallel-tool-calls`, `custom-chunks`, `state-snapshot-delta`, `reasoning-subagents-snapshot`,
`hostile/huge-table`) with a fresh server session id, then waits 300 ms plus 5 s think time. At each minute mark it
forces GC and records heap, DOM nodes, transcript messages and load. Slope = OLS of heap (MB) on elapsed minutes,
with a t-based 95% CI. O ran first (05:37–06:07 UTC), then H (06:07–06:37 UTC).

## Environment

| | |
|---|---|
| Machine | Apple M1 Max, 64 GB, macOS 26.7.3, Darwin 25.6.0 arm64; a normal desktop with other apps running |
| Node / pnpm / Vite | 24.11.1 / 11.15.0 / 8.3.7 (each prototype's own) |
| Browsers | `@playwright/test` 1.65.0: Chromium 158.0.8127.18 headless shell; WebKit 27.2; both headless |
| Harness | mock AG-UI server on 127.0.0.1:4317, `@ag-ui/core` 1.0.4, corpus format 1 |
| Measured window (UTC) | non-profiling Chromium 04:20–04:56, WebKit 04:56–05:33; profiling 05:33–05:38; soak 05:37–06:37; re-run pairs ~08:20 |
| Load average (1 min) per run | Chromium 5.3–57.9 (median 9.0); WebKit 6.8–96.1 (median 27.0); soak O 5–90, H 7–55 |
| Bundles (`raw/16-3/bundle-sizes.json`) | initial load brotli: H 596,138 B non-profiling (600,261 profiling); O 405,277 B (409,252); whole dist brotli H 4,237,395 B, O 4,049,898 B |

## Incidents and re-runs

1. **First attempt discarded.** The first full run (started 2026-11-10 17:05 local) ran while the 1-minute load
   average climbed past 100 and later ~680, then the machine rebooted. A bug in the first version of `render-run.ts`
   (unhandled rejection in input injection when a page died) also stopped the process. That partial data (122 Chromium
   runs) is kept in `raw/16-3/discarded/` and used nowhere. The bug was fixed before the measured run.
2. **Harness restart at 22:34:25–22:34:31 local (04:34 UTC).** Another agent's `pkill` stopped the :4317 harness for
   about 6 s during the Chromium pass. Five repetition-4 pairs (`a2ui-over-agui`, `state-snapshot-delta`,
   `custom-chunks`, `parallel-tool-calls`, `run-error`, both prototypes) settled as `error` after ~950 ms (connection
   failure). They are invalid.
3. **One H renderer crash.** In Chromium repetition 4, H's `cancel-mid-stream` run ended with `Target crashed` at
   04:32:48 UTC, before the restart, with load ~16. It is a real observation of H under this harness. Its cause is
   unknown: it did not recur in the other 19 H `cancel-mid-stream` runs (both engines).
4. **Re-run.** The 6 affected Chromium pairs (items 2 and 3) were re-run once each with their original repetition
   number (`--repeat-start 4`, seed 1634, interleaved and randomised, load 6–9) into `raw/16-3/noprof-rerun-chromium.json`.
   `paired-report.ts` replaces both runs of each such pair; the original runs stay in `noprof-chromium.json` and are
   listed in `summary.json` (`chromium.replacedRuns`). The re-runs happened ~3.5 h after their partners' repetition,
   under lower load.

## Caveats

- **Multiplicity.** About 220 cell comparisons were made. At 95%, roughly 1 in 20 true-null cells would come out
  "meaningful" by chance, so isolated small differences (for example 1–5 ms input-latency or render-complete
  differences) should be read as weak. Most listed differences have all 10 pairs in the same direction (`0 / 10`
  or `10 / 0` in the tables).
- **Load was uncontrolled** (median 9 in Chromium, 27 in WebKit, peaks 58 and 96). Interleaving puts both members of
  a pair under nearly the same load, so the paired differences are protected more than the absolute values are.
- **Headless engines, not the product shell.** Chromium headless shell and Playwright WebKit, not WKWebView/Tauri or
  WebView2. Frame and input results come from headless compositors at 60 Hz. WebKit has no long-task, CDP CPU or
  heap data.
- **Input injection perturbs the run** (a key event every 250 ms plus a status read). It is the same for both
  prototypes. On short scenarios only one press landed in-stream, so "median" and "worst" coincide.
- **The render-complete rule** (300 ms quiet, 2 frames, 1 idle callback) could miss deferred work scheduled more
  than 300 ms after the last mutation. No run hit the 15 s ceiling (0 timeouts).
- **Scenario scope.** Interactive scenarios run to their first settle without interaction, as in c15.
  `cancel-mid-stream` therefore streams its whole answer (~86.7 s).
- **Soak transcript did not accumulate as intended.** At minute 30 H's snapshot held 14 messages and 6,420 DOM nodes,
  and O's 3 messages and 4,943 nodes, after 244 and 263 turns. Each rerouted turn evidently replaces most of the
  visible transcript in both prototypes. The soak therefore measures heap retention across many turns in one
  long-lived page, not a growing 30-minute meeting transcript. One soak per prototype, not interleaved; O's samples
  alternate between ~24 and ~35 MB depending on which cycle step preceded the sample, which widens O's CI.
- **The commit counts** (profiling pass) are 3 repeats, an implementation-efficiency signal only, and come from
  a different build than every other number here.

## Long-session soak (requirement 4)

| | Turns in 30 min | Heap after GC, min 0 → min 30 | Slope MB/min [95% CI] | Slope MB/turn [95% CI] | Meaningful growth |
|---|---|---|---|---|---|
| H | 244 (all finished) | 9.5 → 53.8 MB | **+0.89 [0.70, 1.08]** | +0.110 [0.087, 0.133] | yes |
| O | 263 (all finished) | 8.3 → 24.6 MB | +0.15 [−0.09, 0.38] | +0.017 [−0.010, 0.044] | no |

Per-minute heap samples are in `raw/16-3/soak-<proto>.json`. H's growth is steady (27 → 54 MB from minute 1 to 30,
with DOM size flat). What H retains per turn was not investigated.

## Per-scenario tables

Columns: each prototype's median / p90 / p95 over 10 runs; median paired difference O − H with its 95% CI; number of
pairs with O above / below H; pairs used; **M** = CI excludes 0. "n/m" = not measured. Chromium, then WebKit,
then the profiling-pass commit counts. The render-lag tables are omitted for length; every meaningful render-lag cell is in the summary above and all cells are in `raw/16-3/summary.json` (`chromiumMetrics.renderLag`, `webkitMetrics.renderLag`).

### Run: chromium 158.0.8127.18: 300 runs, 0 errors, 0 render-complete timeouts, load avg (1 min) 5.3–57.9 (median 9.0)

#### chromium: Submit to render-complete (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 191 / 193 / 194 | 186 / 187 / 187 | -5 [-6, -5] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 86,691 / 86,754 / 86,819 | 86,686 / 86,732 / 86,820 | -13 [-24, -3] | 2 / 8 | 10 | **M** |
| `custom-chunks` | 457 / 466 / 467 | 438 / 451 / 455 | -16 [-22, -12] | 1 / 9 | 10 | **M** |
| `disconnect-reconnect-replay` | 1,012 / 1,015 / 1,015 | 1,006 / 1,026 / 1,026 | -6 [-7, 3] | 2 / 8 | 10 |  |
| `hitl-approve` | 273 / 275 / 276 | 266 / 266 / 267 | -7 [-8, -7] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 273 / 277 / 281 | 266 / 266 / 267 | -8 [-8, -6] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 273 / 274 / 274 | 266 / 269 / 271 | -7 [-8, -5] | 1 / 9 | 10 | **M** |
| `hostile/huge-table` | 1,149 / 1,172 / 1,178 | 1,131 / 1,148 / 1,156 | -18 [-39, -1] | 2 / 8 | 10 | **M** |
| `long-markdown` | 5,825 / 5,837 / 5,837 | 5,826 / 5,835 / 5,852 | -9 [-13, 2] | 3 / 7 | 10 |  |
| `malformed-out-of-order` | 273 / 274 / 279 | 273 / 273 / 273 | 0 [-1, 1] | 6 / 3 | 10 |  |
| `parallel-tool-calls` | 692 / 708 / 710 | 686 / 687 / 687 | -6 [-13, -5] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 492 / 493 / 493 | 486 / 488 / 489 | -5 [-6, -5] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 111 / 112 / 112 | 106 / 107 / 108 | -5 [-6, -4] | 0 / 10 | 10 | **M** |
| `run-error` | 112 / 113 / 114 | 106 / 107 / 107 | -5 [-7, -5] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 251 / 252 / 252 | 246 / 247 / 247 | -4 [-5, -4] | 0 / 10 | 10 | **M** |

#### chromium: Time to first token (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 60 / 63 / 64 | 35 / 36 / 36 | -25 [-27, -25] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 64 / 69 / 69 | 23 / 28 / 28 | -41 [-44, -37] | 0 / 10 | 10 | **M** |
| `custom-chunks` | 60 / 63 / 63 | 35 / 36 / 36 | -25 [-27, -24] | 0 / 10 | 10 | **M** |
| `disconnect-reconnect-replay` | 59 / 59 / 59 | 26 / 28 / 28 | -33 [-34, -31] | 0 / 10 | 10 | **M** |
| `hitl-approve` | 60 / 62 / 63 | 35 / 35 / 36 | -25 [-26, -25] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 61 / 61 / 62 | 35 / 37 / 37 | -26 [-26, -24] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 60 / 61 / 61 | 35 / 36 / 38 | -25 [-26, -23] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 45 / 47 / 48 | 39 / 44 / 45 | -6 [-8, -4] | 0 / 10 | 10 | **M** |
| `long-markdown` | 67 / 70 / 71 | 36 / 39 / 40 | -31 [-34, -28] | 0 / 10 | 10 | **M** |
| `malformed-out-of-order` | 145 / 147 / 149 | 120 / 121 / 122 | -25 [-26, -25] | 0 / 10 | 10 | **M** |
| `parallel-tool-calls` | 74 / 83 / 86 | 50 / 53 / 54 | -25 [-27, -24] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 346 / 348 / 349 | 321 / 323 / 324 | -25 [-26, -24] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 60 / 63 / 63 | 36 / 36 / 37 | -25 [-26, -24] | 0 / 10 | 10 | **M** |
| `run-error` | 60 / 62 / 63 | 35 / 36 / 38 | -25 [-26, -24] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 165 / 167 / 168 | 141 / 142 / 142 | -24 [-25, -23] | 0 / 10 | 10 | **M** |

#### chromium: Long-task total, submit to render-complete (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `cancel-mid-stream` | 0 / 0 / 0 | 0 / 5 / 27 | 0 [0, 0] | 1 / 0 | 10 |  |
| `custom-chunks` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `disconnect-reconnect-replay` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-approve` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-expire` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-reject` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hostile/huge-table` | 212 / 225 / 227 | 264 / 276 / 293 | 67 [31, 95] | 9 / 1 | 10 | **M** |
| `long-markdown` | 0 / 0 / 0 | 77 / 79 / 82 | 77 [75, 78] | 10 / 0 | 10 | **M** |
| `malformed-out-of-order` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `parallel-tool-calls` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `reasoning-subagents-snapshot` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `run-cancelled-by-agent` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `run-error` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `state-snapshot-delta` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |

#### chromium: Main-thread task time (CDP TaskDuration) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 95 / 98 / 99 | 61 / 68 / 68 | -30 [-37, -29] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 11,645 / 12,157 / 12,179 | 7,359 / 8,328 / 8,409 | -3,655 [-4,475, -3,518] | 0 / 10 | 10 | **M** |
| `custom-chunks` | 227 / 232 / 234 | 176 / 186 / 193 | -51 [-60, -42] | 0 / 10 | 10 | **M** |
| `disconnect-reconnect-replay` | 163 / 176 / 187 | 115 / 125 / 126 | -52 [-66, -36] | 0 / 10 | 10 | **M** |
| `hitl-approve` | 108 / 116 / 120 | 60 / 61 / 64 | -49 [-53, -45] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 110 / 115 / 117 | 63 / 66 / 70 | -49 [-49, -47] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 107 / 112 / 113 | 60 / 65 / 66 | -48 [-50, -45] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 1,191 / 1,211 / 1,219 | 723 / 742 / 747 | -469 [-503, -456] | 0 / 10 | 10 | **M** |
| `long-markdown` | 2,393 / 2,506 / 2,537 | 807 / 829 / 844 | -1,595 [-1,655, -1,538] | 0 / 10 | 10 | **M** |
| `malformed-out-of-order` | 84 / 87 / 89 | 56 / 59 / 63 | -27 [-29, -24] | 0 / 10 | 10 | **M** |
| `parallel-tool-calls` | 192 / 204 / 205 | 108 / 116 / 120 | -86 [-94, -81] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 127 / 140 / 143 | 80 / 86 / 87 | -47 [-55, -43] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 66 / 74 / 75 | 43 / 48 / 48 | -24 [-26, -23] | 0 / 10 | 10 | **M** |
| `run-error` | 67 / 71 / 75 | 43 / 49 / 51 | -24 [-26, -23] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 88 / 95 / 95 | 53 / 61 / 66 | -35 [-37, -32] | 0 / 10 | 10 | **M** |

#### chromium: Scripting time (CDP ScriptDuration) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 48 / 50 / 50 | 31 / 34 / 34 | -17 [-18, -16] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 5,745 / 6,200 / 6,224 | 3,746 / 4,560 / 4,634 | -1,760 [-2,118, -1,636] | 0 / 10 | 10 | **M** |
| `custom-chunks` | 86 / 90 / 91 | 52 / 55 / 56 | -35 [-37, -30] | 0 / 10 | 10 | **M** |
| `disconnect-reconnect-replay` | 88 / 99 / 103 | 54 / 57 / 57 | -37 [-49, -31] | 0 / 10 | 10 | **M** |
| `hitl-approve` | 55 / 58 / 59 | 24 / 25 / 26 | -31 [-33, -29] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 56 / 60 / 61 | 25 / 26 / 26 | -31 [-32, -30] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 55 / 57 / 57 | 25 / 25 / 25 | -31 [-32, -30] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 1,086 / 1,098 / 1,109 | 576 / 590 / 596 | -509 [-542, -494] | 0 / 10 | 10 | **M** |
| `long-markdown` | 1,624 / 1,702 / 1,719 | 334 / 360 / 363 | -1,303 [-1,343, -1,254] | 0 / 10 | 10 | **M** |
| `malformed-out-of-order` | 44 / 45 / 45 | 25 / 26 / 27 | -19 [-20, -17] | 0 / 10 | 10 | **M** |
| `parallel-tool-calls` | 99 / 105 / 106 | 44 / 46 / 47 | -55 [-59, -54] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 69 / 75 / 75 | 37 / 38 / 39 | -32 [-36, -30] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 37 / 39 / 40 | 20 / 21 / 21 | -17 [-20, -16] | 0 / 10 | 10 | **M** |
| `run-error` | 36 / 38 / 38 | 19 / 20 / 20 | -17 [-18, -16] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 45 / 49 / 49 | 21 / 25 / 25 | -23 [-25, -23] | 0 / 10 | 10 | **M** |

#### chromium: Dropped frames (rAF deltas, 60 Hz) (frames)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `cancel-mid-stream` | 0 / 0 / 0 | 2 / 2 / 2 | 2 [1, 2] | 10 / 0 | 10 | **M** |
| `custom-chunks` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `disconnect-reconnect-replay` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-approve` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-expire` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hitl-reject` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `hostile/huge-table` | 23 / 24 / 25 | 16 / 16 / 17 | -8 [-10, -7] | 0 / 10 | 10 | **M** |
| `long-markdown` | 0 / 0 / 0 | 3 / 3 / 3 | 3 [2, 3] | 10 / 0 | 10 | **M** |
| `malformed-out-of-order` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `parallel-tool-calls` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `reasoning-subagents-snapshot` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `run-cancelled-by-agent` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `run-error` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |
| `state-snapshot-delta` | 0 / 0 / 0 | 0 / 0 / 0 | 0 [0, 0] | 0 / 0 | 10 |  |

#### chromium: Input latency, per-run median (keydown to next paint, in-stream) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 8 / 18 / 18 | 12 / 16 / 16 | 1 [-7, 10] | 5 / 5 | 10 |  |
| `cancel-mid-stream` | 10 / 10 / 10 | 9 / 10 / 10 | -0 [-1, 0] | 2 / 8 | 10 |  |
| `custom-chunks` | 12 / 17 / 17 | 14 / 17 / 17 | 1 [-4, 3] | 7 / 3 | 10 |  |
| `disconnect-reconnect-replay` | 9 / 14 / 14 | 9 / 12 / 13 | -1 [-4, 3] | 4 / 6 | 10 |  |
| `hitl-approve` | 4 / 18 / 18 | 13 / 15 / 15 | 4 [-4, 11] | 6 / 4 | 10 |  |
| `hitl-expire` | 13 / 18 / 19 | 14 / 15 / 16 | -1 [-6, 11] | 5 / 5 | 10 |  |
| `hitl-reject` | 11 / 18 / 18 | 13 / 16 / 16 | 1 [-5, 11] | 5 / 5 | 10 |  |
| `hostile/huge-table` | 34 / 43 / 44 | 25 / 38 / 39 | -6 [-21, -2] | 1 / 9 | 10 | **M** |
| `long-markdown` | 12 / 13 / 13 | 10 / 10 / 10 | -3 [-3, -2] | 1 / 9 | 10 | **M** |
| `malformed-out-of-order` | 17 / 19 / 19 | 11 / 18 / 18 | -4 [-9, 1] | 4 / 6 | 10 |  |
| `parallel-tool-calls` | 8 / 16 / 16 | 6 / 15 / 15 | -1 [-6, 3] | 3 / 6 | 10 |  |
| `reasoning-subagents-snapshot` | 17 / 18 / 18 | 8 / 17 / 17 | -6 [-12, 2] | 3 / 7 | 10 |  |
| `run-cancelled-by-agent` | 16 / 19 / 19 | 14 / 16 / 16 | -2 [-7, 5] | 4 / 6 | 10 |  |
| `run-error` | 3 / 18 / 18 | 13 / 15 / 15 | 10 [-4, 11] | 6 / 4 | 10 |  |
| `state-snapshot-delta` | 14 / 18 / 18 | 6 / 7 / 11 | -9 [-12, -8] | 1 / 9 | 10 | **M** |

#### chromium: Input latency, per-run worst (in-stream) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 8 / 18 / 18 | 12 / 16 / 16 | 1 [-7, 10] | 5 / 5 | 10 |  |
| `cancel-mid-stream` | 21 / 23 / 25 | 20 / 21 / 23 | -2 [-3, 0] | 2 / 8 | 10 |  |
| `custom-chunks` | 17 / 19 / 19 | 17 / 19 / 19 | -1 [-5, 1] | 4 / 6 | 10 |  |
| `disconnect-reconnect-replay` | 16 / 17 / 17 | 15 / 17 / 17 | -1 [-3, 3] | 3 / 7 | 10 |  |
| `hitl-approve` | 4 / 18 / 18 | 13 / 15 / 15 | 4 [-4, 11] | 6 / 4 | 10 |  |
| `hitl-expire` | 13 / 18 / 19 | 14 / 15 / 16 | -1 [-6, 11] | 5 / 5 | 10 |  |
| `hitl-reject` | 11 / 18 / 18 | 13 / 16 / 16 | 1 [-5, 11] | 5 / 5 | 10 |  |
| `hostile/huge-table` | 73 / 100 / 101 | 54 / 56 / 57 | -27 [-43, -1] | 1 / 9 | 10 | **M** |
| `long-markdown` | 18 / 19 / 19 | 20 / 64 / 71 | 1 [-2, 45] | 5 / 5 | 10 |  |
| `malformed-out-of-order` | 17 / 19 / 19 | 11 / 18 / 18 | -4 [-9, 1] | 4 / 6 | 10 |  |
| `parallel-tool-calls` | 18 / 18 / 19 | 14 / 18 / 18 | -2 [-8, 2] | 4 / 6 | 10 |  |
| `reasoning-subagents-snapshot` | 17 / 18 / 18 | 8 / 17 / 17 | -6 [-12, 2] | 3 / 7 | 10 |  |
| `run-cancelled-by-agent` | 16 / 19 / 19 | 14 / 16 / 16 | -2 [-7, 5] | 4 / 6 | 10 |  |
| `run-error` | 3 / 18 / 18 | 13 / 15 / 15 | 10 [-4, 11] | 6 / 4 | 10 |  |
| `state-snapshot-delta` | 14 / 18 / 18 | 6 / 7 / 11 | -9 [-12, -8] | 1 / 9 | 10 | **M** |

#### chromium: JS heap after forced GC at render-complete (MB)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 14.5 / 14.5 / 14.5 | 11.1 / 11.1 / 11.1 | -3.4 [-3.4, -3.3] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 21.5 / 21.5 / 21.5 | 20.6 / 20.6 / 20.6 | -0.9 [-0.9, -0.8] | 0 / 10 | 10 | **M** |
| `custom-chunks` | 17.0 / 17.0 / 17.0 | 13.7 / 13.7 / 13.7 | -3.3 [-3.3, -3.3] | 0 / 10 | 10 | **M** |
| `disconnect-reconnect-replay` | 14.2 / 14.2 / 14.2 | 11.0 / 11.0 / 11.0 | -3.2 [-3.2, -3.2] | 0 / 10 | 10 | **M** |
| `hitl-approve` | 14.2 / 14.2 / 14.2 | 10.6 / 10.6 / 10.6 | -3.6 [-3.6, -3.6] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 14.2 / 14.2 / 14.2 | 10.6 / 10.6 / 10.7 | -3.6 [-3.6, -3.6] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 14.2 / 14.2 / 14.2 | 10.6 / 10.6 / 10.6 | -3.6 [-3.6, -3.6] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 20.0 / 20.0 / 20.0 | 19.9 / 20.0 / 20.0 | -0.1 [-0.2, -0.0] | 0 / 10 | 10 | **M** |
| `long-markdown` | 20.9 / 21.0 / 21.0 | 19.1 / 19.2 / 19.2 | -1.8 [-1.9, -1.8] | 0 / 10 | 10 | **M** |
| `malformed-out-of-order` | 13.9 / 13.9 / 13.9 | 10.6 / 10.6 / 10.6 | -3.3 [-3.3, -3.3] | 0 / 10 | 10 | **M** |
| `parallel-tool-calls` | 14.8 / 14.8 / 14.8 | 11.2 / 11.2 / 11.2 | -3.6 [-3.6, -3.6] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 14.4 / 14.4 / 14.4 | 11.1 / 11.1 / 11.1 | -3.3 [-3.3, -3.3] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 13.4 / 13.4 / 13.4 | 10.4 / 10.4 / 10.4 | -3.0 [-3.0, -3.0] | 0 / 10 | 10 | **M** |
| `run-error` | 13.1 / 13.1 / 13.1 | 10.4 / 10.4 / 10.4 | -2.7 [-2.8, -2.7] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 13.8 / 13.8 / 13.8 | 10.6 / 10.6 / 10.6 | -3.2 [-3.2, -3.2] | 0 / 10 | 10 | **M** |

### Run: webkit 27.2: 300 runs, 0 errors, 0 render-complete timeouts, load avg (1 min) 6.8–96.1 (median 27.0)

#### webkit: Submit to render-complete (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 198 / 200 / 200 | 188 / 199 / 199 | -10 [-12, -1] | 2 / 8 | 10 | **M** |
| `cancel-mid-stream` | 86,834 / 86,873 / 86,881 | 86,848 / 86,942 / 86,953 | -6 [-15, 49] | 4 / 6 | 10 |  |
| `custom-chunks` | 533 / 594 / 641 | 502 / 538 / 558 | -29 [-59, -12] | 2 / 8 | 10 | **M** |
| `disconnect-reconnect-replay` | 1,034 / 1,038 / 1,039 | 1,026 / 1,046 / 1,047 | -8 [-10, 1] | 2 / 8 | 10 |  |
| `hitl-approve` | 292 / 296 / 298 | 275 / 278 / 278 | -16 [-21, -15] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 292 / 295 / 296 | 275 / 277 / 279 | -17 [-19, -15] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 292 / 295 / 297 | 276 / 277 / 278 | -15 [-19, -10] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 1,144 / 1,156 / 1,161 | 1,162 / 1,166 / 1,170 | 13 [1, 26] | 8 / 2 | 10 | **M** |
| `long-markdown` | 5,866 / 5,885 / 5,915 | 5,866 / 5,873 / 5,874 | -4 [-41, 6] | 5 / 5 | 10 |  |
| `malformed-out-of-order` | 292 / 295 / 296 | 276 / 282 / 290 | -12 [-16, -9] | 1 / 9 | 10 | **M** |
| `parallel-tool-calls` | 696 / 699 / 700 | 686 / 690 / 692 | -10 [-14, -6] | 1 / 9 | 10 | **M** |
| `reasoning-subagents-snapshot` | 503 / 507 / 508 | 494 / 495 / 496 | -11 [-14, -8] | 1 / 9 | 10 | **M** |
| `run-cancelled-by-agent` | 128 / 133 / 134 | 113 / 118 / 118 | -16 [-21, -13] | 0 / 10 | 10 | **M** |
| `run-error` | 111 / 113 / 114 | 113 / 114 / 114 | 2 [-2, 4] | 6 / 4 | 10 |  |
| `state-snapshot-delta` | 266 / 268 / 270 | 247 / 250 / 251 | -19 [-22, -15] | 0 / 10 | 10 | **M** |

#### webkit: Time to first token (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 67 / 68 / 69 | 39 / 40 / 40 | -28 [-29, -27] | 0 / 10 | 10 | **M** |
| `cancel-mid-stream` | 70 / 71 / 72 | 11 / 11 / 12 | -59 [-60, -59] | 0 / 10 | 10 | **M** |
| `custom-chunks` | 67 / 70 / 72 | 39 / 42 / 42 | -28 [-30, -26] | 0 / 10 | 10 | **M** |
| `disconnect-reconnect-replay` | 66 / 67 / 68 | 29 / 30 / 30 | -37 [-38, -36] | 0 / 10 | 10 | **M** |
| `hitl-approve` | 67 / 71 / 72 | 39 / 41 / 43 | -29 [-30, -28] | 0 / 10 | 10 | **M** |
| `hitl-expire` | 68 / 69 / 71 | 38 / 39 / 40 | -30 [-31, -28] | 0 / 10 | 10 | **M** |
| `hitl-reject` | 68 / 69 / 70 | 38 / 39 / 40 | -29 [-31, -26] | 0 / 10 | 10 | **M** |
| `hostile/huge-table` | 44 / 48 / 49 | 22 / 23 / 24 | -22 [-25, -21] | 0 / 10 | 10 | **M** |
| `long-markdown` | 87 / 92 / 98 | 20 / 22 / 22 | -66 [-70, -60] | 0 / 10 | 10 | **M** |
| `malformed-out-of-order` | 152 / 154 / 156 | 124 / 125 / 127 | -29 [-30, -26] | 0 / 10 | 10 | **M** |
| `parallel-tool-calls` | 82 / 84 / 86 | 53 / 56 / 57 | -28 [-30, -27] | 0 / 10 | 10 | **M** |
| `reasoning-subagents-snapshot` | 351 / 358 / 358 | 325 / 326 / 328 | -26 [-32, -26] | 0 / 10 | 10 | **M** |
| `run-cancelled-by-agent` | 68 / 72 / 73 | 39 / 41 / 42 | -29 [-32, -26] | 0 / 10 | 10 | **M** |
| `run-error` | 68 / 69 / 69 | 39 / 39 / 40 | -29 [-30, -26] | 0 / 10 | 10 | **M** |
| `state-snapshot-delta` | 172 / 174 / 176 | 144 / 145 / 147 | -27 [-28, -26] | 0 / 10 | 10 | **M** |

#### webkit: Dropped frames (rAF deltas, 60 Hz) (frames)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 1 / 1 / 2 | 0 / 0 / 1 | -1 [-1, -1] | 0 / 8 | 10 | **M** |
| `cancel-mid-stream` | 27 / 43 / 52 | 84 / 93 / 97 | 59 [52, 64] | 10 / 0 | 10 | **M** |
| `custom-chunks` | 7 / 11 / 13 | 5 / 8 / 10 | -2 [-4, 1] | 2 / 8 | 10 |  |
| `disconnect-reconnect-replay` | 0 / 0 / 1 | 0 / 0 / 1 | 0 [0, 0] | 1 / 1 | 10 |  |
| `hitl-approve` | 0 / 1 / 1 | 0 / 0 / 0 | 0 [-1, 0] | 0 / 3 | 10 |  |
| `hitl-expire` | 1 / 2 / 2 | 0 / 0 / 0 | -1 [-2, 0] | 0 / 7 | 10 |  |
| `hitl-reject` | 1 / 1 / 2 | 0 / 0 / 0 | -1 [-1, 0] | 0 / 5 | 10 |  |
| `hostile/huge-table` | 25 / 27 / 27 | 15 / 18 / 19 | -9 [-10, -8] | 0 / 10 | 10 | **M** |
| `long-markdown` | 3 / 6 / 8 | 69 / 71 / 72 | 65 [64, 67] | 10 / 0 | 10 | **M** |
| `malformed-out-of-order` | 1 / 1 / 1 | 0 / 0 / 0 | -1 [-1, 0] | 0 / 5 | 10 |  |
| `parallel-tool-calls` | 0 / 1 / 1 | 0 / 0 / 1 | 0 [-1, 0] | 1 / 3 | 10 |  |
| `reasoning-subagents-snapshot` | 0 / 1 / 1 | 0 / 0 / 1 | 0 [-1, 0] | 0 / 2 | 10 |  |
| `run-cancelled-by-agent` | 1 / 1 / 1 | 0 / 0 / 0 | -1 [-1, 0] | 0 / 5 | 10 |  |
| `run-error` | 1 / 1 / 1 | 0 / 0 / 0 | -1 [-1, 0] | 0 / 5 | 10 |  |
| `state-snapshot-delta` | 0 / 1 / 1 | 0 / 0 / 0 | 0 [-1, 0] | 0 / 2 | 10 |  |

#### webkit: Input latency, per-run median (keydown to next paint, in-stream) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 8 / 12 / 13 | 19 / 26 / 26 | 9 [-4, 18] | 6 / 4 | 10 |  |
| `cancel-mid-stream` | 9 / 10 / 10 | 10 / 11 / 11 | 1 [1, 2] | 9 / 0 | 10 | **M** |
| `custom-chunks` | 52 / 74 / 89 | 14 / 52 / 57 | -46 [-58, -20] | 1 / 9 | 10 | **M** |
| `disconnect-reconnect-replay` | 10 / 12 / 12 | 13 / 16 / 17 | 4 [2, 5] | 9 / 1 | 10 | **M** |
| `hitl-approve` | 10 / 15 / 17 | 8 / 21 / 23 | 0 [-4, 5] | 5 / 5 | 10 |  |
| `hitl-expire` | 8 / 13 / 13 | 7 / 21 / 23 | -2 [-4, 6] | 4 / 6 | 10 |  |
| `hitl-reject` | 9 / 13 / 15 | 7 / 24 / 25 | -1 [-2, 11] | 3 / 5 | 10 |  |
| `hostile/huge-table` | 47 / 53 / 55 | 35 / 40 / 41 | -12 [-22, -7] | 1 / 9 | 10 | **M** |
| `long-markdown` | 12 / 13 / 13 | 12 / 14 / 14 | -1 [-3, 2] | 5 / 5 | 10 |  |
| `malformed-out-of-order` | 9 / 10 / 10 | 20 / 22 / 23 | 11 [-6, 13] | 6 / 4 | 10 |  |
| `parallel-tool-calls` | 9 / 13 / 14 | 13 / 15 / 16 | 1 [-1, 5] | 7 / 3 | 10 |  |
| `reasoning-subagents-snapshot` | 8 / 16 / 18 | 17 / 19 / 20 | 9 [0, 13] | 7 / 2 | 10 |  |
| `run-cancelled-by-agent` | 11 / 13 / 13 | 9 / 23 / 25 | -1 [-6, 13] | 4 / 5 | 10 |  |
| `run-error` | 9 / 14 / 15 | 13 / 25 / 26 | 2 [-3, 14] | 5 / 5 | 10 |  |
| `state-snapshot-delta` | 6 / 7 / 7 | 23 / 24 / 25 | 18 [16, 19] | 9 / 1 | 10 | **M** |

#### webkit: Input latency, per-run worst (in-stream) (ms)

| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |
|---|---|---|---|---|---|---|
| `a2ui-over-agui` | 8 / 12 / 13 | 19 / 26 / 26 | 9 [-4, 18] | 6 / 4 | 10 |  |
| `cancel-mid-stream` | 25 / 27 / 27 | 965 / 999 / 1,017 | 939 [925, 966] | 10 / 0 | 10 | **M** |
| `custom-chunks` | 92 / 140 / 166 | 19 / 79 / 100 | -84 [-109, -48] | 1 / 9 | 10 | **M** |
| `disconnect-reconnect-replay` | 15 / 18 / 19 | 19 / 25 / 26 | 7 [-1, 8] | 7 / 3 | 10 |  |
| `hitl-approve` | 10 / 15 / 17 | 8 / 21 / 23 | 0 [-4, 5] | 5 / 5 | 10 |  |
| `hitl-expire` | 8 / 13 / 13 | 7 / 21 / 23 | -2 [-4, 6] | 4 / 6 | 10 |  |
| `hitl-reject` | 9 / 13 / 15 | 7 / 24 / 25 | -1 [-2, 11] | 3 / 5 | 10 |  |
| `hostile/huge-table` | 66 / 87 / 89 | 83 / 122 / 124 | 13 [-14, 52] | 6 / 4 | 10 |  |
| `long-markdown` | 23 / 30 / 34 | 933 / 1,158 / 1,159 | 908 [885, 1,112] | 10 / 0 | 10 | **M** |
| `malformed-out-of-order` | 9 / 10 / 10 | 20 / 22 / 23 | 11 [-6, 12] | 6 / 4 | 10 |  |
| `parallel-tool-calls` | 14 / 16 / 17 | 18 / 28 / 28 | 5 [1, 14] | 9 / 1 | 10 | **M** |
| `reasoning-subagents-snapshot` | 8 / 16 / 18 | 17 / 19 / 20 | 9 [0, 13] | 7 / 2 | 10 |  |
| `run-cancelled-by-agent` | 11 / 13 / 13 | 9 / 23 / 25 | -1 [-5, 13] | 4 / 5 | 10 |  |
| `run-error` | 9 / 14 / 15 | 13 / 25 / 26 | 2 [-3, 14] | 5 / 5 | 10 |  |
| `state-snapshot-delta` | 6 / 7 / 7 | 23 / 24 / 25 | 18 [16, 19] | 9 / 1 | 10 | **M** |

#### Profiling pass, chromium 158.0.8127.18: React commits (Profiler onRender), median of 3

| Scenario | H | O | H / O |
|---|---|---|---|
| `a2ui-over-agui` | 26 | 12 | 2.2× |
| `custom-chunks` | 59 | 24 | 2.5× |
| `disconnect-reconnect-replay` | 94 | 46 | 2.0× |
| `hitl-approve` | 35 | 11 | 3.2× |
| `hitl-expire` | 35 | 11 | 3.2× |
| `hitl-reject` | 35 | 11 | 3.2× |
| `hostile/huge-table` | 412 | 20 | 20.6× |
| `long-markdown` | 4,488 | 161 | 27.9× |
| `malformed-out-of-order` | 23 | 18 | 1.3× |
| `parallel-tool-calls` | 103 | 34 | 3.0× |
| `reasoning-subagents-snapshot` | 59 | 28 | 2.1× |
| `run-cancelled-by-agent` | 15 | 6 | 2.5× |
| `run-error` | 13 | 5 | 2.6× |
| `state-snapshot-delta` | 19 | 8 | 2.4× |

#### Profiling pass, webkit 27.2: React commits (Profiler onRender), median of 3

| Scenario | H | O | H / O |
|---|---|---|---|
| `a2ui-over-agui` | 27 | 12 | 2.3× |
| `custom-chunks` | 59 | 23 | 2.6× |
| `disconnect-reconnect-replay` | 94 | 38 | 2.5× |
| `hitl-approve` | 35 | 11 | 3.2× |
| `hitl-expire` | 36 | 11 | 3.3× |
| `hitl-reject` | 36 | 11 | 3.3× |
| `hostile/huge-table` | 412 | 23 | 17.9× |
| `long-markdown` | 4,506 | 132 | 34.1× |
| `malformed-out-of-order` | 24 | 18 | 1.3× |
| `parallel-tool-calls` | 106 | 32 | 3.3× |
| `reasoning-subagents-snapshot` | 60 | 27 | 2.2× |
| `run-cancelled-by-agent` | 16 | 6 | 2.7× |
| `run-error` | 14 | 5 | 2.8× |
| `state-snapshot-delta` | 20 | 7 | 2.9× |
