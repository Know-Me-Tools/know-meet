# Gate 16.1 — Windows WebView2 runbook (prototype O)

Status: **pending, not run.** WebView2 cannot run on the macOS machine that produced the WKWebView
evidence. Nothing in `gates/16-1-scheduler.md` says anything about WebView2. This runbook gives the
exact steps to produce the same evidence on Windows. A GitHub Actions workflow
(`../tauri-shell/ci/webview2-gate-16-1.yml`) automates them. It is not wired into the repository's
`.github/` folder.

## What is being proven

The same claim as the macOS leg. With O's bounded publish scheduler, run the 14 AG-UI conformance
scenarios at least 5 times per window state: focused, visible-but-unfocused, occluded and minimised.
The pass criteria are:

- every step is conformant (the collector verdict has no problems);
- for every scenario, p95 time-to-first-token and p95 total stream time are at most 1.5× the focused
  p95 of the same scenario.

## Platform differences to know before reading the results

- **Background throttling:** Tauri's `background_throttling` setting is **unsupported on Windows**
  (tauri-utils 2.10.2 `WindowConfig::background_throttling` docs). The shell's
  `KM_BACKGROUND_THROTTLING` therefore has no effect, and Chromium's own policy applies:
  - `requestAnimationFrame` stops for hidden and minimised views. Chromium's native-window occlusion
    tracking on Windows also marks fully occluded windows as hidden.
  - Timers in hidden pages are aligned to 1 s, and chained timers are throttled to once a minute
    after 5 minutes hidden ("intensive throttling").
  - `MessageChannel` tasks are not throttled. That is why O's scheduler flushes on a task when the
    page is hidden.
- **App origin:** the app is served from `http://tauri.localhost`, not `tauri://localhost`. The
  harness runner `harness/src/webview-driver/tauri-run.ts` hard-codes the macOS origin and calls
  `osascript`. On Windows, use `own/gates/scripts/webview-driver-run.ts` (same driver script, same
  collector, configurable `--app-url`).
- **Window staging:** `own/gates/scripts/window-stage.ps1` replaces `window-stage.swift` and logs the
  same JSON sample fields. It uses `SetForegroundWindow` for focused, a small form of its own for
  unfocused, a TopMost form covering the window plus 60 px for occluded, and
  `ShowWindow(SW_MINIMIZE)` for minimised.
  - Windows' foreground lock can refuse `SetForegroundWindow`. The log records each attempt as
    `activate-target:<bool>`.
  - Steps whose samples do not all match the intended state are excluded, as on macOS.
- **GitHub-hosted runners** run an interactive desktop at a small resolution (often 1024×768). The
  1280×720 window may be clamped. Occlusion and minimise behave as on a desktop, but record the
  resolution: the workflow prints it.

## Manual steps (any Windows 10 or 11 machine with the WebView2 Runtime)

Use PowerShell 7 (`pwsh`). Run everything from the repository root.

1. Install the toolchain at the macOS run's pins:
   - Node 24.11.1
   - pnpm 11.15.0
   - Rust 1.97.1 with the MSVC build tools
   - Tauri CLI 2.11.4: `cargo install tauri-cli --version 2.11.4 --locked`

   The WebView2 Runtime ships with Windows 11. Record its version:

   ```powershell
   Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' | Select-Object pv
   ```
2. Install the two standalone spike packages, which are not part of the root workspace:

   ```powershell
   pnpm --dir spikes/agentic-ui/harness install --ignore-workspace --frozen-lockfile
   pnpm --dir spikes/agentic-ui/own install --ignore-workspace --frozen-lockfile
   ```
3. Unit-test and build O:

   ```powershell
   pnpm --dir spikes/agentic-ui/own test
   pnpm --dir spikes/agentic-ui/own build
   ```

   The tests include the scheduler tests with paused rAF.
4. Build the gate shell. It uses the same CSP as the macOS leg: apps/web's policy plus `connect-src`
   for the harness.

   ```powershell
   cd spikes/agentic-ui/own; node gates/scripts/build-gate-shell.ts   # -> gates/bin/km-spike-own-gate.exe
   ```
5. Start the harness in a second terminal and leave it running:

   ```powershell
   cd spikes/agentic-ui/harness; node src/server/main.ts
   ```

   Check that `Invoke-RestMethod http://127.0.0.1:4317/healthz` returns `ok: true`.
6. Keep the desktop quiet. Close chat apps and notifications (Focus Assist on), and do not touch the
   mouse. Then run the four states in this order:

   ```powershell
   cd spikes/agentic-ui/own
   foreach ($s in 'focused','unfocused','occluded','minimised') { node gates/scripts/window-state-run-windows.ts --state $s --repeats 6 }
   ```

   On the Mac each state took 1.7 min (4 min minimised); allow 5-10 min per state on a CI runner. Results go to `own/gates/raw/16-1-webview2/`:
   - `tauri-<runId>.jsonl`: collector records;
   - `window-<runId>.jsonl`: one stager sample per second;
   - `meta-<runId>.json`: commands, timestamps and exit codes.
7. Summarise against the focused baseline:

   ```powershell
   $ids = Get-ChildItem gates/raw/16-1-webview2/meta-*.json | % { $_.BaseName -replace '^meta-','' }
   node gates/scripts/summarize-window-states.ts --dir 16-1-webview2 @ids
   ```

   This writes `summary.json` and `steps-<runId>.jsonl` and prints one table per state.
8. Stop the harness and close any shell window still open.

## Reading the result

- `summary.json`, per state:
  - `compliantSteps` and `steps`: steps judged against the intended state, out of all steps;
  - `conformantSteps`;
  - `perScenario[].ttftP95Ratio` and `totalP95Ratio`: ratios to the focused p95;
  - `publishTriggers`: how O's scheduler flushed. Expect `frame` when focused, `hidden-task` and
    `visibility-task` when hidden, and `deadline` when frames are throttled but the page is visible;
  - `pass`.
- A state with fewer than 5 compliant steps for a scenario cannot pass. Re-run it with more repeats,
  and record why the state drifted: the `actions` field shows each re-assertion.
- Record the result in a new section of `gates/16-1-scheduler.md`. Include the Windows build, WebView2
  Runtime version, screen resolution, commands and run ids. Until then, the WebView2 row there stays
  **pending**.

## GitHub Actions

Copy `spikes/agentic-ui/tauri-shell/ci/webview2-gate-16-1.yml` into `.github/workflows/` (on a branch,
or in a scratch fork) and start it with `workflow_dispatch`. It performs steps 1–7 on `windows-latest`
and uploads `own/gates/raw/16-1-webview2/` and the driver logs as the `webview2-gate-16-1` artifact.
Before running it in a shared repository, pin the third-party actions to commit SHAs. The workflow
needs no secrets.
