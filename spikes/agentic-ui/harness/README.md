# c15 agentic-UI spike harness

The shared harness both prototypes are measured on (OpenSpec change `c15-agentic-ui-spike`, task
15.1). It contains:

- a mock AG-UI SSE server;
- golden AG-UI scenarios, A2UI surfaces and a hostile markdown and media corpus;
- a Playwright check suite: conformance, A2UI, hostile content and accessibility;
- a measurement script.

Prototypes implement [`contract.md`](contract.md).

This is a standalone package. It is not part of the root pnpm workspace. Builds and runs inside
`spikes/agentic-ui/**` are an operator-approved, spike-scoped VLBV exception (decision log
2026-11-09, "Hybrid plus spike").

```bash
cd spikes/agentic-ui/harness
pnpm install --ignore-workspace
pnpm exec playwright install chromium   # once; add webkit for SPIKE_BROWSERS=webkit
```

## Versions

| | Version |
|---|---|
| AG-UI | protocol `1.0`, `@ag-ui/core@1.0.4`, `@ag-ui/encoder@1.0.4` (frame format) |
| AG-UI client the request shape was taken from | `@ag-ui/client@1.0.4` `HttpAgent`: POST, JSON `RunAgentInput`, `Accept: text/event-stream` |
| A2UI | spec `1.0`, basic catalog v1.0, validated with `@a2ui/web_core@0.15.0` |
| A2UI over AG-UI | `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA`, `activityType: "a2ui-surface"`, `content.a2ui_operations`; actions return as `forwardedProps.a2uiAction.userAction` (as in `@assistant-ui/react-ag-ui@0.1.2`) |
| Checks | `@playwright/test@1.65.0`, `@axe-core/playwright@4.14.0` |
| Tooling | `typescript@7.0.2`, Node >= 24.11 (runs `.ts` directly) |

All dependencies are pinned exactly in `package.json` (registry-verified 2026-11-10).

## Layout

```
corpus/            golden fixtures (generated JSON; do not hand-edit), media fixtures, manifest.json
src/domain/        corpus, expected-outcome and probe types (prototypes may import these types)
src/corpus-authoring/  TypeScript sources of the corpus (pnpm corpus:build)
src/validation/    corpus validation against @ag-ui/core and @a2ui/web_core (pnpm corpus:validate)
src/server/        mock AG-UI server (pnpm serve)
src/measure/       measurement script (pnpm measure)
checks/            Playwright suite (pnpm check); playwright.config.ts sits at the package root
contract.md        what a prototype must implement
reports/           generated reports (git-ignored)
```

## Mock server: `pnpm serve`

The server listens on `KM_HARNESS_PORT` (default **4317**; bound to `KM_HARNESS_HOST`, default
`127.0.0.1`). A second "evil" listener runs on `KM_HARNESS_EVIL_PORT` (default port + 1). The corpus
placeholders resolve at serve time:

- `{{ALLOWED_ORIGIN}}` becomes the main origin, which serves `/media/*`.
- `{{EVIL_ORIGIN}}` becomes the evil listener. Any request it receives is a test failure.

CORS reflects any `localhost`/`127.0.0.1`/`[::1]` origin, `tauri://localhost`,
`http://tauri.localhost` and `null`.

| Route | Purpose |
|---|---|
| `GET /healthz` | Liveness check, versions, origins, corpus counts. |
| `POST /agui/<scenario-id>` | Streams the matching run as SSE. The body is an AG-UI `RunAgentInput`. |
| `GET /agui/<scenario-id>` | Same, for EventSource clients (initial run or replay). |
| `GET /scenarios`, `GET /scenarios/<id>` | Scenario list; one scenario with its placeholders resolved. |
| `GET /a2ui/surfaces`, `GET /a2ui/surfaces/<id>` | Golden A2UI surfaces (for the Flutter parity run, 15.4). |
| `GET /hostile` | Hostile corpus with its placeholders resolved. |
| `GET /sessions/<id>`, `DELETE /sessions/<id>` | Per-session request log and the summary the checks compare. |
| `GET /hits?since=<epoch-ms>` | Requests to `/media/*` and to the evil listener. |
| `GET /media/<file>` | Image, video, audio and SVG fixtures; supports `Range`. |
| `POST /spike-report` | Collector for the in-webview driver (task 15.5). Judges each result like the checks and appends it to `reports/spike-report/<runId>.jsonl`. |
| `GET /spike-report/<runId>/progress` | Last reported step and whether the driver finished. |

Scenario ids are `<scenario>`, `a2ui/<surface>` or `hostile/<item>`. Query parameters on `/agui/...`:

- `session`: the request-log key. Falls back to the `X-Km-Session` header, then to `threadId`.
- `rate`: deltas per second; `0` or `max` means unthrottled.
- `gap`: milliseconds before each non-delta event.
- `lastEventId`: alternative to the `Last-Event-ID` header.

The server picks the run for each request in this order:

1. A `Last-Event-ID` replays the session's last run from that position, or returns `204` when the
   position is at or past the end.
2. A `resume[]` entry selects the matching resume run. A `resolved` resume after the interrupt's
   `expiresAt` gets the expiry error run and is logged as a violation.
3. A `forwardedProps.a2uiAction` selects that action's run.
4. Anything else gets the initial run.

A request that matches no run gets `409`. Injected faults (a dropped connection) fire once per
session.

Smoke test:

```bash
pnpm serve &
curl -s localhost:4317/healthz
curl -sN -X POST 'http://127.0.0.1:4317/agui/run-error?session=demo&rate=max' \
  -H 'content-type: application/json' -d '{"threadId":"t","runId":"r","messages":[]}'
curl -s localhost:4317/sessions/demo
```

## Checks: `pnpm check`

```bash
SPIKE_URL=http://localhost:4173/ SPIKE_NAME=hybrid pnpm check            # Chromium
SPIKE_URL=... SPIKE_NAME=own SPIKE_BROWSERS=chromium,webkit pnpm check   # plus WebKit
SPIKE_URL=... pnpm check --grep @hostile                                 # one family
CHECK_EVIDENCE=all SPIKE_URL=... pnpm check                              # trace + video for every test
```

The suite starts the mock server, or reuses one that is already running (`KM_HARNESS_URL`, default
`http://127.0.0.1:4317`). It runs serially (one worker) because the hostile checks read the global
hit log.

| Spec | Tests | Covers |
|---|---|---|
| `checks/conformance.spec.ts` | 14 | Every AG-UI scenario, driven through the UI, compared with its `expected` block. |
| `checks/a2ui-surfaces.spec.ts` | 8 | Golden surfaces: components, fallback, text, data model, blocked media, actions. |
| `checks/hostile.spec.ts` | 44 | XSS, link schemes, SVG, Mermaid, KaTeX, streaming fragments, huge table, media origins. |
| `checks/a11y.spec.ts` | 8 | axe, `aria-busy`, no live streaming text, throttled and finalized announcements, focus, keyboard approvals, `role=alert`. |

Reports go to `reports/checks-<SPIKE_NAME>.json` and `reports/checks-<SPIKE_NAME>-html/`. Traces,
videos and screenshots go to `test-results/<SPIKE_NAME>/`. Set `CHECK_RATE` and `CHECK_GAP` to
override pacing for every scenario.

## Measure: `pnpm measure`

```bash
pnpm measure --url http://localhost:4173/ --prototype hybrid --dist ../hybrid/dist
pnpm measure --url http://localhost:1420/ --prototype own-webkit --browser webkit
pnpm measure --prototype hybrid --dist ../hybrid/dist --dist-only
```

The script takes any URL: a Vite preview, a Tauri dev server, or a WebKit approximation. Task 15.5
records the real Tauri WebKit numbers. It uses the server at `--harness`, or starts one in-process
when none is running.

Each scenario runs in a fresh browser context, `--repeats` times (default 3; the report holds the
medians). By default it runs every non-interactive AG-UI scenario plus `hostile/huge-table`. It
records:

- time to first token (submit click to the first assistant text in the DOM);
- total stream time (submit to settle, 20 ms resolution);
- React commits and store commits from `window.__spike.renderCounts()`;
- long-task total and count (Chromium only);
- JS heap used before and after a forced GC (CDP, Chromium only);
- DOM node count.

`--dist` adds raw, gzip (level 9) and brotli (quality 11) sizes per asset, per extension and in
total. Source maps are excluded from the totals. Output goes to `reports/measure-<prototype>.json`.

## Tauri (WKWebView) runs: `src/webview-driver/`

macOS WKWebView has no WebDriver, so Playwright cannot drive a Tauri window. Task 15.5 injects a driver
instead:

- `instrumentation.ts`, `page-actions.ts` and `driver.ts` are the in-page equivalents of the check
  support code: the `__kmXss` sentinel, dialog and CSP-violation capture, the measure timeline, scenario
  interactions, the DOM and hostile selector checks.
- `build-driver.ts` strips types and concatenates them into one classic script, optionally prefixed with
  axe-core.
- The Tauri shell (`../tauri-shell`) installs that script as its initialization script (`KM_DRIVER_SCRIPT`).
- The driver walks the plan one page load per step, posts every result to `POST /spike-report` and
  re-posts for up to 10 s while the collector reports problems (the checks' `expect.poll`).
- The collector judges each result with `checks/support/compare.ts` and the server-side hostile guards
  (evil-listener and media hits).

```bash
node src/webview-driver/tauri-run.ts --binary ../tauri-shell/bin/km-spike-own --prototype own --mode conformance
node src/webview-driver/tauri-run.ts --binary ../tauri-shell/bin/km-spike-own --prototype own --mode measure --repeats 5
```

The driver has no trusted input. It sets text with the native value setter, and it activates keyboard
approvals with `focus()` + `click()`. It records each such substitution as a deviation.

## Corpus

```bash
pnpm corpus:build      # regenerate corpus/*.json + manifest.json from src/corpus-authoring
pnpm corpus:validate   # validate against @ag-ui/core and @a2ui/web_core; writes reports/corpus-validation.json
pnpm typecheck
```

The corpus covers all 31 AG-UI 1.0 event types. The latest validation passed 14 scenarios, 8
surfaces and 44 hostile items (52 wrapped scenarios); see `reports/corpus-validation.json`.

The media fixtures in `corpus/media/` were generated once with ffmpeg: a PNG, a 1 s H.264 baseline
MP4 and a 0.5 s 8 kHz WAV. `hostile.svg` is hand-written hostile content and must never execute.
