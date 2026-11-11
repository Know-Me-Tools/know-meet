# Prototype H (hybrid): results

OpenSpec change `c15-agentic-ui-spike`, task 15.2. Recorded 2026-11-10 by the know-meet-team ui-engineer.
Harness: `spikes/agentic-ui/harness` (contract version 1), unmodified. Build: `vite build` production bundle
served with `vite preview` on port 4175; mock server on 4317.

## Summary

| Suite | Chromium (Playwright) | WebKit (Playwright) |
|---|---|---|
| Conformance (`checks/conformance.spec.ts`) | 14 / 14 | 14 / 14 |
| A2UI golden surfaces (`checks/a2ui-surfaces.spec.ts`) | 8 / 8 | 8 / 8 |
| Hostile markdown and media (`checks/hostile.spec.ts`) | 44 / 44 | 44 / 44 |
| Streaming accessibility (`checks/a11y.spec.ts`) | 8 / 8 | 8 / 8 |
| **Total** | **74 / 74** | **74 / 74** |

148 expected, 0 unexpected, 0 flaky, 0 retries (`evidence/checks-hybrid-chromium-webkit.json`, copied from
`harness/reports/checks-hybrid.json`; HTML report in `harness/reports/checks-hybrid-html/`). WebKit long-task budgets
are "not measured" (no long-task API), as the harness documents. No unit tests were written for H (see limitations).

The first runs were not clean. The fixes are findings, so they are recorded:

| Run | Result | Cause | Fix |
|---|---|---|---|
| 1, conformance, Chromium | 13 / 14 | `a2ui-over-agui`: data model stuck at `seats: 6`. A2UI reported `Cannot assign to read only property 'seats'` (as a returned error, not a throw). entity-graph's immer store had deep-frozen the event payload at checkpoint time, and A2UI's `DataModel` mutates the same object in place. | `structuredClone` the operations at the A2UI host boundary |
| 2, hostile + a11y, Chromium | 47 / 52 | (a) axe `scrollable-region-focusable` on the scrolling `<main>` and code blocks; (b) inline `$...$` math not parsed (Streamdown's math plugin defaults to `singleDollarTextMath: false`), which also let GFM autolink a URL inside `\includegraphics{...}`; (c) `hostile/huge-table` long tasks **13,264 ms** against a 2,000 ms budget | (a) document scroll instead of a scroll container; code wraps instead of scrolling; (b) `createMathPlugin({ singleDollarTextMath: true })`; (c) `StreamdownTextPrimitive defer` (`useDeferredValue`): long tasks fell to about 200 ms |
| 3, full, Chromium + WebKit | 148 / 148 | | |
| 4, full, after repinning (below) | 148 / 148 | | |
| 5, full, final build | 148 / 148 | | |

Run 4 used new pins. This machine's pnpm enforces `minimumReleaseAge` (24 h). `@assistant-ui/react@0.15.34` and
`@assistant-ui/react-ag-ui@0.1.3` were published at 07:52 UTC the same morning. The first install silently wrote a
`pnpm-workspace.yaml` exclusion list for them. I removed that and pinned the previous releases instead:
`0.15.33` and `0.1.2`. `0.1.2` is also the version contract.md cites. The harness was not edited and no check was
weakened. Its `reports/` and `test-results/` folders are generated output.

## Dependencies (exact pins, each verified with `npm view <pkg>@<version>` on 2026-11-10)

| Package | Version | Role |
|---|---|---|
| `@assistant-ui/react` | 0.15.33 | Thread/Message primitives, runtime provider |
| `@assistant-ui/react-ag-ui` | 0.1.2 | AG-UI runtime (`useAgUiRuntime`), the live run/session state; approval seam; `sendA2uiAction` |
| `@assistant-ui/react-streamdown` | 0.3.21 | `StreamdownTextPrimitive` |
| `streamdown` / `@streamdown/code` / `@streamdown/math` | 2.7.1 / 2.0.0 / 1.0.3 | Markdown, Shiki, KaTeX |
| `mermaid` / `katex` | 11.17.2 / 0.16.47 | Same versions `@streamdown/*` resolve; imported directly |
| `dompurify` | 3.4.17 | SVG sanitizer for ```svg fences and Mermaid output |
| `@ag-ui/client` / `@ag-ui/core` | 1.0.4 / 1.0.4 | `AbstractAgent` pipeline; event schemas (`@ag-ui/core/schemas`) |
| `rxjs` | 7.8.1 | `Observable` for `AbstractAgent.run` (same version `@ag-ui/client` uses) |
| `@a2ui/react` / `@a2ui/web_core` | 0.15.0 / 0.15.0 | A2UI renderer and v1.0 `MessageProcessor` / basic catalog APIs |
| `zod` | 3.25.76 | A2UI peer (`KmFallback` schema). assistant-ui brings its own zod 4.6.7, so both ship |
| `@prometheus-ags/entity-graph-core` | 4.3.0 | Durable store (`createGraphStore`, `createGraphTransaction`, `applyJsonPatch`) |
| `react` / `react-dom` | 19.2.7 | `react-dom/client` aliased to `react-dom/profiling` (see "How measured") |
| dev: `vite` 8.3.7, `@vitejs/plugin-react` 6.3.0, `tailwindcss` / `@tailwindcss/vite` 4.3.5, `typescript` 7.0.2, `@types/react` 19.2.7, `@types/react-dom` 19.2.3, `@types/node` 26.6.6 | | |

Transitive versions as installed: `@assistant-ui/core` 0.3.33, `@assistant-ui/generative-ui` 0.0.9,
`@assistant-ui/store` 0.3.23, `assistant-stream` 0.3.56. `assistant-cloud` 0.2.10 is a hard dependency of
`@assistant-ui/react`. AGENTS.md excludes it, but it is not imported anywhere and nothing reaches the network.
`@prometheus-ags/entity-graph-react` was in the brief but is not used, so it was removed. The read model is a
port, and presentation subscribes to it with `useSyncExternalStore`. entity-graph-react's hooks are
transport/fetch-oriented and bind to the process-wide store, while H uses an isolated `createGraphStore()`.

## Architecture as built

```
src/
  domain/          pure TS: event-guard (per-run ordering), url-policy, km-custom-parts,
                   transcript/{model, projector} (journal -> normalised model)
  application/     ports (ChatSession = presentation port, DurableStore, SessionReadModel), session-recorder
                   (journal + checkpoints + interrupt expiry), announcer, launch-params, spike-probe
  infrastructure/  transport/ (SSE parser, resilient-stream, KmAgUiAgent extends AbstractAgent)
                   store/ (EntityGraphStore: DurableStore + SessionReadModel over entity-graph)
                   a2ui/ (A2uiHost: MessageProcessor fed from the journal)
                   assistant-ui/ (the ONLY files importing assistant-ui: runtime + ChatSession adapter,
                   transcript view built from ThreadPrimitive / MessagePrimitive + StreamdownTextPrimitive)
  presentation/    library-neutral components: message frame, composer, tool card, approval card,
                   km.* renderers, markdown overrides, Mermaid/SVG sanitizers, A2UI catalog, live region
  composition.ts, app.tsx, main.tsx   composition root
```

Data flow: `KmAgUiAgent.run()` does three things:
1. It streams SSE with its own parser.
2. It validates each frame with `@ag-ui/core` `EventSchemas` and the `EventGuard`.
3. It hands each accepted event to the `SessionRecorder` (journal, projection, checkpoint) and to the `A2uiHost`,
   and then `subscriber.next(event)` into `@ag-ui/client`'s pipeline. That pipeline feeds `useAgUiRuntime`.

assistant-ui renders messages, parts, tool calls and the approval seam. The approval card, the tool-call status,
`aria-busy` and the error alert read the **durable** state from entity-graph through `SessionReadModel`.
`window.__spike.snapshot()` reads the projection the checkpoints are written from.

- **Journal.** Append-only. Entry ids are deterministic: `<runId>#<SSE id>` for server frames and
  `<runId>#c<n>` for client decisions. A replayed frame with a known id is a no-op.
- **Checkpoints.** One graph transaction per checkpoint, upserting changed entities under deterministic ids plus
  one `km.journalSegment`. Checkpoints happen at RUN_STARTED/FINISHED/ERROR, TEXT/REASONING_MESSAGE_END,
  TOOL_CALL_END/RESULT, STATE_*, ACTIVITY_*, CUSTOM, STEP_*, SUBAGENT_*, MESSAGES_SNAPSHOT and every client
  decision, plus a 1 s durability checkpoint during long streams.

**A2UI: `@a2ui/react` with a Know Meet catalog, not assistant-ui's A2UI support.** `react-ag-ui` does consume
`a2ui-surface` activities. It converts each surface into its own generative-UI tree (`convertSurfaceToUISpec` in
`@assistant-ui/generative-ui`) and exposes it as a synthetic `present` tool call. That converter cannot render
the harness surfaces:
- It supports 15 component types. Video, AudioPlayer and Modal are missing.
- It drops unknown components instead of rendering a fallback.
- It strips component ids, so `data-a2ui-id` is impossible.
- It does not run `checks`.

H hides the `present` part. The `A2uiHost` instead feeds the same activity events into a v1.0 `MessageProcessor`,
and `A2uiSurface` renders them with a catalog of React implementations over the basic catalog's component APIs.
Binding, checks and actions therefore follow the spec. Actions go back through assistant-ui's
`useAgUiSendA2uiAction` (`forwardedProps.a2uiAction.userAction`). Unknown types are rewritten to `KmFallback`.
Media checks the origin allowlist before any request. Rendered ids are read from the DOM, and template-stamped
rows are reported through their `List` host.

**Reconnect and malformed frames: a library gap, worked around by replacing the transport.**
- `HttpAgent` neither reconnects nor exposes SSE ids.
- `@ag-ui/client`'s verify stage errors the whole run on an ordering violation.

`KmAgUiAgent` subclasses `AbstractAgent` and overrides only `run()` and `abortRun()`. It reconnects with
`Last-Event-ID` up to 3 times, skips frames at or below the last id, and runs the ordering guard *before* the
client pipeline, so verify never sees a bad event. assistant-ui needed no change for this. Its cancel path calls
`agent.abortRun()`.

**HITL.** The approval card is rendered inside assistant-ui's tool-call part. A decision is recorded in the
journal and then sent through the part's `respondToApproval({ approved })`. That seam produces exactly the
contract's resume: `[{ interruptId, status: "resolved", payload: { approved } }]`. Expiry is Know Meet's: a
timer from `expiresAt` journals `client.expired`, and the card turns `aria-disabled`. assistant-ui has an
`approval.resolution: "expired"` field, but the host has to set it, and H does not. The runtime's own part
therefore still considers the gate open; only the store-backed card blocks it.

## How measured

Same method as prototype O, so the numbers compare: `vite build` plus `vite preview`, with `react-dom/client`
aliased to `react-dom/profiling` so that `<Profiler onRender>` counts commits in production.
`renderCounts().storeCommits` counts entity-graph transactions (checkpoints). Journal entries are written inside
those transactions, not counted separately.

- **Harness measure** (`pnpm measure --url http://localhost:4175/ --prototype hybrid --dist ../hybrid/dist`,
  3 repeats, medians, Chromium): `evidence/measure-hybrid.json`.
- **Supplementary render-lag** (`node scripts/render-lag.mjs <browser>`, 3 repeats): `evidence/render-lag-*.json`.
  This exists because the harness counts DOM nodes and long tasks at the instant `runStatus` settles, and H's
  deferred Streamdown render finishes slightly later. For example, `hostile/huge-table` shows 28 DOM nodes at
  settle, before the table has rendered.

| Scenario | TTFT ms | Total ms | React commits | Store commits | Long tasks ms | Heap after GC MB | DOM nodes at settle |
|---|---|---|---|---|---|---|---|
| `long-markdown` | 130.1 | 5841.8 | 4596 | 9 | 0 | 20.6 | 1790 |
| `custom-chunks` | 72.9 | 418.7 | 57 | 11 | 0 | 15.8 | 76 |
| `disconnect-reconnect-replay` | 88.6 | 1011.2 | 93 | 4 | 0 | 13.7 | 28 |
| `malformed-out-of-order` | 148.3 | 275.8 | 23 | 4 | 0 | 13.4 | 28 |
| `parallel-tool-calls` | 75.3 | 692.2 | 106 | 13 | 0 | 14.3 | 57 |
| `reasoning-subagents-snapshot` | 345.8 | 491.8 | 61 | 10 | 0 | 13.9 | 33 |
| `run-cancelled-by-agent` | 63.1 | 110.4 | 15 | 3 | 0 | 12.9 | 29 |
| `run-error` | 62.4 | 112.5 | 14 | 3 | 0 | 12.7 | 31 |
| `state-snapshot-delta` | 167.0 | 251.1 | 20 | 11 | 0 | 13.3 | 28 |
| `hostile/huge-table` | 67.1 | 1098.6 | 411 | 5 | 264 | 19.5 | 28 (table not yet rendered) |

The render-lag supplement measures from settle to render-complete, with long tasks counted up to
render-complete:

| | Chromium | WebKit |
|---|---|---|
| `long-markdown` (20 h2) | +2 ms lag, 0 ms long tasks | +3 ms lag, not measured |
| `hostile/huge-table` (400 rows) | +46 ms lag, 214 ms long tasks | +76 ms lag, not measured |

The script prints 0 for WebKit long tasks; that means "no API", not "no long tasks".

**Render pressure is the clearest difference from O.** `long-markdown` streams 3,459 deltas, and assistant-ui
re-renders the message on every delta: 4,596 commits, against O's 164 from a frame-coalesced buffer.
- Streamdown's block memoisation keeps each commit cheap, so long tasks stay at 0.
- The durable store sees 9 commits for the run, against O's 8.
- `defer` was mandatory: without it the 400-row table cost 13.3 s of long tasks.

## Bundle size (`pnpm measure --dist`, `evidence/measure-hybrid.json`)

| | Raw | gzip -9 | brotli -11 |
|---|---|---|---|
| Entry JS `assets/index-*.js` (initial load) | 2,464,771 B | 714,468 B | 585,680 B |
| Entry CSS | 65,561 B | 16,530 B | 13,952 B |
| Whole `dist/` (465 files, maps excluded) | 16,814,672 B | 4,795,327 B | 4,241,452 B |
| of which JS (398 files, mostly lazy Shiki grammars and Mermaid diagram chunks) | 15,097,642 B | 3,331,642 B | 2,802,421 B |

Against O, the entry chunk is +658 KB raw, +184 KB gzip and +149 KB brotli. Entry chunk composition by package
(pre-minification source bytes from the source map, indicative only):

| Package | Source |
|---|---|
| `@a2ui/web_core` | 877 KB |
| `react-dom` (profiling build) | 603 KB |
| `katex` | 586 KB |
| **`@assistant-ui/core`** | **482 KB** |
| `zod` (3 and 4) | 322 KB |
| `parse5` | 308 KB |
| **`@assistant-ui/react-ag-ui`** | **233 KB** |
| `redos-detector` | 208 KB |
| **`@ag-ui/proto`** (protobuf path of `@ag-ui/client`, unused) | **168 KB** |
| `@prometheus-ags/entity-graph-core` | 143 KB |
| own code | 109 KB |
| `tailwind-merge` (via assistant-ui) | 104 KB |
| `@assistant-ui/react` | 94 KB |
| `@assistant-ui/store` | 84 KB |

## Lines of code written (non-blank, including comments; `src/` = 2,554 lines in 38 files)

| Layer | Lines | Notes |
|---|---|---|
| domain (guard, URL policy, km.* parts, transcript model + **projector 352 + support 32**) | 651 | The projector is the second reducer the hybrid needs (see findings) |
| application (ports, recorder, announcer, probe, launch params) | 321 | |
| infrastructure: transport (SSE parser, resilient stream, agent) | 205 | Library-gap workaround |
| infrastructure: store / A2UI host / assistant-ui adapter | 72 / 111 / 169 | Only the 169 import assistant-ui |
| presentation: A2UI catalog | 348 | 15 components + fallback |
| presentation: markdown, parts, transcript, session context | 153 / 166 / 131 / 50 | |
| composition root (`composition.ts`, `app.tsx`, `main.tsx`) | 122 | |
| `styles.css` | 55 | |
| `scripts/` (diagnostics, render-lag) | 76 | Not shipped |

**Copied patterns: 0 lines.** The shadcn skill was not loaded, as instructed, and the shadcn CLI was not run. The
AI Elements patterns were rebuilt by hand on the Know Meet tokens rather than copied:
- Message → `message-frame`
- Prompt Input → `composer`
- Tool → `tool-call-card`
- Confirmation → `approval-card`
- Response → `.km-prose` plus Streamdown

All lines above are therefore authored lines.

## Integration pain points

1. **Two state models.** assistant-ui's runtime aggregates a run into assistant-ui `ThreadMessage`s
   (`RunAggregator`: "keeps a single assistant message worth of parts") and keeps AG-UI's per-message ids, steps,
   protocol errors and interrupt lifecycle internal. The contract's normalised model, and a durable store of
   record, therefore cannot be read off the runtime. H re-derives it from the journal: a 384-line projector.

   The DOM shows assistant-ui's view (message status) next to the store's view (approval and tool status). They
   agree on every harness scenario, but nothing structurally enforces it.
2. **The transport is not pluggable at the right level.** `HttpAgent` cannot reconnect or tolerate bad frames, and
   `@ag-ui/client` fails the run on ordering violations. The fix (subclass `AbstractAgent`) is clean, but it means
   owning SSE parsing, reconnect and ordering rules: 205 lines.
3. **A2UI through assistant-ui is lossy** (see "Architecture as built"). H runs `@a2ui/react` beside the runtime,
   so A2UI costs the same as in O: catalog, lit, zod 3 and `redos-detector` are all in the entry chunk.
4. **Render pressure.** One commit per delta, with no host-side throttle hook on `useAgUiRuntime`. Mitigated with
   `defer`. A real fix would coalesce deltas in the transport before `subscriber.next`, which is more code that
   sits beside the library.
5. **Release churn and supply-chain policy.** The assistant-ui packages ship near-daily and many APIs are marked
   "Experimental, may change in any release": thread list, `onSwitchToThread`, message queue, interactions. A
   same-day release tripped the 24 h `minimumReleaseAge` policy.

## Where assistant-ui fought entity-graph

- **Shared object identity.** Events flow to the runtime, the projector, entity-graph and the A2UI host by
  reference. entity-graph (immer) deep-freezes what it stores, and A2UI's `DataModel` mutates its initial value,
  so A2UI updates failed silently until the payload was cloned at the host boundary. The same hazard exists for
  any consumer that mutates event payloads after a checkpoint.
- **Who owns status.** The approval card must read from the store, because expiry is Know Meet policy, while the
  runtime's tool part keeps its own `approval` state with an unset `resolution`. The two disagree after expiry
  unless the host also writes the runtime's state, and the runtime exposes no supported way to do that.
- **Hydration is not built.** Restoring a transcript from entity-graph into assistant-ui would need
  `ThreadHistoryAdapter` / `onSwitchToThread` to convert entities back into assistant-ui `ThreadMessage`s. That is a
  third mapping (journal → entities → runtime messages). The README notes that subagent nesting does not survive
  a reload.
- **Not a conflict:** checkpoint cadence. Because the runtime holds the live text, entity-graph never sees per-token
  writes (9 transactions for a 20 KB answer). This is the part of the hybrid that works as the reviewers intended.

## Deviations and limitations (honest list)

- **Skills.**
  - Loaded: `assistant-ui`, `vercel-react-best-practices`, `vercel-composition-patterns` (know-meet variant),
    `react-vite-stack`, `typescript-base-patterns`.
  - Not loaded: `shadcn`, as instructed. The role file's other skills (`impeccable`, `web-design-guidelines`,
    `better-accessibility`, `prometheus-ui-ux`) were not loaded and no Impeccable audit was run.
  - Not done: visual fidelity at 375/768/1024/1440 in both themes. Only the dark theme exists.
  - This is a spike measured on the harness, not a product surface.
- **No unit tests** (O has 8). Verification is the harness only.
- **`snapshot()` reads the projection's working set.** Between checkpoints, streaming text exists only there and in
  the runtime, not in entity-graph. `storeSnapshot()` returns the graph.
- **Not done:**
  - "Abandon" (cancelled resume): the port has no button for it.
  - Restart recovery and hydration.
  - Tauri WebKit/WebView2 (task 15.5).
  - Screen-reader testing with real assistive technology.
  - Light theme.
- **Mermaid** is rendered by H's own lazy renderer (strict, SVG labels, DOMPurify SVG profile), not
  `@streamdown/mermaid`, so that its output can be sanitized. Diagrams render on every fence update while
  streaming.
- **Raw HTML** in replies is dropped: rehype-raw is removed and `skipHtml` is set. It is not shown as escaped
  text.

## Effort to productionise (estimate)

| Work | Engineer-days |
|---|---|
| Move domain/application into `packages/`, contracts, boundary lint; keep assistant-ui confined to one adapter package | 3 |
| Settle the dual-model question: drive all status from the store, or push AG-UI ids/steps/status upstream into assistant-ui | 4 |
| Persistence and restart recovery: entity-graph → `ThreadHistoryAdapter` hydration, re-arm/expire interrupts, set runtime `approval.resolution` | 4 |
| Transport: delta coalescing before the runtime, fault-injection tests, cancel/resume idempotency keys | 3 |
| A2UI: design-faithful catalog, validation UX, data-model sync, fallback upstream | 4 |
| Bundle diet: lazy A2UI/KaTeX/Shiki subset, drop `@ag-ui/proto` path, one zod, no profiling build | 3 |
| Accessibility with VoiceOver/NVDA, reduced motion, focus review; light theme and visual fidelity | 3 |
| Tauri WebKit and WebView2 verification, CSP | 2 |
| Tests: projector property tests, guard, journal idempotency, component tests, CI | 4 |
| Security review of sanitizer and allowlists | 1 |
| Ongoing: tracking assistant-ui releases and experimental APIs | about 0.5 day per week |
| **Total** | **about 31 (6 to 7 weeks for one engineer)**, plus the ongoing upgrade tax |

## How to reproduce

```bash
cd spikes/agentic-ui/hybrid
pnpm install --ignore-workspace
pnpm build
pnpm preview &                                   # http://localhost:4175/
cd ../harness && pnpm serve &                    # http://127.0.0.1:4317 (or reuse a running one)
SPIKE_URL=http://localhost:4175/ SPIKE_NAME=hybrid SPIKE_BROWSERS=chromium,webkit pnpm check
pnpm measure --url http://localhost:4175/ --prototype hybrid --dist ../hybrid/dist
cd ../hybrid && node scripts/render-lag.mjs chromium 3
```

Diagnostics:
- `node scripts/probe-scenario.mjs <scenario> <prompt> [chromium|webkit] [waitMs]` prints the snapshot and render counts.
- `node scripts/dump-store.mjs <scenario> [entityType]` prints the entity-graph contents.
