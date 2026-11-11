# Gate 16.1: bounded publish scheduler for prototype O

Change: `c16-agentic-core-gates`, task 16.1. Date: 2026-11-10. Author: architect (prototype O owner).

## Verdict

**16.1, excluding WebView2: FAIL.** Three of the four window states pass. Minimised does not pass
with Tauri's default background throttling.

> **Update 2026-11-11 (section 11).** The operator chose `"backgroundThrottling": "disabled"`. O's
> gate shell now declares it, and the rebuilt binary applies it (verified). The minimised re-run
> under that setting is **not yet measured**: the macOS session was locked during the attempt, so
> no window state could be produced and those runs are quarantined. **macOS minimised: pending
> (blocked on an unlocked session), not pass and not fail.** WebView2: still pending.

| State (Tauri default `background_throttling`) | Steps used / run | Conformant | Worst p95 TTFT vs focused | Worst p95 total vs focused | Pass |
|---|---|---|---|---|---|
| Focused (baseline, 2 runs pooled) | 157 / 168 | 168 / 168 | 1× | 1× | baseline |
| Visible but unfocused | 82 / 84 | 84 / 84 | 1.34× (`run-error`) | 1.02× | **yes** |
| Occluded (titled window, target + 60 px) | 83 / 84 | 84 / 84 | 1.11× | 1.22× | **yes** |
| Minimised | 83 / 84 | 80 / 84 | 9.09× (`hitl-approve`) | 3.34× | **no** |
| Windows WebView2 | — | — | — | — | **pending**, see `../webview2-runbook.md` |

What the results show:

- **The scheduler does its job.** Publishing no longer depends on `requestAnimationFrame`. Every
  flush in a minimised (hidden) page ran as a MessageChannel task: 616 hidden-task flushes and
  0 frame flushes. Excluding `long-markdown`, which is main-thread-bound, the largest publish lag was
  349 ms in minimised and 51 ms otherwise.
- **Minimised still misses the bound because of WebKit, not O.** When the window is minimised,
  WebKit's default inactive-scheduling policy (`.suspend`) slows the whole WebContent process. With
  the same build and throttling disabled, minimised TTFT stays within 1.39× of focused, and O's own
  run durations stay within about 1.1× (section 5).
- **The gate's condition decides the outcome.** The gate requires Tauri's default throttling, and
  under it minimised fails. Making it pass is a desktop-shell configuration decision, not a scheduler
  change (section 7).
- **The 4 non-conformant minimised steps are a delivery race.** In each, the replay reconnect resumed
  from the last event O had actually received (id 22 or 24) rather than the server's drop position
  (25). The transcript was still correct. The rAF-only control build shows the same failure (5/84),
  so it comes from the environment, not from the scheduler (section 6).

## 1. The change

**Before.** O published streamed text only from `requestAnimationFrame`:
`browserScheduler.onFrame`, with `AgentSession.scheduleFrame` re-arming a frame until the adaptive
interval elapsed. A WKWebView window whose frames are throttled or stopped therefore held streamed
text back. That explains the 907 ms `hitl-approve` in the discarded c15 run.

**After.** `src/application/publish-scheduler.ts` is framework-free and has one port, `PublishClock`.
Calls coalesce into exactly one pending flush, which runs as follows:

| Situation | Flush runs on | Trigger in stats |
|---|---|---|
| Page visible | the next frame **or** a `deadlineMs` timer (default 50 ms), whichever fires first; the other is cancelled | `frame` / `deadline` |
| Page hidden (`visibilityState === "hidden"`), so no frames | the next MessageChannel task, which is not subject to hidden-page timer clamping | `hidden-task` |
| A request arrives after the pending flush's due time (timers throttled too) | the next task | `overdue-task` |
| The page becomes hidden while waiting for a frame | the next task | `visibility-task` |
| `request(delayMs)` (adaptive interval for long texts) | the timer, then frame-or-deadline as above | as above |

Other files changed:

- `src/application/agent-session.ts`:
  - streamed deltas call `publisher.request()`, and `publishTick()` applies the adaptive interval
    (16–250 ms by text length, unchanged) through `request(wait)` instead of re-arming frames;
  - **boundary commits are unchanged**: a boundary event still commits once per microtask, and a
    delta never commits except at the 1 s checkpoint;
  - it records `runTiming` (start and settle marks), and exposes `publishStats()` and
    `resetDiagnostics()`.
- `src/application/ports.ts`: `Scheduler.onFrame` is removed.
- `src/infrastructure/browser-clock.ts` (new): the browser `Scheduler` and `PublishClock` adapters
  (rAF, setTimeout, a MessageChannel FIFO and `visibilitychange`). `launch-params.ts` no longer holds
  the scheduler.
- `src/presentation/probe.ts`: `renderCounts()` also returns `publish` (triggers and max lag) and
  `runTiming`. These are O-only fields beside the contract fields, and the collector stores them.
- `src/application/announcer.ts`, `agent-session.ts`: constructor parameter properties became
  explicit fields, so Node's type stripping can load them in tests.

## 2. Unit tests

`node --test test/*.test.ts`: 27/27 pass (`raw/unit-tests.txt`).

- **`test/publish-scheduler.test.ts`, 11 tests.** Node mock timers drive `setTimeout` and `Date`, and
  frames and tasks are manual queues, so a test can pause rAF:
  - focused: flushes on the frame and cancels the deadline;
  - **rAF paused: flushes at exactly 50 ms**;
  - **rAF paused for a 100-delta stream: max lag ≤ 50 ms**, and no frame requests pile up;
  - coalescing;
  - hidden page: flushes on a task;
  - visibility change while waiting;
  - timers throttled as well: an overdue request flushes on a task;
  - delayed requests, with frames and with rAF paused;
  - cancel and dispose; deadline validation.
- **`test/agent-session-publish.test.ts`, 4 tests** (AgentSession with fake transport and store,
  rAF paused):
  - the first token is published within the deadline;
  - a steady stream keeps publishing with lag ≤ 50 ms;
  - a hidden page publishes on a task;
  - **boundary commits are unchanged**: 20 deltas make 0 commits, and `TEXT_MESSAGE_END` plus
    `RUN_FINISHED` in one chunk make exactly 1 commit.

## 3. Method: Tauri WKWebView under controlled window states

### Environment

| | |
|---|---|
| Machine | Apple M1 Max, 64 GB, macOS 26.7.3 (25G416), one 3440×1440 display; a normal desktop with other apps open (BrowserOS, Messages, Office) |
| Shell | `tauri-shell/` sources unchanged; tauri 2.11.3, tauri-cli 2.11.4, wry 0.55.1, Rust 1.97.1, release `--no-bundle`; window 1280×720 at (1080, 191) |
| Build | `own/dist` (Vite 8.3.7, profiling react-dom as in c15), embedded as `gates/bin/km-spike-own-gate` by `gates/scripts/build-gate-shell.ts`. `tauri-shell/bin` was not touched; the Cargo target cache under `tauri-shell/src-tauri/target` was reused. |
| CSP | apps/web `buildContentSecurityPolicy` plus `connect-src http://127.0.0.1:4317`, as in c15 |
| Throttling | `KM_BACKGROUND_THROTTLING=default`, so the shell leaves `background_throttling` unset. wry 0.55.1 then sets no `inactiveSchedulingPolicy`, and WebKit's default applies. tauri-utils 2.10.2 documents `Suspend` as "usually the default behaviour in case no policy is set". |
| Harness | Collector and mock server on 127.0.0.1:4317, unchanged. The driver is `harness/src/webview-driver/tauri-run.ts`, unchanged: conformance mode, `--no-axe`, the 14 AG-UI scenarios × 6 repeats, with `long-markdown` first. |
| Node / pnpm | 24.11.1 / 11.15.0 |

### How each window state was produced and checked

`gates/scripts/window-state-run.ts` starts the unchanged harness driver. The driver brings the app to
the front at about 1.5 s with `osascript … set frontmost`. One second after the driver starts, the
runner starts `gates/bin/window-stage`, a native AppKit helper built from
`gates/scripts/window-stage.swift`. The helper re-asserts the state every second. It also logs one
sample per second, read from CoreGraphics `CGWindowListCopyWindowInfo`:

- the frontmost app;
- whether the target window is on screen;
- the target's rect;
- the fraction of the target covered by windows above it, on a 40×24 grid;
- the owners of those windows;
- the actions taken.

Plain `osascript`/System Events could not move or minimise windows (error -1719: "not allowed
assistive access"). The compiled helper is Accessibility-trusted (`axTrusted: true` in every sample).

| State | Produced by | A step counts only if every sample from 1 s before the step to its last report shows |
|---|---|---|
| Focused | `NSRunningApplication.activate` on the shell whenever another app is frontmost | shell frontmost, on screen, coverage 0 |
| Visible but unfocused | The helper (regular policy) activates its own 240×120 window in the bottom-left corner, outside the shell's rect. If any window covers the shell, the helper raises the shell and immediately re-activates itself (`repair-raise`). | another app frontmost, shell on screen, not hidden, coverage 0 |
| Occluded | The helper activates an opaque `.titled` window at `.floating` level covering the shell rect plus 60 px. Diagnostic variant (`--stager-style borderless`): a borderless window covering the whole screen. | shell not frontmost, coverage ≥ 0.999 |
| Minimised | Accessibility `AXMinimized = true` on the shell's window, re-applied if restored | shell not on screen, `method: ax-minimised` |

**Compliance.** Steps that ran before the first sample, or while something else took over, are
excluded:

- In two runs BrowserOS and Messages took the foreground; those steps were dropped.
- Every other run has at least 5 used steps per scenario, apart from the pooled focused baseline,
  which has 8 to 12 per scenario.
- The driver's in-page fields agree with the staging. `hasFocus` was true for 155 of 157 focused
  steps and 0 in every other state. `visibilityState` was `visible` in all focused, unfocused and
  occluded steps, and `hidden` in all minimised steps.

All four states could be produced reliably. One caveat for occluded: **WKWebView did not treat
either occluder as occlusion.** Under both, `visibilityState` stayed `visible`, frames kept running
(2,602 and 2,644 frame flushes), and the rAF-only control build was as fast as focused. The occluded
leg therefore exercises a visible, non-key window. A throttled-but-visible occlusion was not
reproduced, which matches c15's unexplained discarded run.

**Measurements.**

- **TTFT** is the driver's MutationObserver timestamp, measured from the submit click to the first
  assistant text.
- **Total** is the driver's submit-to-first-settle time, read with a 20 ms `setTimeout` poll.
- **p95** is nearest-rank: with 6 samples it is the maximum.
- **Pass:** for every scenario, p95 TTFT ≤ 1.5× and p95 total ≤ 1.5× the focused p95, with at least 5
  used steps, and every step conformant.

## 4. Results per window state (gate condition: default throttling)

Each cell is p95 TTFT / p95 total in ms, with the ratio to focused p95 in brackets. Run ids: focused
`mwb9pno5` + `mwbablqd`, unfocused `mwb9ruxc`, occluded `mwb9u0pe`, minimised `mwb9w6b6`. Tables with
medians are in `raw/16-1/summary.md`.

| Scenario | Focused (n) | Unfocused | Occluded | Minimised |
|---|---|---|---|---|
| `long-markdown` | 40 / 5870 (12) | 20 / 5899 (0.5× / 1×) | 32 / 5912 (0.8× / 1.01×) | 67 / 7356 (1.68× / 1.25×) |
| `a2ui-over-agui` | 46 / 211 (12) | 49 / 210 (1.07× / 1×) | 47 / 258 (1.02× / 1.22×) | 181 / 484 (3.93× / 2.29×) |
| `cancel-mid-stream` | 25 / 1202 (12) | 17 / 1190 (0.68× / 0.99×) | 17 / 1196 (0.68× / 1×) | 57 / 2034 (2.28× / 1.69×) |
| `custom-chunks` | 48 / 419 (12) | 54 / 425 (1.13× / 1.01×) | 46 / 416 (0.96× / 0.99×) | 271 / 1399 (5.65× / 3.34×) |
| `disconnect-reconnect-replay` | 38 / 1039 (12) | 43 / 1029 (1.13× / 0.99×) | 37 / 1027 (0.97× / 0.99×) | 257 / 2433 (6.76× / 2.34×) |
| `hitl-approve` | 47 / 290 (12) | 46 / 286 (0.98× / 0.99×) | 52 / 288 (1.11× / 0.99×) | 427 / 445 (9.09× / 1.53×) |
| `hitl-expire` | 48 / 283 (12) | 51 / 285 (1.06× / 1.01×) | 49 / 279 (1.02× / 0.99×) | 368 / 567 (7.67× / 2×) |
| `hitl-reject` | 47 / 282 (12) | 47 / 282 (1× / 1×) | 48 / 279 (1.02× / 0.99×) | 298 / 551 (6.34× / 1.95×) |
| `malformed-out-of-order` | 146 / 311 (9) | 131 / 284 (0.9× / 0.91×) | 132 / 283 (0.9× / 0.91×) | 389 / 410 (2.66× / 1.32×) |
| `parallel-tool-calls` | 60 / 709 (8) | 62 / 689 (1.03× / 0.97×) | 62 / 692 (1.03× / 0.98×) | 382 / 949 (6.37× / 1.34×) |
| `reasoning-subagents-snapshot` | 334 / 500 (11) | 344 / 510 (1.03× / 1.02×) | 331 / 500 (0.99× / 1×) | 635 / 883 (1.9× / 1.77×) |
| `run-cancelled-by-agent` | 46 / 128 (9) | 50 / 128 (1.09× / 1×) | 47 / 134 (1.02× / 1.05×) | 293 / 345 (6.37× / 2.7×) |
| `run-error` | 47 / 110 (12) | 63 / 106 (1.34× / 0.96×) | 44 / 106 (0.94× / 0.96×) | 291 / 303 (6.19× / 2.75×) |
| `state-snapshot-delta` | 155 / 261 (12) | 154 / 256 (0.99× / 0.98×) | 152 / 260 (0.98× / 1×) | 456 / 518 (2.94× / 1.98×) |

Publish triggers over the used steps (`raw/16-1/summary.json`):

| State | Triggers | Max publish lag excl. `long-markdown` |
|---|---|---|
| Focused | frame 5,462 · deadline 4 · overdue 2 | 51 ms |
| Unfocused | frame 2,504 · deadline 11 · overdue 1 | 51 ms |
| Occluded | frame 2,602 · deadline 0 | 25 ms |
| Minimised | hidden-task 616 · overdue 4 · frame 0 | 349 ms |

`long-markdown` reaches 0.9–2.2 s of lag in every state, focused included. Its cost is main-thread
work, re-rendering about 20 KB of markdown per publish, and no scheduler can pre-empt that. Gate
16.3 should measure it.

## 5. Diagnostics: what makes minimised slow

Summaries: `raw/16-1/summary-diagnostics.{json,md}`, `raw/16-1/o-internal-timing.json`.

**O's own run duration** comes from the probe's `runTiming` (`Date.now` at run start and at settle).
It does not depend on the driver's settle poll. Values are median / p95 in ms:

| Scenario | Focused | Unfocused | Occluded | Minimised, default | Minimised, throttling **Disabled** |
|---|---|---|---|---|---|
| `a2ui-over-agui` | 187 / 189 | 189 / 190 | 187 / 239 | 334.5 / 476 | 189.5 / 205 |
| `custom-chunks` | 402.5 / 418 | 414 / 421 | 410 / 414 | 651.5 / 750 | 401.5 / 409 |
| `hitl-approve` | 272 / 275 | 272.5 / 275 | 273.5 / 275 | 343.5 / 441 | 273.5 / 276 |
| `parallel-tool-calls` | 684 / 699 | 681.5 / 684 | 682 / 684 | 741.5 / 933 | 682.5 / 684 |
| `run-error` | 101 / 106 | 101 / 101 | 100.5 / 102 | 175 / 279 | 101 / 102 |
| `state-snapshot-delta` | 246 / 250 | 246.5 / 249 | 246.5 / 249 | 355.5 / 477 | 247 / 248 |
| `cancel-mid-stream` | 1186 / 1200 | 1186 / 1188 | 1187.5 / 1194 | 1671 / 2020 | 1911.5 / 2049 |

All 14 scenarios are in the JSON.

- **With throttling Disabled, minimised:**
  - TTFT p95 is within 1.39× of focused in every scenario (worst: `a2ui-over-agui` 64 ms);
  - O's run durations are within about 1.1×;
  - 84/84 steps are conformant.
  - The driver's *total* still fails here (up to 3.56×). Many scenarios settle at a flat 905–930 ms.
    That is the driver's 20 ms settle poll being clamped to about 1 s by hidden-page timer throttling,
    a harness artifact. `cancel-mid-stream`'s longer run duration has the same cause: the driver
    clicks cancel from a 50 ms poll.
- **With the default policy, minimised:** O's own run durations are 1.25–2.63× focused at p95. TTFT
  is a MutationObserver timestamp and does not depend on timers, yet it is 2–9× focused. The whole
  hidden WebContent process is deprioritised: even MessageChannel flushes waited up to 349 ms.
  O cannot fix this in page code.
- **Borderless full-screen occluder, diagnostic:** the run fails on one step. `hitl-expire` repeat 1
  had a TTFT of 180 ms (3.75×), while every other scenario was within 1.5×.
  - In that step all 12 flushes came from frames, with 22 ms max lag.
  - O's run duration was 409 ms, against 276 ms focused, so the whole run was slower.
  - The stager logged no action during the step. Other apps took the foreground 4 s later
    (KnowDesign) and again later (The Boss).
  - The scheduler is ruled out. The cause is not established, but a uniformly slower run fits machine
    contention. It still counts as a miss under the literal criterion for that diagnostic run.

## 6. Control: the previous rAF-only build in the same session

`tauri-shell/bin/km-spike-own` was built from the c15 dist with rAF-only publishing. It was run with
the same procedure (`raw/16-1/summary-raf-control.{json,md}`):

- **Focused:** 84/84 conformant.
- **Occluded:** 84/84 conformant, as fast as focused (no throttling, see section 3).
- **Minimised:** 79/84 conformant. All 5 failures were the same reconnect check. The p95 TTFT tails
  were long because text waited for the next boundary commit:
  - `cancel-mid-stream` 1,183 ms, against 57 ms with the scheduler;
  - `parallel-tool-calls` 1,566 ms, against 382 ms;
  - `reasoning-subagents-snapshot` 1,270 ms, against 635 ms.

  Medians were similar for both builds, and a few scenarios were faster in the control. The scheduler
  removes the second-scale stalls; it does not make a deprioritised process fast.
- **CSP:** the control logged **91** `font-src` violations (the inlined KaTeX font). The gate build
  logged 0 (gate 16.5).

**The reconnect check that fails only when minimised.** In `disconnect-reconnect-replay` the server
writes 25 events and then drops the connection.

- In 4 of the 6 minimised steps (5 in the control), O had received only events up to id 22 or 24 when
  the reset arrived. It reconnected with `Last-Event-ID` set to the last id it had actually processed,
  and the replay delivered the rest. The final snapshot matched the expected transcript: no gaps, no
  duplicates.
- The harness's server-side check requires the reconnect to carry exactly the drop position (25), so
  the collector judged these steps non-conformant.
- I report them as failures, as judged. I recommend relaxing the check to "resumed at or before the
  drop position with a correct transcript", which is the harness owner's call.

## 7. Requests and recommendations (not decided here)

- **To client-shell (apps/desktop), and the operator for the gate wording.** Under WebKit's default
  `.suspend` policy, a minimised window slows every client, H and O alike. For the meeting window,
  choose `background_throttling: "disabled"` or `"throttle"`, and measure power cost. Alternatively,
  restate the minimised criterion against what the platform allows.
  - **Long minimised periods were not tested.** Tauri documents unloading a hidden view after about
    5 minutes under the suspend policy, and every minimised run here took 4.4 minutes or less. A
    meeting minimised for longer needs a separate soak test before shipping.
- **To the harness owner:** the reconnect position check (section 6). The driver's settle poll in
  hidden pages could also use MessageChannel or a MutationObserver instead of a clamped `setTimeout`
  (section 5).
- **To 16.3:** measure `long-markdown`'s main-thread cost. It dominates publish lag in every state.

## 8. Not covered

- **Windows WebView2: pending.** Runbook: `../webview2-runbook.md`. Workflow:
  `../../tauri-shell/ci/webview2-gate-16-1.yml`, not wired into `.github/`, so not run.
- **Other window states:** app hidden (Cmd-H), another Space, a locked screen, and display sleep were
  not produced.
- **Load:** one machine and one session on a busy desktop. No CPU pinning.
- **Input:** trusted input is still substituted in WKWebView (`client.deviations` in the raw records).

## 9. Commands (from `spikes/agentic-ui/own/`)

```bash
pnpm typecheck && npx tsc --noEmit -p gates/tsconfig.json && pnpm test && pnpm build
RUSTC_WRAPPER= node gates/scripts/build-gate-shell.ts                 # -> gates/bin/km-spike-own-gate
swiftc -O gates/scripts/window-stage.swift -o gates/bin/window-stage
# harness collector already serving on 127.0.0.1:4317 (left running)
for s in focused unfocused occluded minimised; do node gates/scripts/window-state-run.ts --state $s; done
node gates/scripts/window-state-run.ts --state focused                                  # second baseline run
node gates/scripts/window-state-run.ts --state occluded --stager-style borderless --label own-gate-borderless
node gates/scripts/window-state-run.ts --state minimised --throttling disabled --label own-gate-diag-nothrottle
for s in occluded minimised focused; do
  node gates/scripts/window-state-run.ts --state $s --label own-raf-control --binary ../tauri-shell/bin/km-spike-own; done
node gates/scripts/summarize-window-states.ts <focused x2> <unfocused> <occluded> <minimised>   # summary.{json,md}
node gates/scripts/summarize-window-states.ts --out summary-diagnostics.json <focused x2> <borderless> <diag>
node gates/scripts/summarize-window-states.ts --out summary-raf-control.json <control runs>
node gates/scripts/o-internal-timing.ts focused=<id>,<id> unfocused=<id> ... > gates/raw/16-1/o-internal-timing.json
```

Exact run ids are in `raw/16-1/meta-*.json`, which records commands, environment, start and end
times, and exit codes. All runs exited 0.

## 10. Evidence index (`gates/raw/16-1/`)

| File | Content |
|---|---|
| `tauri-<runId>.jsonl` | Every collector record: snapshot, metrics including `counts.publish` and `counts.runTiming`, CSP violations, deviations, verdict per attempt |
| `window-<runId>.jsonl` | Stager samples, 1 per second: frontmost app, on-screen, coverage, covering owners, actions |
| `meta-<runId>.json` | State, throttling, driver and stager commands, timestamps, exit code |
| `steps-<runId>.jsonl` | Per step: conformant, compliant, TTFT, total, focus, visibility, publish stats |
| `summary.{json,md}` | Gate result (section 4) |
| `summary-diagnostics.*`, `o-internal-timing.json` | Section 5 |
| `summary-raf-control.*` | Section 6 |
| `run-*.log` | Runner output |
| `superseded/` | First focused run (`mwb9me1o`): 84/84 conformant, superseded when the stager start moved from 2.5 s to 1 s and `long-markdown` moved first |
| `../unit-tests.txt` | Unit test output (27/27) |

## 11. Background throttling disabled (2026-11-11)

**Operator decision 2026-11-11:** the product desktop app sets `"backgroundThrottling": "disabled"`
(`apps/desktop/src-tauri/tauri.conf.json`; valid values `disabled | throttle | suspend`; the policy
takes effect on macOS 14+ / iOS 17+ only). This section re-tests minimised under that setting.

### 11.1 Shell change (done, verified)

- `tauri-shell/src-tauri/src/main.rs`: if the build config declares a window labelled `main`
  (`create: false`), the shell builds it with `WebviewWindowBuilder::from_config`, the same way
  apps/desktop does. That window's `backgroundThrottling` then sets the policy, and
  `KM_BACKGROUND_THROTTLING` is ignored. With no such window, which covers the H and c15 builds, the
  previous code path is unchanged.
- `gates/scripts/build-gate-shell.ts`: O's generated config declares that window, with
  `backgroundThrottling: "disabled"`, 1280×720, `focus: true`. The value is exported as the
  constant `BACKGROUND_THROTTLING`.
- Rebuilt `gates/bin/km-spike-own-gate` (2026-11-11 02:26) from the unchanged `own/dist` (no source
  file is newer than the dist). Log: `raw/build-gate-shell-nothrottle.log`.
- **Verified:** on launch the binary reports
  `spike shell: window from config, background_throttling=Some(Disabled)`
  (`raw/16-1/shell-config-check-nothrottle.txt`).
- `gates/scripts/window-state-run.ts`:
  - new `--throttling config`: the binary's own config decides, recorded as
    `KM_BACKGROUND_THROTTLING=config` in the meta;
  - **new guard:** it refuses to start while the macOS session is locked (see 11.2).
- `gates/scripts/summarize-window-states.ts`: step rows also carry `startedAtEpochMs` (an additive
  field).
- `gates/scripts/soak-minimised.ts` (new): groups a long minimised run's steps by minutes since the
  window was first seen minimised. It judges each step against the focused p95 for its scenario.

### 11.2 Measurement attempt: invalid, the session was locked

Same method as sections 3 and 4: harness on :4317 (healthy), 14 scenarios × 6, a focused baseline
first, then minimised. A 14-repeat minimised soak (about 10 min) was started after them and stopped
early.

- The runs completed with driver exit 0, and all steps were conformant (84/84 in each run). But the
  stager reported `frontmost: "loginwindow"` in **every** sample, 99/99 in each run.
  `targetOnScreen` stayed true even while `AXMinimized` was being applied.
- `ioreg` confirms `CGSSessionScreenIsLocked = true`, with a lock time of 02:08:33. The runs went
  from 02:27 to 02:31.
- The summarizer therefore marks **0/84 steps state-compliant** in both runs. A locked screen is
  neither focused nor minimised, so these runs say nothing about the gate.
- They are quarantined in `raw/16-1/invalid-screen-locked/` (runs `mwbuvcww` focused, `mwbuxifn`
  minimised, partial soak `mwbuzwff`) and are not used.
- The runner's new guard refuses to start in this condition. Tested: it exits 1 with "screen is
  locked".

**Result: macOS minimised with throttling disabled is still pending. It is not a pass and not a
fail.** Re-running needs an unlocked, awake session that nobody is using.

### 11.3 What to expect, and a criterion decision needed before the re-run

The closest valid evidence is the diagnostic run of 2026-11-10, `mwbafy69`
(`raw/16-1/summary-diagnostics.json`, section 5). It used the same O dist, with the policy disabled
through the environment variable instead of the config:

- 84/84 compliant, 84/84 conformant. The reconnect race from section 6 did not occur, which fits a
  process that is not deprioritised.
- **TTFT p95 was within 1.5× in all 14 scenarios.** The worst was `a2ui-over-agui` at 1.39×.
- **Total p95 failed in 9 of 14 scenarios.** The worst was `state-snapshot-delta` at 3.56×, and
  `custom-chunks`, `hitl-*` and `malformed-out-of-order` were 2.95–3.28×.
  - This is the harness driver's 20 ms settle poll. It is a `setTimeout`, and WebKit clamps it to
    about 1 s in a hidden page whatever the Tauri policy, so many scenarios "settle" at a flat
    905–930 ms.
  - O's own run duration (`runTiming`, independent of that poll) was within about 1.1× of focused
    in the same run (section 5 table). `cancel-mid-stream` is the exception: the driver also
    clicks cancel from a 50 ms poll.

So under the literal criterion (p95 total within 1.5×, measured by the driver), **minimised is
expected to fail on total even with throttling disabled. The cause is the harness, not O.** Before
the re-run, one of these must be decided:

1. **Harness owner:** move the driver's settle detection, and the cancel trigger, off clamped
   timers, using a MutationObserver or MessageChannel. This was already requested in section 7.
2. **Operator:** for hidden pages, judge "total" by O's in-page `runTiming` instead of the driver
   poll.

Without either, the re-run can only confirm TTFT and conformance.

### 11.4 Soak (> 5 min minimised): not done

The soak started, but it ran under the same lock, so it is invalid. Tauri documents unloading a
hidden view after about 5 minutes under `suspend`; with `disabled`, that should not apply, but this
is unverified. Command for the re-run, from `spikes/agentic-ui/own/`:

```bash
node gates/scripts/window-state-run.ts --state focused   --throttling config --label own-gate-nothrottle
node gates/scripts/window-state-run.ts --state minimised --throttling config --label own-gate-nothrottle
node gates/scripts/window-state-run.ts --state minimised --throttling config --label own-gate-nothrottle-soak --repeats 14
node gates/scripts/summarize-window-states.ts --out summary-nothrottle.json <focused id> <minimised id> <soak id>
node gates/scripts/soak-minimised.ts --soak <soak id> --focused <focused id> --after-min 5
```

### 11.5 Still pending

- **Windows WebView2:** the workflow `.github/workflows/webview2-gate.yml` exists. Run it with
  `gh workflow run webview2-gate.yml` once PR #3 lands; it was not triggered here.
- **The reconnect-race conformance check** (section 6) is still open with the harness owner. It did
  not occur with throttling disabled on 2026-11-10.
