# End-to-end Flutter agentic-UI plan (c16 gate 16.7)

- **Change and gate:** `c16-agentic-core-gates`, gate 16.7. This is the "separate end-to-end Flutter plan"
  that `report.md` gate 7 asks for.
- **Author and date:** mobile-engineer, 2026-11-10.
- **Status:** plan and spike evidence only. Nothing in `apps/mobile` changed.
- **Adopted architecture it serves:** O (AGENTS.md, decided 2026-11-10). Know Meet owns its AG-UI core: an SSE
  transport, a pure reducer and a HITL state machine in domain/application. AG-UI and A2UI are the only wire
  contracts. No chat framework.

**Evidence (all under `a2ui-flutter/evidence/16-7/`):**

- `probe-raw.jsonl` and `probe-summary.json` record 8 runs of
  `probes/ag_ui_probe/bin/probe.dart` against the harness on `127.0.0.1:4317` (contract v1), using Dart 3.13.4.
- `package-inspection.txt` holds the pub.dev metadata for `ag_ui` 0.3.0 and the source excerpts cited below.
- The earlier A2UI parity results in `a2ui-flutter/results.md` are reused, not re-run.

## 1. Answer in one paragraph

**Package:** don't adopt the community Dart `ag_ui` 0.3.0 as the runtime AG-UI layer. It is real, MIT, published
by the verified `community.ag-ui.com` and decodes the streaming core correctly. But it lags `@ag-ui/core` 1.0.4 on
exactly the parts Know Meet depends on:

- It has no `RUN_FINISHED.outcome`, so an interrupt is silently reported as a normal finish.
- It has no `resume` field on the run input.
- It has no `SUBAGENT_*` events.
- A POSTed run can't reconnect with `Last-Event-ID`.
- Cancel doesn't abort the socket.

**Architecture:** use **option (a)**. Port O's domain and application layers to Dart 1:1, behind the same ports.
Use our own small SSE/POST transport at the edge. Keep the durable store behind a `TranscriptStore` port (adapter
over the existing Rust `gen-ui-db` through flutter_rust_bridge, boundary commits only). Render A2UI with
`a2ui_flutter` 0.2.0 and the Know Meet catalog.

**Parity:** cross-platform parity is enforced by running the *same harness corpus and expected blocks* against both
reducers, not by sharing reducer code.

**Rust/WASM reducer:** evaluated in §4 and not recommended now.

**Estimate:** about **49 / 69 / 99 engineer-days** (low / likely / high) for one Flutter engineer, plus upkeep.

## 2. Dart AG-UI package evaluation

### 2.1 Candidates (pub.dev API, 2026-11-10)

| Package | Version, date | Publisher | Licence | What it is | Verdict |
|---|---|---|---|---|---|
| **`ag_ui`** | 0.3.0, 2026-06-24 (0.1.0 was 2025-09-21; 2 releases) | `community.ag-ui.com` (verified) | MIT | Community Dart SDK in `ag-ui-protocol/ag-ui/sdks/community/dart`: typed events, encoder/decoder, SSE parser, `AgUiClient`. Deps `http`, `meta`. 140/160 pub points, ~16.2k downloads/30 d. | Evaluated and probed (below). Usable as a **codec**, not as the transport or event model. |
| `agentivity_ag_ui` | 0.3.12, 2026-05-23 | `agentivity.io` | MIT | Chat panel, HIL forms and run monitor over Dio + `flutter_markdown_plus`. 186 downloads/30 d. | Rejected. It is a chat framework (AGENTS.md forbids one) and brings its own UI and state. |
| `agentic_client` | 1.0.0, 2026-08-29 | none (unverified) | MIT | A2UI over AG-UI chat client on `ag_ui`, `genui` and `a2ui_core`. 171 downloads/30 d. | Rejected. Unverified publisher; built on `genui`, which `a2ui_flutter` says it replaces. Same `ag_ui` gaps. |
| `tandem` | 0.3.0, 2026-11-02 | `leancode.co` | Apache-2.0 | Makes an existing screen agent-controllable over AG-UI, with approvals. | Out of scope: it serves screen co-piloting, not a transcript UI. Worth watching for a later "agent drives the app" feature. |
| `a2ui_flutter` / `a2ui_core` | 0.2.0 / 0.6.0, 2026-11-09 | `labs.flutter.dev` | Apache-2.0 | A2UI renderer and core. | Adopted (results.md). No AG-UI transport. |

### 2.2 `ag_ui` 0.3.0 coverage against `@ag-ui/core` 1.0.4

The source was read from the pub cache (`package-inspection.txt`). Wire names come from its `EventType` enum.

| Area | `@ag-ui/core` 1.0.4 | `ag_ui` 0.3.0 | Matters for Know Meet? |
|---|---|---|---|
| Text, tool-call, state, messages, activity, step, raw and custom events, including `*_CHUNK` | yes | yes | Yes. Decodes correctly (probe). |
| `REASONING_*` incl. `REASONING_ENCRYPTED_VALUE` | yes | yes, plus deprecated `THINKING_*` | Yes. |
| `SUBAGENT_STARTED/FINISHED/ERROR` | yes | **no**. They are decoded as an unknown type: `DecodingError` per event | Yes (`reasoning-subagents-snapshot`). |
| `RUN_FINISHED.outcome` (`success`/`interrupt`/`cancelled`) | yes | **no**. `RunFinishedEvent` has only `threadId`, `runId` and `result`, and `outcome` is dropped | **Critical**: HITL and `run-cancelled-by-agent`. |
| `RunAgentInput.resume` (`ResumeEntry[]`) | yes | **no** on `RunAgentInput` or `SimpleRunAgentInput` | **Critical**: there is no way to answer an interrupt. |
| `Last-Event-ID` reconnect | harness extension; AG-UI 1.0 defines none | `SseClient` reconnects with `Last-Event-ID` **for GET only**. `AgUiClient.runAgent` (POST) parses the response once, and SSE ids are not exposed to the caller | Yes (`disconnect-reconnect-replay`). |
| Cancel | AbortController | `CancelToken` drops the response at the completer. Its own docs say the "underlying HTTP connection is NOT aborted" | Yes. `cancel-mid-stream` needs the server to see the abort. |
| Malformed frames | O records a protocol error and continues | Yields `Stream.error` per bad frame and continues **if** the listener uses `cancelOnError: false`; `await for` stops at the first one | Workable with care. |
| Protobuf | optional | not implemented (documented) | No (SSE only). |
| Public `SseParser` | n/a | **not exported** (only `SseClient.parseStream`) | Minor. |

**Maintenance:** 2 releases in 14 months; 0.3.0 was a "review-fix pass" with breaking type changes. It is
community-owned, not part of the official TS or Python SDK release train, and it is already a minor protocol
version behind (no interrupts or subagents). We would track it *and* patch around it.

### 2.3 Probe results

The probe is `probes/ag_ui_probe/bin/probe.dart`, a pure Dart CLI with `ag_ui: 0.3.0` and `http: 1.6.0` pinned
exactly. It runs in two modes:

- **stock** is unmodified `AgUiClient.runAgent`.
- **adapter** keeps `ag_ui` only for decoding (`SseClient.parseStream` plus `BaseEvent.fromJson`), with our own POST
  transport, `Last-Event-ID` retry (up to 3), a resume body, and the raw JSON map kept beside the typed event.

The server columns come from `GET /sessions/<id>`.

| Scenario | Mode | Client result | Text equals expected | Server: requests / resume / Last-Event-ID / unmatched / invalid |
|---|---|---|---|---|
| long-markdown (3,463 events, 20 KB) | stock | finished in 5,832 ms, 0 errors | same length as adapter (20,316 chars) | 1 / – / no / 0 / 0 |
| long-markdown | adapter | finished in 5,838 ms | **yes** | 1 / – / no / 0 / 0 |
| hitl-approve | stock | **"finished"**: the interrupt is invisible (`outcome` dropped), so no approval card could be shown, and resume can't be expressed anyway | first message only | 1 / none / – / 0 / 0. **Fails the scenario** |
| hitl-approve | adapter | interrupted → approve → resumed run finished; tool result `{"sent":true,"recipients":4}` | **yes** (both messages) | **2** / `{resolved, approved:true}` / – / 0 / 0 |
| disconnect-reconnect-replay | stock | `ClientException: Connection closed while receiving data` after 25 events; run left `running`, with no retry | partial (145 of 295 chars) | 1 / – / **no**. **Fails the scenario** |
| disconnect-reconnect-replay | adapter | attempt 1 dropped at id 25; attempt 2 with `Last-Event-ID: 25` finished at id 49; 847 ms | **yes**, no duplicates | **2** / – / **yes** / 0 / 0 |
| malformed-out-of-order (bonus) | stock | finished; 4 `DecodingError`s surfaced, stream continued (`cancelOnError: false`) | n/a | 1 / – / – / 0 / 0. The contract wants at least 5 protocol errors: ordering violations are a reducer job, not a codec job |
| reasoning-subagents-snapshot (bonus) | stock | finished; **4 `DecodingError`s**, one per `SUBAGENT_*` event, so subagent state is lost | n/a | 1 / – / – / 0 / 0. Fails the subagent assertions |

**What this shows:**

- On the wire, Dart has no problem with any of the three required scenarios. Our own transport passes all three
  with the server's counters exactly as the contract expects.
- The stock package fails two of the three.
- Even the passing adapter needs the raw JSON map for `outcome`, and needs a hand-built body for `resume`.

**Verdict:** `ag_ui` buys us typed decoding of about 30 event shapes, and nothing we can't write in ~300 lines.
We would still have to bypass it for transport, interrupts, resume, subagents and abort. Write our own Dart codec
in the infrastructure layer, mirroring O's `agui-event.ts` domain union. Reuse `ag_ui` only as an optional
cross-check in tests, if at all. Re-evaluate if `ag_ui` reaches protocol parity (outcome, resume, subagents) under
the official SDK release train.

## 3. Architecture options

| | (a) Dart port of O + own Dart transport | (b) Shared reducer in Rust: flutter_rust_bridge on mobile, WASM on web/Tauri | (c) Community package + adapter |
|---|---|---|---|
| Reducer and HITL parity with web | Two implementations of the same pure logic (~1,500 TS lines in O's domain and application). Kept equal by running the **same corpus and `expected` blocks** in both test suites. | One implementation. | The package has no reducer; we'd still write one (the same as (a)). |
| Fits adopted decision O (AGENTS.md: TS reducer on `@ag-ui/core` types) | Yes. Web is untouched. | **No.** Web domain moves to Rust/WASM and loses `@ag-ui/core` types as its source; the c16 web gates are re-opened. | Partly. Mobile only. |
| Fits the hybrid-mobile template invariant ("networking/agent logic in Rust") | No. The transport is Dart. We accept this deliberately: UAR runs server-side for Know Meet and the client only renders a stream. Flag it to the architect. | Yes. | No. |
| Runtime cost | All Dart; frames are driven by Flutter's scheduler. | Per-delta FFI hop on mobile (3,459 deltas in long-markdown) plus shipping state back to Dart for every publish. On web, a JS↔WASM serde boundary per event and a larger initial bundle. | As (a). |
| Rust ecosystem | n/a | No official AG-UI Rust SDK. crates.io has community alphas only (`ag-ui` 0.5.0-alpha.3, 561 downloads; `ag-ui-protocol` 0.1.0; `agui-rs-client` 0.1.3). We'd own the types. | n/a |
| A2UI | `a2ui_flutter` (Dart `MessageProcessor`) | **Still Dart.** The renderer needs `a2ui_core` in Dart, so activity content must cross FFI again. | `a2ui_flutter` |
| Delta vs (a), Flutter + web | – | about +20 to +35 days (Rust types and reducer, frb stream API, wasm-bindgen packaging, web re-integration and re-running the web gates), minus about 6–13 days of Dart port saved | Saves 1–2 days of decoding; costs more in workarounds |

**Should the reducer move to Rust and be shared with web through WASM? Not now.**

- The report's own finding is that "the reducer was the easy part": ~700 lines of pure, table-driven logic.
- Moving it buys one copy of that easy part. In return it costs:
  - re-opening an adopted decision;
  - a WASM boundary on the hottest web path;
  - FFI churn on mobile;
  - owning a Rust AG-UI type layer with no upstream.
- The parity risk that sharing would remove is better removed by the shared corpus. The corpus already exists, is
  already the web acceptance suite, and the Dart runner is cheap (item 5).

**Revisit triggers:**

- A third client (for example a native desktop renderer outside the webview).
- AG-UI churn causing more than ~2 dual-maintenance days a month.
- UAR moving in-process on mobile (embedded mode). Then the stream already originates in Rust, and a Rust reducer
  becomes natural.

**Recommendation: (a).** The one deliberate Rust touch is persistence (§5.7), which reuses the shell's existing
FFI path (`gen-ui-db`, rusqlite 0.40.2) at boundary cadence only.

## 4. Target structure in `apps/mobile` (when activated)

This follows the shell's existing layering (`features/theme_mode/{domain,application,infrastructure,presentation}`).
Riverpod is 3.3.1 with `@riverpod` codegen (riverpod_generator 4.0.3), plus go_router 18.1.3.

```
lib/features/agent_session/
  domain/            # pure Dart: no Flutter, no http, no FFI
    agui_event.dart          # sealed union mirroring own/src/domain/agui-event.ts
    transcript_model.dart    # immutable state, mirrors transcript-model.ts
    transcript_reducer.dart  # + reducer_content.dart (split to stay < 500 lines)
    hitl_machine.dart        # 1:1 port of hitl-machine.ts
    json_patch.dart          # port of json-patch.ts (135 lines; avoids a 2025-11 single-maintainer dep)
    media_policy.dart
  application/
    ports.dart               # AgUiTransport, TranscriptStore, A2uiSurfaceHost, Scheduler, Announcer
    agent_session.dart       # use cases: submit, cancel, decide, sendA2uiAction; commit cadence
    live_text_buffer.dart    # throttled publish (see 5.4)
    run_input.dart
  infrastructure/
    sse_codec.dart           # SSE frame parser + JSON -> AgUiDomainEvent; protocol errors, never throws
    http_agui_transport.dart # POST, Last-Event-ID retry x3, per-run http.Client so cancel closes the socket
    ffi_transcript_store.dart# TranscriptStore over gen-ui-db (boundary/checkpoint commits)
    a2ui_surface_host.dart   # activity -> a2ui_core MessageProcessor; KM catalog; unknown shim
  presentation/
    providers/               # @riverpod: session, transcript selectors, per-message live text
    widgets/                 # transcript, message, tool call, approval card, composer, custom parts
    markdown/                # streaming markdown renderer (5.5)
    screens/agent_session_screen.dart
```

**Import boundaries:**

- `domain/` imports only `dart:core`, `dart:convert`, `dart:collection` and `meta`.
- `application/` imports `domain/` only.
- `infrastructure/` is the only place for `http`, `a2ui_*` and the FFI bridge.
- `presentation/` never imports `infrastructure/`. It is wired at the composition root.

These are enforced by an import-boundary check: a small Dart test that scans `import` directives, or
`custom_lint` if build-platform prefers one. Deliberately no `dart:io` in the domain.

## 5. Concern-by-concern design

### 5.1 HITL state machine parity

Port `hitl-machine.ts` verbatim as Dart sealed states:

- **States:** `pending`, `approved`, `rejected`, `cancelled`, `expired`, `failed`.
- **Commands:** approve, reject, abandon, expire, resume-failed.
- **Rules to keep:**
  - The first accepted decision emits the only effect (idempotent).
  - A decision at or after `expiresAt` becomes an expiry.
  - A `resolved` resume is never sent after expiry.
  - `failed` behaves like `pending`.
  - The tool-call status is derived through `toolStatusFor`.

`AgentSession` keeps `decisionsInFlight`, refuses decisions while a run streams, and arms one `Timer` per open
interrupt. On app resume it re-checks expiry against wall-clock time, because a `Timer` does not fire while iOS
suspends the app.

**Tests:**

- O's 8 node tests become Dart table tests with the same cases.
- `hitl-approve`, `hitl-reject` and `hitl-expire` run in the corpus runner (5.10). The live tier asserts the
  server's `resumeEntries`, `requestCount` and `noResolvedResumeAfterExpiry`.

### 5.2 Transport, reconnect and replay

- Each run gets its own `http.Client` (`http` 1.6.0). `cancel()` closes that client, so the socket really closes
  and the harness's `clientAborted` becomes true. This fixes the `ag_ui` limitation.
- On a network error before `RUN_FINISHED` or `RUN_ERROR`, it re-POSTs the same body with `Last-Event-ID`, up to 3
  times with jittered backoff. Proven by the probe.
- **Mobile extras:**
  1. On `AppLifecycleState.resumed`, an unsettled run reconnects with its last id.
  2. On a connectivity change it does the same; this doesn't need a plugin, the socket error triggers it.
  3. A `409` maps to `TRANSPORT_FAILED` with no retry.
- `cupertino_http` / `cronet_http` are an optional later swap for HTTP/2 and system proxy behaviour, behind the
  same port.
- **Server dependency (not ours):** AG-UI 1.0 defines no resume transport. `Last-Event-ID` replay is a harness
  extension, so the production agent endpoint must implement the same replay window. That is a request to
  livekit-agents / architect, and is listed as risk R1.

### 5.3 Custom chunks

The `classifyCustom` context stays in the domain, with schemas ported from `custom-chunks.ts`. The renderer
registry is in `presentation/`:

| Chunk | Renders as |
|---|---|
| `km.citation` | Superscript marker; tap opens the source sheet. |
| `km.media` | See 5.6. |
| `km.mermaid` | See 5.5. |
| Unknown `km.*` | A neutral fallback, reported as `fallback`. |
| `RAW` | Never rendered. |

### 5.4 Streaming performance (mirrors O's boundary commits)

The reducer applies every delta in memory. Rendering and storage are throttled separately:

- **Rendering:** the `LiveTextBuffer` publishes through `SchedulerBinding.scheduleFrameCallback`, throttled by
  `publishIntervalMs(len) = min(250, 16 + len/400)`.
  - It also has a `Timer` fallback, because frame callbacks stop when the app is backgrounded. This is the Flutter
    form of web gate 1 (don't rely only on rAF).
  - Each streaming message listens to its own `ValueListenable<String>`, so one delta rebuilds one message widget,
    not the transcript.
  - Durable state goes through a Riverpod `Notifier` exposed as selectors.
- **Storage:** commits happen only at boundaries, plus 1 s checkpoints.
- **Target**, measured on a mid-range Android phone and an iPhone in profile mode, on `long-markdown`:
  - transcript-level rebuilds ≤ 200;
  - no frame over 16 ms in steady state;
  - p95 build+raster under 8 ms.

### 5.5 Markdown, math, Mermaid and safe SVG

Package choices were verified on pub.dev on 2026-11-10:

| Need | Choice | Why, and how it is hardened |
|---|---|---|
| Markdown parse | **`markdown` 7.3.1** (`tools.dart.dev`, 2026-03-18), GFM extension set | The canonical Dart parser. We build the widget tree ourselves, so links, images, HTML and tables are under our control. |
| Markdown widgets | **Own builder** over the AST (≈ 600–800 lines across files) | `flutter_markdown` is **discontinued** (0.7.7+1). `flutter_markdown_plus` 1.0.12 (foresightmobile.com) is its fork and is the fallback if the builder slips. `gpt_markdown` 1.4.1 (useval.io) needs Flutter ≥ 3.44 and fetches images itself, which is too little policy control. |
| Streaming | Block memoisation like Streamdown: completed top-level blocks are cached by source hash; only the tail block is re-parsed per publish. Unclosed fences, tables, links and math render as text. | Covers the `stream-*` hostile items and long-markdown cost. |
| Raw HTML | Never rendered: HTML nodes become their literal text. | `xss-*` items. |
| Links | Only `http`, `https` and `mailto`. Opened with `url_launcher` 6.3.3 after a scheme check; everything else is plain text. | `link-*` items. |
| Math | **`flutter_math_fork` 0.7.4** (simpleclub.com, 2025-05-21). Pure Dart TeX, with no HTML output and no `\href` execution path. Set `maxExpand` low; errors fall back to the source text. | `katex-*` items. Its last release was 18 months ago (risk R6). |
| Mermaid | **`flutter_mermaid` 0.1.0** (pure Dart, no WebView, no JS, so `click`/`init` directives can't execute). Supports flowchart, sequence, pie, gantt, timeline and others. Unsupported or invalid diagrams fall back to a code block. | It has a single release and an unverified publisher, so wrap it behind a `DiagramRenderer` port. The fallback design is to ask the agent for server-rendered sanitised SVG (risk R5). **No WebView Mermaid.** |
| Raw SVG | **`flutter_svg` 2.3.2** (flutter.dev) via `SvgPicture.string`, after a Dart pre-sanitiser strips `script`, `foreignObject`, `on*`, external `href`/`xlink:href` and `image` with non-`data:` URLs. | flutter_svg doesn't run scripts. The sanitiser removes the external-reference cases (`svg-*` items). |
| Code | Monospace token style first. Syntax highlighting is deferred: `flutter_highlight` dates from 2021 and `re_highlight` is 0.0.3. | – |
| Huge tables | Horizontal scroll with lazily built rows above N rows. | `hostile/huge-table`. |

### 5.6 Media

A domain `media_policy.dart` (a port of O's) checks the origin allowlist before any widget is built:

- **Images:** `Image.network` only for allowlisted origins.
- **Video and audio:** `video_player` 2.14.1 (already pulled in by `a2ui_flutter`). No autoplay, with explicit
  controls.
- **Everything else:** a "Media blocked" placeholder that makes no request.

The same policy feeds the A2UI catalog wrapper (results.md), so there is one allowlist for both.

### 5.7 Persistence (store of record on mobile)

- The `TranscriptStore` port is the same as O's: `commit(state, reason)` and `projectSharedState`.
- **Adapter:** a JSON checkpoint per thread plus a normalised message, tool-call and interrupt table, through the
  existing flutter_rust_bridge path into `gen-ui-db` (rusqlite, bundled).
  - The Rust schema and API change belongs to the architect, and goes to them as a request.
  - Commit cadence is boundaries plus 1 s checkpoints (O measured 8 commits for long-markdown), so FFI cost is
    negligible.
- **Hydration on launch:**
  - Pending interrupts are restored with their `expiresAt`.
  - An unsettled run is shown as interrupted-by-transport, with a "Resume stream" action that reconnects with the
    stored last id while the server window still holds it.
  - A resume is idempotent: `decisionsInFlight` is persisted.
- **Restart tests mirror web gate 2:** kill mid-stream, pending interrupt, expired interrupt, double resume.
- **Fallback** if the FFI schema work is late: `drift` 2.35.4 behind the same port.

### 5.8 A2UI

- Use `a2ui_flutter` 0.2.0 and `a2ui_core` 0.6.0, pinned exactly.
- Wrap the Know Meet catalog: ids, media policy, `KmFallback`, and the unknown-component shim until upstream
  #2013 lands.
- `A2uiSurfaceHost.sync(state)` feeds `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` content (`a2ui_operations`, already
  JSON-patched by our reducer) into one `MessageProcessor` per surface.
- Actions return as a new run with `forwardedProps.a2uiAction.userAction`. This is already proven live in 15.4.
- **Open behaviours to align with web once observed:**
  - disabled vs click-and-show validation;
  - error timing;
  - the Modal trigger emitting its action.
- shadcn-styled builders from tokens are the largest A2UI item. Effort figures come from results.md §6.

### 5.9 Accessibility

| Web contract §6 | Flutter equivalent |
|---|---|
| Streaming text not in a live region | Streaming message `Semantics(liveRegion: false)`; its text is excluded from announcements. |
| One polite live region, at most about one announcement per second, final summary ≤ 300 chars | The `Announcer` port has a platform adapter. **iOS:** `SemanticsService.sendAnnouncement(View.of(ctx), …)`, because `announce` is deprecated since 3.35. **Android:** a single offscreen `Semantics(liveRegion: true)` node whose label is updated, because Android has deprecated announcement events and the Flutter docs say so. Check `MediaQuery.supportsAnnounceOf`. Throttling logic is ported from `announcer.ts`. |
| `aria-busy` while streaming | The transcript semantics label includes "Responding…"; no announcement per delta. |
| Approval card reachable, with native buttons, Enter/Space, and focus never stolen or dropped | `FilledButton` / `OutlinedButton` with explicit `Semantics(button: true, label: 'Approve …')`. No auto-focus on new cards. After a decision, focus moves to the card's status text via a `FocusNode`. Hardware keyboard Enter/Space is tested with `sendKeyEvent`. |
| Run error `role=alert` | `Semantics(liveRegion: true)` error banner plus an announcement on iOS. |
| axe | `meetsGuideline(androidTapTargetGuideline)`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline` and `textContrastGuideline` in widget tests, plus one real VoiceOver and TalkBack pass per release. |

### 5.10 Testing (goldens against the harness corpus)

There are three tiers. Only the live tier needs the server, and it is tagged off the per-change path.

1. **Corpus conformance, pure Dart.** This is the parity backbone.
   - A runner loads `harness/corpus/ag-ui/scenarios/*.json` (sha-checked against `manifest.json`) and feeds each
     run's items through `sse_codec` and the reducer.
   - It applies the scenario's `interactions` (approve, reject, wait for expiry, cancel after N characters) through
     `AgentSession` with fake ports.
   - It compares the final `TranscriptState` with the same `expected` block the web suite uses (`expected.ts`
     semantics: `textEquals`, statuses, tool args, interrupts, protocol-error count).
   - It covers all 14 scenarios in under 2 s.
2. **Live harness, `@Tags(['harness'])`.**
   - Covers the 14 AG-UI scenarios, plus the 8 A2UI surfaces already done in 15.4, through
     `HttpAgUiTransport` against `pnpm serve`.
   - It asserts the server session summary: request count, resume entries, `resumedWithLastEventId`,
     `clientAborted`, 0 unmatched and 0 invalid.
   - This generalises the probe.
3. **Goldens and hostile.**
   - **Settled-state goldens** at phone 390×844 and tablet 1024×1366, in light and dark, with pinned fonts
     (Space Grotesk, Inter, JetBrains Mono from `assets/fonts`) and the pinned CI image (build-platform). They
     cover these states:
     - mid-stream, at a frozen publish;
     - settled long-markdown, first viewport;
     - pending, approved, rejected and expired approval cards;
     - run error;
     - cancelled;
     - custom chunks;
     - an A2UI surface in a message.
   - **Hostile corpus:** the 44 `hostile-corpus.json` items run through the markdown renderer in widget tests.
     They assert:
     - no forbidden widget types;
     - no non-allowlisted URL in an `HttpOverrides`-captured request log;
     - raw text preserved;
     - finalize time within the item's budget.
     Goldens cover a representative 8 items.

Following `.claude/rules/flutter.md`, completion evidence is the live tier plus an integration test on a simulator
or device. Unit and golden tests alone are not completion evidence.

## 6. Work items and estimates

These are for one Flutter engineer, in engineer-days (low / likely / high). They assume the web behaviours in 5.8
are settled and the server implements `Last-Event-ID` replay.

| # | Item | Low | Likely | High |
|---|---|---|---|---|
| 1 | Domain: AG-UI event union and validation (sealed classes), media policy | 2 | 3 | 4 |
| 2 | Reducer, reducer-content and JSON Patch port | 2 | 3 | 5 |
| 3 | HITL machine, `AgentSession` use cases, expiry timers, lifecycle handling | 2 | 3 | 4 |
| 4 | Infrastructure: SSE codec, POST transport, `Last-Event-ID` retry, true abort, resume-on-foreground | 2 | 3 | 5 |
| 5 | Corpus conformance runner (tier 1) and live harness tier (tier 2) | 2 | 3 | 4 |
| 6 | `LiveTextBuffer`, Riverpod providers, scoped rebuilds, profile-mode measurement | 1.5 | 2 | 3 |
| 7 | Transcript UI: messages, tool calls, approval cards, composer, cancel, errors; phone/tablet layouts from tokens | 4 | 6 | 8 |
| 8 | Streaming markdown renderer (own builder, block memo, links, tables, code) | 5 | 7 | 10 |
| 9 | Math, Mermaid (port and fallback), SVG sanitiser, media widgets | 4 | 6 | 9 |
| 10 | Custom-chunk registry and citation sheet | 1 | 2 | 3 |
| 11 | Hostile corpus suite on Flutter (44 items) and fixes it finds | 3 | 4 | 6 |
| 12 | A2UI: promote the catalog wrapper, shadcn-styled builders, validation UX, A2UI a11y, activity → processor glue (from results.md §6, minus the transport already counted in items 2–4) | 10.5 | 13 | 16 |
| 13 | Persistence: `TranscriptStore` FFI adapter, hydration, restart tests (Dart side; Rust schema by architect) | 3 | 5 | 8 |
| 14 | Accessibility: announcer adapters, focus, tap targets, real VoiceOver/TalkBack pass | 3 | 4 | 6 |
| 15 | Goldens: phone/tablet × light/dark for the states in 5.10, pinned fonts and CI image | 3 | 4 | 6 |
| 16 | Import-boundary lint and test tags for CI (with build-platform) | 0.5 | 1 | 2 |
| | **Total** | **48.5** | **69** | **99** |

That is about 10, 14 and 20 engineer-weeks.

**Upkeep:**

- `a2ui_flutter`/`a2ui_core` re-pin and re-run: about 0.5 day per release. They are alpha, and the last two minors
  broke.
- AG-UI protocol tracking in two reducers: about 0.5–1 day per AG-UI minor release.
- `flutter_mermaid` / `flutter_math_fork` watch: about 1 day per quarter.

**Not included:**

- server-side replay (R1);
- the Rust `gen-ui-db` schema and API (architect);
- the shadcn-to-Flutter component mapping decisions (design-lead);
- the LiveKit realtime adapter, which is a separate phase.

**Sensitivity:**

- Item 12 swings by ±3 days with the web validation behaviour.
- Item 8 drops by about 3 days if `flutter_markdown_plus` passes the hostile suite unmodified. That is worth a
  one-day probe before item 8 starts.

**Suggested order:**

1. Items 1–5 first. This is the domain and transport, proven by the corpus.
2. Then 6, 7 and 13. Value slice: chat with HITL and resume after relaunch.
3. Then 8–11. Rich, safe content.
4. Then 12. A2UI.
5. Items 14 and 15 run alongside each slice.

Every slice needs its OpenSpec change and adopted Gherkin value scenario from the delivery-lead before building.

## 7. Risks

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | The production agent endpoint has no `Last-Event-ID` replay. AG-UI 1.0 has no resume transport, and the harness implements it as an extension. | Medium / High: mobile networks drop more than desktop, and iOS suspends sockets | Request to livekit-agents and architect to specify a replay window (for example a 5 min event journal per run). The client falls back to a `MESSAGES_SNAPSHOT` refetch. |
| R2 | Two reducers drift (TS and Dart). | Medium / Medium | The shared corpus is the acceptance suite for both. A new AG-UI event or rule lands in the corpus first, and CI fails either side until both match. |
| R3 | `a2ui_flutter` alpha churn: two breaking minors in a row, no fallback hook (#2013), Material-only components. | High / Medium | Exact pins, the catalog wrapper and shim, and the 15.4 parity suite re-run on every bump. |
| R4 | Mobile background and foreground lifecycle: timers paused, sockets killed, frame callbacks stopped. | High / Medium | Wall-clock expiry re-check, resume-on-foreground reconnect, a `Timer` fallback for publishing, and lifecycle cases in the integration test. |
| R5 | `flutter_mermaid` is immature: single release, unverified publisher, partial syntax. | High / Low | It sits behind a port with a code-block fallback; server-rendered SVG is the backup. No WebView. |
| R6 | `flutter_math_fork` is stale (last release 2025-05) against future Flutter breaking changes. | Medium / Low | Pin it, run a smoke golden on each Flutter upgrade, and fork if needed: it's pure Dart. |
| R7 | Accessibility differs by platform (Android announcement deprecation, iOS-only `sendAnnouncement`). | Medium / Medium | Platform `Announcer` adapters, plus a real TalkBack and VoiceOver pass per release, not just guideline matchers. |
| R8 | Durable store split: entity-graph on web, `gen-ui-db` on mobile. Two persistence shapes for one transcript model. | Medium / Medium | Both sit behind the same `TranscriptStore` port semantics (boundary commits). Hydration tests run from the same corpus states. Cross-device sync is out of scope here (CRDT meeting memory is separate). |
| R9 | The template invariant ("agent and network logic in Rust") is not followed for the transport. | Low / Low | Deliberate and documented. Revisit if UAR goes embedded on mobile (§3 triggers). |
| R10 | Estimate risk: the markdown builder and A2UI shadcn builders dominate the high case. | Medium / Medium | Do the one-day `flutter_markdown_plus` hostile probe first. Settle the A2UI validation behaviours on web before item 12. |

## 8. Requests to other roles (not done here)

- **architect:**
  - a `gen-ui-db` transcript checkpoint table and API through `gen-ui-ffi`;
  - confirm R9;
  - decide whether the AG-UI domain union lives in `packages/contracts`, which doesn't exist yet, so Dart and TS
    share one source.
- **livekit-agents / architect:** R1, the replay window on the production AG-UI endpoint.
- **design-lead:** the Flutter mapping for shadcn AI Elements patterns and the A2UI basic components (item 12).
- **build-platform:**
  - the pinned CI image and fonts for goldens;
  - the `harness` test tag off the per-change path;
  - the import-boundary check.
- **delivery-lead:** OpenSpec changes and value scenarios for the slices in §6.
