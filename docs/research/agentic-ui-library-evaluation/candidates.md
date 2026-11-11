# Candidates

All versions and dates come from the npm registry, pub.dev or the GitHub API, accessed on
2026-11-09. GitHub stars and contributor counts come from `gh api` the same day. Contributor
counts include anonymous contributors. Open-issue counts are GitHub's `open_issues_count`,
which also counts pull requests.

Sources are in [sources.md](sources.md), referenced as [S#].

---

## 1. Build our own on Prometheus entity-graph (first-class candidate)

**What is already installed in `apps/web`:** `@prometheus-ags/entity-graph-core` and
`@prometheus-ags/entity-graph-react` 4.3.0 (MIT) [S40].

- **Dependencies.** Core depends only on `immer` and `zustand`. `@ag-ui/core`, `loro-crdt`
  and `@tauri-apps/plugin-sql` are optional peers.
- **Current use.** `apps/web/src/infrastructure/entities/register-note-entities.ts` registers
  `Note` and `Capability` transports through `registerEntityTransport`.

**Relevant capabilities, read from the installed `dist/index.d.ts` and README [S40]:**

- **AG-UI state bridge.**
  - `applyAgUiSnapshot(event, { mappings })` and `applyAgUiDelta(event, options)` ingest
    STATE_SNAPSHOT and STATE_DELTA (RFC-6902, through `applyJsonPatch`).
  - An `AgUiStateMapping` projects JSON-pointer slices onto entity types.
  - Writes go through the configured MergeStrategy.
  - The bridge takes plain event objects. It "does not depend on `@ag-ui/client`".
- **Store writes.** `upsertEntity` and `patchEntity`, plus `createGraphTransaction`,
  `createGraphAction` and `createGraphEffect`.
- **Time travel and snapshots.** `restoreGraphSnapshot`, `stepTimeTravel`.
- **Local-first persistence.** `createTauriSqlPersistenceAdapter`,
  `createPGlitePersistenceAdapter`, `hydrateGraphFromStorage`.
- **Collaboration.** Loro CRDT merge strategy.
- **Realtime adapters** with microtask burst coalescing (`coalesceBurstThreshold`): WebSocket,
  Supabase, Surreal live, Electric, GraphQL subscriptions, Flint.
- **React hooks:** `useEntity`, `useEntities`, `useEntityList`, `useEntityView`,
  `useEntityMutation`, `useLocalFirst`, `useSuspenseEntity`, `useGraphSyncStatus`.
- **Markdown helper.** `renderMarkdownToHtml` exists, but it is a non-streaming utility and
  not a chat renderer.

**What is missing and would have to be built:**

- Ingesting message, run and tool-call lifecycle events: RUN_STARTED/FINISHED/ERROR,
  TEXT_MESSAGE_START/CONTENT/END, TOOL_CALL_START/ARGS/END/RESULT, REASONING_*,
  MESSAGES_SNAPSHOT, ACTIVITY_SNAPSHOT/DELTA, CUSTOM.
- Turning these into `Thread`, `Run`, `Message`, `MessagePart`, `ToolCall`, `A2uiSurface`
  and `Interrupt` entities.
- No such reducer exists in the installed package. Grepping `dist/*.mjs` for these event
  names returns 0 matches.

**Proposed composition:**

| Layer | Choice |
| --- | --- |
| Transport | `@ag-ui/client` `HttpAgent` (rxjs) or a hand-written SSE reader |
| Types | `@ag-ui/core` (zero dependencies) |
| Reducer | Our own code in the infrastructure layer, writing entities |
| State | entity-graph (store of record, persistence, CRDT) |
| Presentation | shadcn AI Elements patterns, copied in |
| Markdown | Streamdown + plugins |
| Generative UI | `@a2ui/react` with our own catalog mapped to shadcn components |

This keeps clean-architecture boundaries. Only the presentation layer imports UI libraries,
and the AG-UI wire types stay in infrastructure.

**Effort:** about 7 to 10 engineer-weeks; the breakdown is in the [README](README.md).

**Risks:**

- **Per-token write cost.** Pushing every streamed token through immer and zustand has not
  been benchmarked.
- **Spec drift.** AG-UI has added ACTIVITY and REASONING events during 2026.
- **Edge cases already solved elsewhere.** Reconnect and replay, thread switching, tool
  deferral and history rehydration are all solved inside assistant-ui. We would have to
  rediscover them.
- **Ongoing ownership.** We own the accessibility and keyboard behaviour of every pattern.

**Flutter counterpart:** `a2ui_flutter` 0.1.0 + `a2ui_core` 0.5.0 render the same A2UI
surfaces, and `ag_ui` 0.3.0 is the community Dart AG-UI SDK. Whether entity-graph has a
Dart/Flutter port is **Unknown**: we did not check the Flint Dart SDK.

---

## 2. assistant-ui

**Package facts:**

- `@assistant-ui/react` **0.15.33**, released 2026-11-08, MIT. First published 2024-05-07;
  462 published versions [S1].
- Adapters, all released 2026-11-08 unless noted:
  - `react-ag-ui` 0.1.2 (69 versions since 2025-11-19)
  - `react-ai-sdk` 1.4.22
  - `react-langgraph` 0.14.39
  - `react-markdown` 0.14.25
  - `react-generative-ui` 0.1.8
  - `react-streamdown` 0.3.21, released 2026-10-28
- Repo `assistant-ui/assistant-ui`: 13,026 stars, 208 contributors, 49 open issues, active
  daily [S2].
- Monorepo packages include `react-a2a`, `react-google-adk`, `react-langchain`, `vue`,
  `svelte`, `react-native` and `safe-content-frame`.
- Dependencies of `@assistant-ui/react` [S1]:
  - `zustand`, `radix-ui`, `zod` 4
  - `assistant-cloud` and `assistant-stream`
  - `@assistant-ui/{core,store,tap}`
  - `safe-content-frame`, `react-textarea-autosize`
- Peer dependency: React `^18 || ^19`.

**AG-UI (R1):**

- `packages/react-ag-ui/src` handles RUN_STARTED/FINISHED/ERROR, TEXT_MESSAGE_*,
  TOOL_CALL_START/ARGS/END/RESULT, STATE_SNAPSHOT/DELTA, MESSAGES_SNAPSHOT,
  ACTIVITY_SNAPSHOT/DELTA, REASONING_*, STEP_*, RAW and CUSTOM [S3].
- `event-parser.ts` maps CUSTOM to `{type:"CUSTOM", name, value}`.
- There are test files for approval, history, queue, state, thread-switch, tool deferral
  and voice.

**A2UI (R2):**

- `@assistant-ui/generative-ui/a2ui` converts A2UI surfaces into its own `present`
  tool-call parts, rendered by its own `JSONGenerativeUI` [S3].
- Version strings in that code: v0.9, v0.9.1, v1.0.
- AG-UI ACTIVITY snapshots of type `a2ui-surface` are consumed and rehydrated from history.
  Actions go back to the agent as `forwardedProps.a2uiAction` (CHANGELOG PRs #5345, #5352,
  #5386, #8876) [S3].
- It does **not** use Google's `@a2ui/react`.

**Custom parts (R3):** `makeAssistantDataUI` / `useAssistantDataUI` render `data-*` parts.
CUSTOM events are parsed. Unrendered activities are kept as `agui-activity/<type>` data
parts [S3].

**Markdown (R4):**

- `react-streamdown` depends on `streamdown` ^2.7.1, `rehype-harden`, `rehype-sanitize`,
  `rehype-raw` and `remend`.
- Its optional peers are `@streamdown/{code,math,mermaid,cjk}`.
- Coverage is therefore the same as Streamdown's (see section 4).

**Lock-in (R10):**

- No backend is required. Runtimes exist for AG-UI, AI SDK, LangGraph, A2A and an external
  store.
- But thread and message state lives in assistant-ui's runtime.
- `useExternalStoreRuntime` lets you supply `messages`, `isRunning`, `onNew`, `onEdit`,
  `onReload`, `onCancel`, `onAddToolResult`, `onResumeToolCall`, `convertMessage` and
  `setMessages` from your own store [S3].
- The AG-UI adapter has its own controller (`AgUiThreadController`), so you cannot use
  `react-ag-ui` **and** keep entity-graph as the store of record without forking or
  mirroring.

**Bundle:** Bundlephobia reports `@assistant-ui/react` 0.15.33 at 907,878 B minified and
272,393 B gzip for the full package with its dependencies, not tree-shaken [S41].

**Flutter:** none found. A `react-native` package exists.

**Status in Know Meet:** assistant-ui was the tentative choice, but **no `@assistant-ui/*`
package is currently in any `package.json`** in the know-meet repo (checked 2026-11-09).

---

## 3. shadcn/ui AI Elements (the new Vercel-side release)

**What it is:**

- Patterns for agentic interfaces, copied into the project. There is no package [S10].
- Announced in the shadcn changelog "October 2026 - Trace, Code Block and AI Elements" on
  **2026-10-14**, according to the RSS feed [S11].
- 21 patterns: Chain of Thought, Chat, Checkpoint, Confirmation, Context, File Tree, Inline
  Citation, Message, Model Selector, Plan, Prompt Input, Queue, Reasoning, Sources, Stack
  Trace, Subagent, Suggestion, Task, Terminal, Test Results and Tool.
- Each pattern is available for Base UI, React Aria and Radix.
- Built on the base components Trace, Code Block, Message, Message Scroller, Bubble, Marker,
  Attachment and Questionnaire.

**Supporting packages:**

- `@shadcn/react` 0.3.1 (2026-08-31): headless Message Scroller and Questionnaire.
- `@shadcn/helpers` 0.3.0 (2026-10-16): AI SDK and TanStack AI mocks, including
  human-in-the-loop `needsApproval` [S12].

**Data model:**

- Every pattern page shows rendering from **AI SDK message parts**.
- Trace "works with the reasoning, tool and source parts from the AI SDK".
- The Message pattern says to render markdown with **Streamdown** [S10].
- The chatbot template is Next.js + AI SDK, but the patterns themselves are plain React.
- `ui.shadcn.com/llms.txt` contains 0 mentions of AG-UI or A2UI [S12].

**Fit:** the best possible token fit, because it is our own design system and Know Meet
already has the base components.

**Lock-in:** none at the code level, since the code is copied in. The examples assume AI SDK
`UIMessage` parts, so with AG-UI we would write the mapping ourselves.

**Accessibility:** the changelog says Trace has "Keyboard and screen reader support from the
trigger that wraps each line". The Message pattern uses `aria-pressed` on feedback toggles
[S10][S11]. Whether streaming announcements use a live region is **Unknown**.

**Flutter:** none.

**Maturity:** shadcn-ui/ui has 127,706 stars and 650 contributors. The AI Elements patterns
are about 4 weeks old.

## 4. Vercel AI SDK Elements (being deprecated)

**Status:** `ai-elements` CLI 1.9.1, released 2026-10-14, Apache-2.0 on npm [S5].

- The README warns: "AI Elements is moving to shadcn/ui. This project will be deprecated at
  the end of November 2026" [S6].
- Release 1.9.0 (2026-03-12) added JSXPreview, a screenshot prompt action and conversation
  download [S7].

**Fit:**

- Prerequisites are "Next.js project with AI SDK installed" and shadcn in CSS-variables
  mode.
- The code is copied in, so it would still run under Vite, but it is tied to AI SDK.

**Repo:** 2,511 stars, 62 contributors, 125 open issues.

**Verdict:** do not adopt; it is superseded by section 3.

## 5. Streamdown (piece: markdown)

**Package facts:**

- `streamdown` 2.7.1 (2026-10-19), Apache-2.0, peers React 18 or 19 [S8].
- Plugins: `@streamdown/math` 1.0.3, `@streamdown/mermaid` 1.0.3, `@streamdown/code` 2.0.0
  (Shiki), `@streamdown/cjk` 1.0.4, and `remend` 1.4.0 for repairing unterminated blocks
  (all released 2026-09-30).
- Repo `vercel/streamdown`: 5,751 stars, 105 contributors.

**Features (README and docs [S9]):**

- A drop-in replacement for react-markdown.
- GFM, KaTeX math, Mermaid (interactive SVG with download), and Shiki code highlighting.
- Handles unterminated blocks while streaming. Animation, carets and memoization are
  supported.
- Custom renderers can be registered per code-fence language (examples: Vega-Lite, D2).
- Uses shadcn CSS variables, and requires a Tailwind 4 `@source` line for each installed
  package.

**Security:**

- The default rehype plugins are `rehype-sanitize` (GitHub schema) and `rehype-harden`
  (`allowedImagePrefixes`, `allowedLinkPrefixes`, `defaultOrigin`).
- The docs explicitly warn about prompt-injection data exfiltration through images, and
  recommend restricting image origins and setting `allowDataImages: false`.
- Raw inline `<svg>`, `<video>` and `<audio>` are not in the documented default allow-list.
  Supporting them needs a schema extension or a custom fence renderer, sanitized with
  DOMPurify 3.4.17.

**Verdict:** adopt as the markdown piece.

**Flutter:** none. Use `flutter_markdown` or similar; not evaluated.

## 6. Google A2UI official renderers (piece: generative UI)

**Repo:** `a2ui-project/a2ui`. The old `google/A2UI` URL redirects. Apache-2.0, 17,024
stars, 105 contributors [S13].

**Specification:** `specification/versions.json` lists v1.0 as current, v0.9.1 and v0.9 as
previous, and v0.8 as deprecated.

**Web packages:**

- `@a2ui/react` 0.15.0, `@a2ui/lit` 0.15.0 and `@a2ui/web_core` 0.15.0, all released
  2026-11-02. `@a2ui/angular` 0.14.0.
- The React README says it "renders A2UI v0.9, v0.9.1 and v1.0 surfaces from the same
  package". The MessageProcessor accepts v0.8 to v1.0.
- Custom catalogs and functions are supported [S14].

**Roadmap status [S13]:**

| Item | Status |
| --- | --- |
| Web core, Lit, Angular and React renderers | Stable |
| Flutter, SwiftUI and Jetpack Compose renderers | Alpha |
| ShadCN (React) catalog | Proposed |
| Transports: A2A, AG-UI ("day-zero compatibility"), REST, WebSockets, MCP | Complete |

**Dependencies:**

- `@a2ui/react` depends on `@a2ui/web_core`, `markdown-it`, `@a2ui/markdown-it`, `clsx` and
  `zod` 3.
- `@a2ui/web_core` depends on `lit`, `@lit/context`, `@preact/signals-core`, `zod` 3,
  `zod-to-json-schema`, `redos-detector` and `validate-color`.
- There are **no @copilotkit dependencies**. npm maintainers include `a2ui-owners@google.com`.

**Flutter:**

- `a2ui_flutter` 0.1.0 and `a2ui_core` 0.5.0, both released 2026-11-04 [S15].
- The README says: "`a2ui_flutter` ... replaces the `genui` package".
- `genui` 0.10.4 (2026-09-29) and `genui_a2ui` 0.7.0 (2026-02-07) are the older Flutter
  path.

**Verdict:** adopt `@a2ui/react` as the A2UI piece, with our own shadcn-mapped catalog.

## 7. AG-UI protocol packages (piece: protocol)

**Package facts:**

- `@ag-ui/core` and `@ag-ui/client` 1.0.4, released 2026-11-05, MIT [S16].
- Repo `ag-ui-protocol/ag-ui`: 17,078 stars, 190 contributors, 564 open issues.
- `@ag-ui/core` has **no dependencies**.
- `@ag-ui/client` depends on `rxjs` 7.8.1, `uuid`, `fast-json-patch`, `untruncate-json`,
  `compare-versions` and `@ag-ui/{core,proto,encoder}`. There are **no @copilotkit
  dependencies**.

**Governance:** the npm maintainers are `copilotkit <devops@copilotkit.ai>` and `_mme`. The
GitHub org `ag-ui-protocol` lists no description [S16]. The docs' integration page lists
CopilotKit as the frontend integration [S17].

**Flutter:** `ag_ui` 0.3.0 (2026-06-24), a community Dart SDK in the ag-ui repo [S15].

**Verdict:** adopt `@ag-ui/core` for types. `@ag-ui/client` is optional.

## 8. CopilotKit (contrast only, not ranked)

**Package facts:**

- `@copilotkit/react-core` and `@copilotkit/react-ui` 1.85.0, released 2026-11-06, MIT.
  Repo: 38,580 stars, 286 contributors [S18].
- `react-core` dependencies include:
  - `@ag-ui/client` and `@ag-ui/core`, **pinned at 1.0.2**
  - `@a2ui/web_core` 0.15.0 and `@copilotkit/a2ui-renderer`
  - `@copilotkit/core`, `shared` and `web-inspector`
  - `streamdown` ^1.3.0 (one major version behind) and `react-markdown` ^8
  - `katex`, `recharts`, `lit`, `rxjs`
  - `@scarf/scarf` (install telemetry)

**A2UI:** `@copilotkit/a2ui-renderer` 1.85.0 wraps `@a2ui/web_core` 0.15.0. Its `dist` only
references `v0_9` [S19].

**Lock-in evidence:**

- Production use goes through the **Copilot Runtime** (a Node server).
- Connecting directly to an AG-UI agent uses the `agents__unsafe_dev_only` prop, which the
  docs say is "**not recommended for production** and not officially supported" [S20].

**Why it is excluded:** it pins its own protocol versions, needs its runtime server, and has
its own styles (`@copilotkit/react-core/v2/styles.css`). This is the lock-in the operator
asked us to avoid.

**Flutter:** none found on pub.dev.

## 9. OpenUI (Thesys; formerly Crayon / C1)

**Package facts:**

- Repo `thesysdev/openui`; `thesysdev/crayon` redirects there. MIT, 15,017 stars, 54
  contributors [S21].
- `@openuidev/react-ui` and `react-headless` 0.18.5 (2026-11-06).
- `@openuidev/lang-core` 1.1.0 (2026-11-04).
- `@openuidev/a2ui` 0.5.0 (2026-10-12) is described as an "A2UI v1.0 protocol client with
  optional React renderer", using OpenUI Lang component payloads.
- `@openuidev/langchain` streams OpenUI through AG-UI.
- Older packages:
  - `@crayonai/react-ui`: last release 0.9.16 on 2026-02-03.
  - `@thesysai/genui-sdk` 0.10.3 (2026-07-01): licence "see LICENSE.md" (C1 is a commercial
    API).

**Lock-in:**

- Its core value is the **OpenUI Lang** DSL, a second generative UI format next to A2UI.
- An optional cloud observability sink ships events to Thesys.

**Verdict:** credible but competing. Not ranked.

## 10. Tambo

**Package facts:** `@tambo-ai/react` 1.4.0 (2026-10-08), MIT. Repo: 11,225 stars, 61
contributors [S22].

**Shutdown:** the README says "**Tambo Cloud is shutting down.** ... until October 31, 2026
... The team is now building Charming". Self-hosting is through Docker.

**Coupling:**

- It runs its own agent loop.
- It depends on `@ag-ui/core` **^0.0.57**, a pre-1.0 version.
- It depends on `@tanstack/react-query` and the MCP SDK.

**Verdict:** rejected because of abandonment risk.

## 11. Hashbrown

**Package facts:** `@hashbrownai/react` and `@hashbrownai/core` 0.8.3 (2026-10-26), MIT on
npm. GitHub shows the licence as NOASSERTION. 731 stars, 21 contributors [S23].

**What it is:** a headless framework for React and Angular. Its server adapter "maps an
AG-UI run to your provider's SDK and streams AG-UI events back".

**Coupling:** it brings its own Skillet schema language and its own runtime, which overlaps
with entity-graph.

**Verdict:** not ranked. It is small and pre-1.0.

## 12. json-render (Vercel Labs)

**Package facts:** `@json-render/core`, `react` and `shadcn` 0.22.0 (2026-11-04),
Apache-2.0. 19,497 stars, 24 contributors [S24].

**What it is:** a catalog-constrained generative UI renderer. Targets include React, React
Native, Vue, Svelte, PDF, email and video.

**Protocols:**

- The A2UI page is labelled "Concept... examples are illustrative" and uses v0.8-style
  `surfaceUpdate`.
- An AG-UI docs page exists, but **how deep its support goes is Unknown**.

**Recent release:** Chat SDK streaming cards via `@json-render/chat` [S25].

**Verdict:** it is an alternative to A2UI, not an A2UI renderer. Not ranked.

## 13. prompt-kit

**Facts:** a shadcn registry (`npx shadcn add prompt-kit/[component]`) with no npm package.
MIT, 3,148 stars, 13 contributors, last push 2026-09-28 [S26].

**Protocols:** the README does not mention AG-UI or A2UI.

**Verdict:** superseded for us by shadcn AI Elements.

## 14. LlamaIndex chat-ui

**Facts:** `@llamaindex/chat-ui` 0.6.1, last release 2025-08-28. **The GitHub repo is
archived** [S27]. It used shadcn and Tailwind 4, highlight.js and KaTeX.

**Verdict:** rejected.

## 15. NLUX

**Facts:** `@nlux/react` 2.17.1, last release **2024-08-15** [S28]. The licence is
MPL-2.0 "with restriction", with paragraphs 3.6 and 3.7 added.

**Verdict:** rejected as stale, with an unusual licence.

## 16. deep-chat

**Facts:** `deep-chat` and `deep-chat-react` 2.5.1 (2026-08-27), MIT, 3,743 stars, 17
contributors [S29].

**What it is:** a web component with its own styling API. Markdown uses `remarkable`, with an
optional KaTeX plugin.

**Fit and protocols:** it does not fit shadcn. AG-UI and A2UI support are **Unknown**; none
is mentioned in the README.

**Verdict:** rejected.

## 17. Kibo UI

**Facts:** the repo is now `shadcnblocks/kibo`. MIT, 3,981 stars, last push 2026-05-04
[S30]. `@kibo-ui/ai` does not exist on npm.

**Unknowns:** whether the registry still ships AI blocks. Neither the README nor npm shows
them.

**Verdict:** not ranked.

## 18. Other Vercel pieces checked

- `ai` 7.0.166 and `@ai-sdk/react` 4.0.170, both released 2026-11-09 [S31].
- The Chat SDK is the `chat` npm package, 4.44.0 [S31].
- Using AI SDK would mean adopting its `UIMessage` stream protocol instead of AG-UI. We do
  not recommend it as Know Meet's wire format, because the backend speaks AG-UI.
