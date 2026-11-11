# Prototype adapter contract (c15 agentic-UI spike)

Both prototypes, H (`spikes/agentic-ui/hybrid/`) and O (`spikes/agentic-ui/own/`), implement this
contract. The harness checks (`checks/`) and the measurement script (`src/measure/`) only talk to a
prototype through what is written here: URL parameters, `data-testid` hooks, ARIA, the
`window.__spike` probe and the requests the prototype sends to the mock server. Contract version: **1**.

## 1. Versions and wire contracts

| What | Pinned value | Source |
|---|---|---|
| AG-UI | protocol `1.0`, `@ag-ui/core@1.0.4` | `src/domain/versions.ts` |
| A2UI | spec `1.0`, basic catalog `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`, validated with `@a2ui/web_core@0.15.0` | `src/domain/versions.ts` |
| A2UI over AG-UI | `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA` with `activityType: "a2ui-surface"`, `content: { a2ui_operations: [<A2UI message>, ...] }`; deltas are JSON Patch ops appending to `/a2ui_operations/-` | same channel as `@assistant-ui/react-ag-ui@0.1.2` (`A2UI_SURFACE_ACTIVITY_TYPE`) |
| A2UI action back to the agent | a new run whose `forwardedProps.a2uiAction.userAction` is `{ name, surfaceId, sourceComponentId, timestamp, context }` | what `@assistant-ui/react-ag-ui@0.1.2` sends |
| Know Meet CUSTOM events | `km.citation`, `km.media`, `km.mermaid` (zod schemas in `src/domain/custom-chunks.ts`) | harness |

**A2UI version spelling.** Every golden message carries `"version": "1.0"`. `@a2ui/web_core` 0.15.0
(the core of `@a2ui/react` 0.15.0) accepts only the literal `"1.0"`; `a2ui_core` 0.5.0 (Dart, used by
`a2ui_flutter`) accepts `"1.0"` and `"v1.0"`. Do not rewrite the version.

Prototypes may import the harness's **types** (`src/domain/*.ts`) by relative path. They must not
import anything else from the harness.

## 2. Launch: URL parameters

The checks open `SPIKE_URL` with these query parameters. The prototype reads them once on mount and
then sets `window.__spike.ready = true`.

| Parameter | Meaning |
|---|---|
| `scenario` | Scenario id. May contain `/`: `long-markdown`, `a2ui/form-validation`, `hostile/xss-script-tag`. |
| `agui` | Mock server base URL, e.g. `http://127.0.0.1:4317`. |
| `session` | Opaque id. Pass it through on every request (the server keys its request log by it). |
| `allowMediaOrigin` | Origin allowed for media (`<img>`, `<video>`, `<audio>`, A2UI Image/Video/AudioPlayer). May repeat. Everything else is blocked. |
| `rate`, `gap` | Optional pacing overrides. Pass them through unchanged when present. |

Endpoint for every run of the session:

```
POST {agui}/agui/{scenario}?session={session}[&rate=..][&gap=..]
Content-Type: application/json
Accept: text/event-stream
body: AG-UI RunAgentInput (threadId, runId, messages, tools, context, state, forwardedProps, resume)
```

Keep `/` in the scenario path (`encodeURI`, not `encodeURIComponent`). `@ag-ui/client@1.0.4`
`HttpAgent` sends exactly this request shape (POST, JSON body, `Accept: text/event-stream`), so
`new HttpAgent({ url })` works for ordinary runs. The server validates each body with
`RunAgentInputSchema` and a schema failure fails the scenario. `GET` on the same URL also streams
(initial run or a `Last-Event-ID` replay) for EventSource clients.

Responses are SSE frames `id: <n>\ndata: <AG-UI event JSON>\n\n`, where `n` is the 1-based position
of the event in the run. A `409` JSON response means the request matched no run (for example, a
resume the scenario does not expect). The checks fail the scenario on any `409`.

## 3. Behaviour each scenario relies on

**Turn.** The user types into `km-composer-input` and activates `km-composer-submit`. The prototype
appends a user message whose text is exactly the typed text, then starts a run. The composer input
stays enabled and focusable while a run streams. Only the submit button may be disabled.

**Cancel.** `km-cancel-run` is visible and enabled while a run streams. Activating it aborts the HTTP
request (AbortController). The run becomes `cancelled`. The streaming message keeps the text received
so far and becomes `cancelled`. The server must observe the abort.

**Reconnect and replay.** If the stream fails with a network error before `RUN_FINISHED` or
`RUN_ERROR`, reconnect to the same URL with header `Last-Event-ID: <last id received>` (or query
`lastEventId=`) and the same body. Retry up to 3 times. The server resumes at the next event. Do not
duplicate or drop text. `HttpAgent` does not reconnect by itself, so wrap or replace its transport.

**Malformed input.** Invalid JSON, schema-invalid events, unknown event types and ordering violations
are recorded in `snapshot().protocolErrors` (one entry per rejected frame or event) and skipped. The
run continues. Text from rejected events never renders. `HttpAgent@1.0.4` errors the whole run on a
non-JSON or type-less frame, so a prototype built on it needs its own SSE parsing to pass
`malformed-out-of-order`.

**Human in the loop.** `RUN_FINISHED` with `outcome.type: "interrupt"` makes the run `interrupted`.
Each interrupt renders one approval card:

```html
<div data-testid="km-approval" data-interrupt-id="int-..." data-status="pending|approved|rejected|expired|cancelled">
  <button data-testid="km-approval-approve">Approve …</button>
  <button data-testid="km-approval-reject">Reject …</button>
</div>
```

The buttons are native `<button>`s (Enter and Space activate them), reachable with Tab, with
accessible names matching `/approve/i` and `/reject|deny|decline/i`. A decision starts a new run with
`resume: [{ interruptId, status: "resolved", payload: { approved: true|false } }]`. This is what
assistant-ui's tool-approval seam sends. "Abandon" sends `{ interruptId, status: "cancelled" }` with
no payload. When `expiresAt` passes, the card becomes `expired`, both buttons become `disabled` or
`aria-disabled="true"`, the tool call becomes `expired` and the run stays `interrupted`. The
prototype never sends a `resolved` resume after expiry. The tool call moves from `pending-approval`
to `complete` (approved, with result), `rejected` (rejected) or `expired`.

**A2UI.** Each surface renders inside `[data-testid="km-a2ui-surface"][data-surface-id="<id>"]`. Each
rendered component's root element carries `data-a2ui-id="<component id>"`. An unknown component
renders a neutral fallback that also carries `data-a2ui-id` and `data-a2ui-fallback`. A TextField's
`data-a2ui-id` element is, or contains, its `<input>`/`<textarea>`. A CheckBox's element is, or
contains, `input[type=checkbox]` or `[role=checkbox]`. A Button sends its action as a new run
(section 1). A Button sends nothing when its `checks` fail; it shows the validation messages instead.
`deleteSurface` sets `deleted: true` and removes the surface's components.

**CUSTOM events.** Known names render with a renderer, inside
`[data-testid="km-custom-part"][data-part-name="<name>"]`, attached to `value.messageId`. Rules:

- Citations render as superscript markers.
- `km.media` renders `<img alt=label>`, `<video controls>` (never `autoplay`) or `<audio controls>`,
  but only from an `allowMediaOrigin` origin. Anything else renders `[data-testid="km-media-blocked"]`
  and makes no request.
- `km.mermaid` renders an `<svg>`.
- Unknown `km.*` names render `[data-testid="km-custom-unknown"]` and are reported with rendering
  `fallback`.
- `RAW` never renders.

**Markdown safety.** The hostile corpus (`GET /hostile`) defines what must hold:

- Raw HTML never becomes live DOM.
- No element carries an `on*` attribute.
- Links allow only `http:`, `https:` and `mailto:`.
- Images and media load only from `allowMediaOrigin`.
- Raw SVG and Mermaid output are sanitized (no `<script>`, `foreignObject` HTML or external
  references). Use Mermaid `securityLevel: "strict"` and KaTeX `trust: false`.
- Incomplete streamed constructs (an open fence, table, link or math) render as text and never throw.

During the checks the page may request only its own origin, the mock server and `data:`/`blob:`
URLs. Self-host fonts and every other asset.

## 4. DOM hooks

| `data-testid` | Element |
|---|---|
| `km-transcript` | Message list container. All DOM assertions are scoped to it. `aria-busy="true"` while a run streams. |
| `km-message` | One message. Attributes: `data-message-id`, `data-role`, `data-status` (`streaming`/`complete`/`cancelled`/`error`). |
| `km-tool-call` | One tool call. Attributes: `data-tool-call-id`, `data-status`. |
| `km-approval`, `km-approval-approve`, `km-approval-reject` | HITL (see section 3). |
| `km-custom-part`, `km-custom-unknown`, `km-media-blocked` | CUSTOM events and blocked media. |
| `km-a2ui-surface` | A2UI surface, with `data-surface-id`. |
| `km-composer-input`, `km-composer-submit`, `km-cancel-run` | Composer and cancel. |
| `km-live-region` | The single polite live region (see section 6). |

A run error renders an element with `role="alert"` inside `km-transcript`.

## 5. `window.__spike` probe

The shape is `SpikeProbe` in `src/domain/spike-probe.ts`. Install it before first render. Fields:

- `contractVersion: 1` and `prototype: "hybrid" | "own"`.
- `ready` is true after the URL parameters are read and the composer is interactive.
- `snapshot()` returns the normalised transcript model (`SpikeSnapshot`), not React state. It holds:
  - `messages`: user, assistant, reasoning, tool and activity messages in transcript order. `text` is
    the raw accumulated markdown. A `MESSAGES_SNAPSHOT` replaces the list.
  - `toolCalls`: `args` parsed once complete; `result` exactly as received.
  - `interrupts`, `state` (after `STATE_SNAPSHOT`/`STATE_DELTA`), `customParts`, `a2uiSurfaces`
    (`dataModel` is the surface's current data model), `activities`, `steps`, `subagents`,
    `protocolErrors`.
  - `runStatus`: `idle` before the first run, `running`, then `finished`, `interrupted`, `cancelled`
    or `error`. `runErrorCode` comes from `RUN_ERROR.code`.
- `renderCounts()` returns `commits`, the React Profiler `onRender` calls around the transcript root
  since the last reset; `byComponent`, per-component counts for components you instrument; and
  `storeCommits`, the writes committed to the durable store since the reset (entity-graph
  transactions, journal appends or checkpoints; 0 if none).
- `resetRenderCounts()` zeroes all three counters.
- `storeSnapshot()` returns any JSON view of the store, for diagnostics only.

The comparator ignores `tool`, `activity`, `system` and `developer` messages. It also ignores
empty-text assistant messages that the expectation does not name (tool-call carriers). Any other
extra message fails.

## 6. Accessibility

- Streaming text is **not** inside a live region: no `aria-live` other than `off` and no role `log`,
  `status`, `alert`, `marquee` or `timer` on the streaming message or its ancestors.
- Exactly one `km-live-region` (`aria-live="polite"` or `role="status"`) carries throttled
  announcements: at most about one per second while streaming. After a message completes, it carries
  a final announcement of at most 300 characters (a summary, not the whole message).
- `km-transcript` has `aria-busy="true"` while streaming and drops it after.
- Neither streaming nor a new approval card moves focus. After an approve or reject decision, focus
  stays on a sensible element and never falls to `<body>`.
- axe (WCAG 2.0, 2.1 and 2.2 A/AA tags) reports no violations when idle, mid-stream, settled or with
  a pending approval.

## 7. What "pass" means

A scenario passes when every field present in its `expected` block (`src/domain/expected.ts`)
matches. The scenario's served JSON is at `GET /scenarios/<id>`. The fields are checked against the
final `snapshot()`, the server's session summary (`GET /sessions/<session>`, see
`src/server/session-log.ts`) and the DOM inside `km-transcript`. On top of those fields, every
scenario must also have no `409`-unmatched request and no schema-invalid `RunAgentInput`.

| Scenario | Pass requires |
|---|---|
| `long-markdown` | `finished`. Text equals the 20 KB source exactly. At least 10 `table`, 10 `pre code` and 20 `h2`. |
| `parallel-tool-calls` | 4 tool calls `complete` with exact args, including `TOOL_CALL_CHUNK` assembly. Step `gather` finished. 4 `km-tool-call`. |
| `hitl-approve` | Approve **by keyboard**, then `finished`. Resume `{resolved, approved: true}`, 2 requests. Tool call `complete` with `"sent":true`. Interrupt `approved`. |
| `hitl-reject` | Reject **by keyboard**, then resume `{resolved, approved: false}`. Tool call `rejected` with "rejected by user". Interrupt `rejected`. |
| `hitl-expire` | Waits for the 3 s expiry. Stays `interrupted`. Interrupt and tool call `expired`. 1 request only. Approve button disabled. |
| `cancel-mid-stream` | Cancel after 300 characters. Run and message `cancelled`. Text is a strict prefix of the full text. Server saw the abort. |
| `run-cancelled-by-agent` | `RUN_FINISHED` cancelled outcome makes the run and the open message `cancelled`. |
| `run-error` | `error` with code `RECORDING_UNAVAILABLE`. Message `error`. A `role="alert"` element. |
| `disconnect-reconnect-replay` | Socket dropped after 25 events. Reconnect with `Last-Event-ID: 25`. 2 requests. Exact text, no duplicates. |
| `state-snapshot-delta` | Final shared state deep-equals the expected agenda. |
| `custom-chunks` | 2 citations, image/video/audio and Mermaid render with renderers. `km.future-widget` uses the fallback. `RAW` not rendered. |
| `a2ui-over-agui` | Surface `km-room-picker` renders 6 components. Clicking `book_btn` sends `book_room` with context `{room: "Atlas", slot: "14:00"}`. Data model ends `booked: true`. |
| `reasoning-subagents-snapshot` | After `MESSAGES_SNAPSHOT`, exactly the 3 snapshot messages. Subagents `finished` and `error`. (The scenario says encrypted reasoning must not show as text; that is not asserted yet and is reviewed by eye.) |
| `malformed-out-of-order` | `finished` with at least 5 protocol errors. Only `msg-good-1` renders. No `*-MUST-NOT-RENDER` text. |
| `a2ui/<surface>` (8) | Rendered and fallback component ids. Visible text. Data model. Blocked media never requested. Each golden interaction sends exactly the expected action, or none plus the validation text. |
| `hostile/<item>` (44) | `__kmXss` never called. No dialog or navigation. No disallowed request, and zero evil-listener hits. No `on*` attribute. No globally forbidden element. Raw text preserved. The item's own required/forbidden selectors, text, media-request, finalize-time and long-task budgets hold. |
| a11y (8 tests) | Section 6. |

The same checks run in WebKit with `SPIKE_BROWSERS=webkit`. Long-task budgets are reported as "not
measured" there because WebKit has no long-task API.
