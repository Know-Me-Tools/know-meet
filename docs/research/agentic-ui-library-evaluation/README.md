# Agentic UI library evaluation (Know Meet)

Research date: 2026-11-09. Versions and dates were checked against the npm registry
(`npm view <pkg> version time --json`), pub.dev, and the GitHub API on that day. Every
claim is cited in [sources.md](sources.md). Where we found no evidence, we wrote **Unknown**
instead of guessing.

| File | Contents |
| --- | --- |
| [candidates.md](candidates.md) | One section per candidate: facts, protocol support, coupling, risks. Includes the "build our own on entity-graph" option and CopilotKit, which is listed for contrast only. |
| [requirements-matrix.md](requirements-matrix.md) | R1 to R10 scored for each candidate, with evidence. |
| [sources.md](sources.md) | Every URL and command we used, with the access date. |

## Scope changes applied

1. **CopilotKit is out as a dependency** because of ecosystem lock-in. It is described once
   for contrast and is not ranked.
2. **"Build our own on Prometheus entity-graph" is a first-class candidate.**
3. **Each library is ranked either as a piece** (markdown renderer, A2UI renderer, protocol
   types, headless primitives) **that sits under our own core, or as a full framework.**

## What Vercel "just released"

It is **AI Elements from shadcn/ui**. It was announced in the shadcn/ui changelog entry
"October 2026 - Trace, Code Block and AI Elements", dated **2026-10-14**:

- Docs: https://ui.shadcn.com/docs/ai-elements
- Repo: shadcn-ui/ui
- No npm package. Each pattern is code you copy into the project.
- It ships 21 patterns: Chat, Message, Prompt Input, Reasoning, Tool, Plan, Subagent,
  Confirmation, Queue, Sources and others.
- The patterns are built on new base components: Trace and Code Block (Oct 2026), plus
  Message, Message Scroller, Bubble, Marker, Attachment and Questionnaire (June to Aug 2026).
- Two supporting packages: `@shadcn/react` 0.3.1 (headless Message Scroller and
  Questionnaire, released 2026-08-31) and `@shadcn/helpers` 0.3.0 (AI SDK and TanStack AI
  mocks, including human-in-the-loop flows, released 2026-10-16).

It replaces Vercel's **AI SDK Elements**. The last release, `ai-elements` 1.9.1, came out on
2026-10-14 and was the deprecation release. Its README says: *"This project will be
deprecated at the end of November 2026 and replaced by AI Elements from shadcn/ui."*

Know Meet already has most of this new set. `apps/web` contains `message`,
`message-scroller`, `bubble`, `marker`, `attachment`, `trace`, `questionnaire` and
`code-block`, and depends on `@shadcn/react` 0.3.1.

A second Vercel release from the same period is related: **json-render** for Chat SDK
(`@json-render/*` 0.22.0, released 2026-11-04, from Vercel Labs). It streams generative UI
cards from a typed catalog.

Neither release speaks AG-UI or renders A2UI natively. Every shadcn AI Elements page shows
how to render AI SDK message parts. For json-render, the A2UI page is marked
"Concept... illustrative" and uses v0.8-style messages.

## Can we use AG-UI and A2UI without CopilotKit?

**Yes, for both.**

- **`@ag-ui/core` 1.0.4** (MIT, released 2026-11-05) has **no runtime dependencies**.
  - `@ag-ui/client` 1.0.4 depends on rxjs, uuid, fast-json-patch, untruncate-json,
    compare-versions and `@ag-ui/{core,proto,encoder}`. It pulls in **no `@copilotkit/*`
    packages**.
  - Governance caveat: the repo is the `ag-ui-protocol` GitHub org, but the npm maintainers
    are `copilotkit <devops@copilotkit.ai>` and one individual. In practice CopilotKit
    controls the protocol's releases.
- **`@a2ui/react` 0.15.0 and `@a2ui/web_core` 0.15.0** (Apache-2.0, released 2026-11-02)
  have no `@copilotkit/*` dependencies.
  - The npm maintainers include `a2ui-owners@google.com`.
  - The repo has moved from `google/A2UI` to the `a2ui-project/a2ui` org; the old URL
    redirects.
  - The React renderer handles **A2UI v0.9, v0.9.1 and v1.0**. v1.0 is the "current" spec
    in `specification/versions.json`.
  - Dependency cost: `@a2ui/web_core` pulls in `lit`, `@preact/signals-core` and **zod 3**
    (peer `zod ^3.25.76`). This may clash with zod 4 elsewhere in the monorepo.

## Recommendation

**Build our own core on `@prometheus-ags/entity-graph` and assemble the best pieces under
it.** Do not adopt a full chat framework.

```
AG-UI SSE ──> own AG-UI reducer (typed with @ag-ui/core) ──> entity-graph (Thread, Run,
Message, ToolCall, Reasoning, A2uiSurface, Interrupt entities) ──> shadcn AI Elements
patterns (copied in; base components already installed) ──> Streamdown + @streamdown/{math,
mermaid,code} for markdown ──> @a2ui/react with a custom catalog mapped to our shadcn
components (a2ui_flutter on mobile)
```

### Ranking (top 3 for this stack and these requirements)

| Rank | Option | Why |
| --- | --- | --- |
| **1** | **Build own on entity-graph, using these pieces:** `@ag-ui/core` types, Streamdown, `@a2ui/react` + `@a2ui/web_core`, shadcn AI Elements patterns | This is the only option where state lives in our own store. entity-graph 4.3.0 already exports `applyAgUiSnapshot`/`applyAgUiDelta` (STATE_SNAPSHOT/DELTA with RFC-6902 patch), merge strategies, Tauri SQL persistence and time travel. Every piece is MIT or Apache-2.0, React 19, Vite-friendly, and has no backend coupling. The same A2UI JSON renders on Flutter through `a2ui_flutter`. |
| 2 | **assistant-ui, full framework** (`@assistant-ui/react` 0.15.33 + `react-ag-ui` 0.1.2 + `react-streamdown`) | It is the most complete AG-UI client we found: it handles 24 event types including ACTIVITY_*, REASONING_*, MESSAGES_SNAPSHOT and CUSTOM, and renders A2UI v0.9 to v1.0 surfaces. But it owns thread and message state through its own runtime and store, so it duplicates entity-graph and fights it. |
| 3 | **assistant-ui as headless primitives only**, through `useExternalStoreRuntime` fed from entity-graph | This works because the adapter takes `messages`, `isRunning`, `onNew`, `onCancel`, `onAddToolResult` and `onResumeToolCall`. But it throws away the part of assistant-ui worth paying for, the AG-UI adapter. We would still write the AG-UI reducer ourselves, and would carry `assistant-cloud`, `zustand` and `radix-ui` as transitive deps. Bundlephobia reports about 272 KB gzip for the whole package (not tree-shaken). |

### Pieces worth adopting under our own core

| Piece | Package | Verdict |
| --- | --- | --- |
| Markdown | `streamdown` 2.7.1 + `@streamdown/math` 1.0.3, `mermaid` 1.0.3, `code` 2.0.0 | **Adopt.** It has GFM, KaTeX, Mermaid, Shiki, incomplete-markdown repair (`remend`), and rehype-sanitize + rehype-harden. shadcn's own Message pattern recommends it. Inline SVG, video and audio are **not** allowed by the default sanitize schema; we would add a custom code-fence renderer, for example a sanitized `svg` fence through DOMPurify. |
| A2UI web | `@a2ui/react` 0.15.0 | **Adopt with a custom catalog** that maps to our shadcn components. The roadmap lists the renderer as "Stable", and the official "ShadCN (React)" catalog is still "Proposed". |
| A2UI mobile | `a2ui_flutter` 0.1.0 + `a2ui_core` 0.5.0 | **Adopt, but it is alpha.** The A2UI README says it "replaces the `genui` package". |
| Protocol | `@ag-ui/core` 1.0.4 | **Adopt (types only).** For transport, use `@ag-ui/client`'s `HttpAgent` if rxjs is acceptable; otherwise write a small SSE reader. |
| Presentation | shadcn AI Elements patterns | **Adopt.** The code is copied in, so we own it, and it already uses our tokens. |
| Headless | `@shadcn/react` 0.3.1 | Already installed. |

### Libraries ruled out, and why

- **Vercel AI SDK Elements:** deprecated at the end of Nov 2026.
- **LlamaIndex chat-ui:** the GitHub repo is archived and the last npm release was 2025-08-28.
- **NLUX:** last release 2024-08-15, and it uses a modified MPL-2.0 licence.
- **Tambo:** Tambo Cloud shut down on 2026-10-31 and the team has moved to another product.
- **deep-chat:** a web component with its own styling, not shadcn.
- **prompt-kit:** an AI SDK-style registry with no AG-UI or A2UI support.
- **Kibo:** we found no AI package on npm.
- **OpenUI (Thesys, formerly Crayon) and Hashbrown:** credible, but each brings its own
  generative UI language or runtime that would compete with A2UI and entity-graph.

Details are in [candidates.md](candidates.md).

## Effort estimate for the recommended build

This is a rough estimate for one experienced engineer. "Parity" means the subset of
assistant-ui features we need.

| Work item | Estimate |
| --- | --- |
| AG-UI event reducer to entities (RUN_*, TEXT_MESSAGE_*, TOOL_CALL_*, REASONING_*, MESSAGES_SNAPSHOT, ACTIVITY_*, CUSTOM; STATE_* already exists), plus replay and disconnect tests | 2 to 3 weeks |
| Transport (SSE or `HttpAgent`), cancel, resume, thread switching | 3 to 5 days |
| Chat presentation from shadcn patterns (message list, composer, tool, reasoning, confirmation/HITL, attachments) | 1.5 to 2 weeks |
| Streamdown integration, security config, SVG and media renderers | 3 to 5 days |
| A2UI catalog mapped to shadcn, action round-trip to the agent, Flutter catalog parity | 1.5 to 2.5 weeks |
| Accessibility (live region for streaming, focus management, keyboard), persistence and history | 1 to 1.5 weeks |
| **Total** | **about 7 to 10 engineer-weeks** |

For comparison, assistant-ui gives a working AG-UI chat in days. Its own changelog shows
the work it took to get there: replay, disconnect, tool deferral, history rehydrate and
A2UI rebuild fixes across 69 `react-ag-ui` releases.

## The uncomfortable case against this recommendation

**We would be rebuilding, in about 2 months, what assistant-ui has hardened over 69
`react-ag-ui` releases. And the lock-in we are avoiding is mostly already at the protocol
layer.**

- **The AG-UI event surface is still moving.** ACTIVITY_*, REASONING_* and
  REASONING_ENCRYPTED_VALUE are all handled by assistant-ui but are not in the original
  event list in our brief. Our reducer will lag the spec.
- **The protocol is steered by CopilotKit.** AG-UI is published to npm by CopilotKit's
  account. Avoiding CopilotKit the library does not remove CopilotKit's influence on the
  protocol.
- **entity-graph is untested at token-stream rates.**
  - Its AG-UI bridge only covers STATE_SNAPSHOT/DELTA.
  - Writing every TEXT_MESSAGE_CONTENT delta through zustand + immer could cause re-render
    and GC pressure on long replies.
  - The realtime manager's `coalesceBurstThreshold` helps transports, not direct writes.
  - We have **no benchmark**. The likely mitigation is to buffer streaming text outside the
    graph and commit at TEXT_MESSAGE_END or on a throttle, which reintroduces a second state
    path.
- **`@a2ui/web_core` adds lit, preact signals and zod 3 to the web bundle.** Its official
  shadcn catalog is only "Proposed", so we own the catalog mapping indefinitely.

**Fallback if the build stalls:** use option 2 (assistant-ui with `react-ag-ui`) behind our
own presentation-layer port, and treat entity-graph as the store of record by mirroring
settled messages after each run. Keep the AG-UI and A2UI wire formats as the contract, so
we can switch from one option to the other without changing the backend.

## Biggest unknowns

1. How entity-graph performs under per-token writes. This needs a spike: 2,000-token reply,
   10 concurrent tool calls, measured in the Tauri WebKit webview.
2. Bundle sizes. Bundlephobia timed out for everything except `@assistant-ui/react`. We need
   to measure with a Vite build plus a visualizer.
3. The `@a2ui/web_core` zod 3 peer against our zod version, and how lit behaves inside React
   19 in Tauri.
4. Accessibility for most candidates, including whether Message Scroller has a live region.
   This needs an audit.
5. How mature `a2ui_flutter` 0.1.0 is (alpha), and catalog parity between the web and
   Flutter renderers.
