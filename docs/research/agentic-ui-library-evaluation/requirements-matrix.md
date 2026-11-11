# Requirements matrix

## How to read this

**Scale:**

| Score | Meaning |
| --- | --- |
| **3** | Native or official, with evidence |
| **2** | Possible through an official extension point, or partial |
| **1** | Only by building it ourselves on top |
| **0** | Not supported, or blocking |
| **?** | Unknown: no primary evidence found |

**Columns:**

- **Own+pieces**: build our own on entity-graph, with `@ag-ui/core`, Streamdown,
  `@a2ui/react` and shadcn AI Elements patterns.
- **AUI full**: assistant-ui with its runtimes.
- **AUI headless**: assistant-ui through `useExternalStoreRuntime`, fed from entity-graph.
- **shadcn AIE**: shadcn/ui AI Elements patterns on their own.
- **CopilotKit**: shown for contrast only, not ranked.

Evidence references (S#) point to [sources.md](sources.md). Details are in
[candidates.md](candidates.md).

## Summary scores

| Req | Own+pieces | AUI full | AUI headless | shadcn AIE | AI SDK Elements | CopilotKit (contrast) | OpenUI | Tambo | json-render |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 AG-UI | 2 | 3 | 1 | 1 | 0 | 3 | 2 | 2 | ? |
| R2 A2UI | 3 | 3 | 1 | 0 | 0 | 2 | 3 | ? | 1 |
| R3 Custom parts | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | 2 |
| R4 Markdown | 3 | 3 | 3 | 3 | 3 | 2 | ? | ? | 0 |
| R5 Tools / HITL / gen UI | 2 | 3 | 2 | 2 | 2 | 3 | 3 | 3 | 2 |
| R6 shadcn / tokens | 3 | 2 | 3 | 3 | 3 | 1 | 1 | ? | 2 |
| R7 React 19 / Vite / Tauri | 3 | 3 | 3 | 3 | 2 | 2 | ? | ? | 3 |
| R8 Maturity | 2 | 3 | 3 | 2 | 0 | 3 | 2 | 0 | 2 |
| R9 Accessibility | 1 | 2 | 2 | 2 | ? | ? | ? | ? | ? |
| R10 Low lock-in | 3 | 2 | 2 | 3 | 1 | 0 | 1 | 0 | 2 |
| **Total (of 30)** | **25** | **27** | **23** | **21** | **13** | (21) | (17+?) | (≤12) | (≤15) |

### Why the higher total does not decide it

assistant-ui full scores the most points. We still rank it second, because the scores do not
capture the architectural constraint: Know Meet's store of record is entity-graph.

assistant-ui's AG-UI runtime keeps its own thread state. That means either two sources of
truth, or forking `react-ag-ui`. Own+pieces loses points mainly on R1 and R5 (we write the
reducer and the HITL flow ourselves) and on R9 (we own accessibility). All of those are work
we can do. The duplicate-state problem is structural.

---

## R1: AG-UI endpoints

**Own+pieces (2)**

- entity-graph-core 4.3.0 has `applyAgUiSnapshot` and `applyAgUiDelta` for STATE_* events
  [S40].
- The message, tool and run reducer is still to be written. A grep shows 0 lifecycle event
  names in the installed `dist`.
- `@ag-ui/core` 1.0.4 provides typed events with no dependencies [S16].

**AUI full (3)**

- `react-ag-ui` handles RUN_*, TEXT_MESSAGE_*, TOOL_CALL_*, STATE_*, MESSAGES_SNAPSHOT,
  ACTIVITY_*, REASONING_*, STEP_*, RAW and CUSTOM [S3].

**AUI headless (1)**

- We write the reducer ourselves, then feed `messages` into `useExternalStoreRuntime`.

**shadcn AIE (1)**

- The patterns are AI SDK-part oriented and have no AG-UI support [S10][S12].

**AI SDK Elements (0)**

- It requires AI SDK [S6].

**CopilotKit (3, contrast)**

- AG-UI is native, but pinned to `@ag-ui/*` 1.0.2.
- Running without the Copilot Runtime is "unsafe_dev_only" [S18][S20].

**OpenUI (2)**

- `@openuidev/langchain` streams through AG-UI [S21].

**Tambo (2)**

- Depends on `@ag-ui/core` ^0.0.57, a pre-1.0 version [S22].

**json-render (?)**

- A docs page exists, but how deep the support goes was not verified [S24].

## R2: A2UI rendering

**Own+pieces (3)**

- `@a2ui/react` 0.15.0 is the official renderer and handles v0.9, v0.9.1 and v1.0 (current).
  The processor accepts v0.8 [S14].
- Catalogs are custom. The official shadcn catalog is only "Proposed" [S13].

**AUI full (3)**

- Has its own A2UI converter for v0.9, v0.9.1 and v1.0. It handles action round-trip and
  history rehydration [S3].

**AUI headless (1)**

- Possible only if we also use `@assistant-ui/generative-ui/a2ui`. Otherwise we fall back to
  `@a2ui/react`.

**shadcn AIE (0)**

- No A2UI support.

**CopilotKit (2)**

- Wraps `@a2ui/web_core` 0.15.0. Its dist references only v0_9 [S19].

**OpenUI (3)**

- `@openuidev/a2ui` 0.5.0 targets v1.0, but uses OpenUI Lang component payloads [S21].

**json-render (1)**

- The A2UI page is marked "Concept... illustrative" and uses v0.8 shapes [S24].

**Flutter**

- `a2ui_flutter` 0.1.0 is alpha and replaces genui [S13][S15].

## R3: Custom chunks and part renderers

**Own+pieces (3)**

- We define a `MessagePart` entity with a discriminated `kind`. CUSTOM events and `data-*`
  parts map to a renderer registry.

**AUI full and AUI headless (3)**

- `makeAssistantDataUI` / `useAssistantDataUI`.
- CUSTOM is parsed to `{name, value}`.
- Unrendered activities are kept as `agui-activity/<type>` data parts [S3].

**shadcn AIE (2)**

- You switch on AI SDK part types yourself [S10].

**AI SDK Elements (2)**

- Same as shadcn AIE.

**CopilotKit (3)**

- `useAgent().agent.subscribe` gives access to raw events [S20].

## R4: Markdown streaming

**Streamdown 2.7.1 (used by Own+pieces, AUI and shadcn AIE) [S8][S9]:**

| Feature | Status |
| --- | --- |
| GFM | Yes |
| KaTeX math | Yes (`@streamdown/math`) |
| Mermaid | Yes (`@streamdown/mermaid`) |
| Shiki code highlighting | Yes (`@streamdown/code`) |
| Images | Yes, with origin allow-list (`rehype-harden`) |
| Sanitization | `rehype-sanitize` with GitHub schema |
| Incomplete-markdown repair | Yes (`remend`) |
| Raw `<svg>`, `<video>`, `<audio>` | **Not in the default allow-list**. Needs a custom fence renderer or schema extension. DOMPurify 3.4.17 is available. |

**Scores:**

- **Own+pieces (3):** Streamdown, with our own SVG and media renderers.
- **AUI full (3):** uses Streamdown through `react-streamdown` [S3].
- **CopilotKit (2):** pins `streamdown` ^1.3.0 and `react-markdown` ^8, an older line [S18].
- **json-render (0):** not a markdown renderer.

## R5: Tool-call UI, human-in-the-loop, generative UI

**Own+pieces (2)**

- The shadcn Tool, Confirmation and Questionnaire patterns exist [S10].
- We would wire approval through AG-UI ourselves: TOOL_CALL_* events, then the tool result
  or a resume in the next run.

**AUI full (3)**

- Approval tests exist, and `onResumeToolCall` / `onAddToolResult` are in place [S3].

**shadcn AIE (2)**

- Has a Confirmation pattern.
- `@shadcn/helpers` mocks AI SDK `needsApproval` [S12].

**CopilotKit (3, contrast)**

- Full support, but through its runtime.

**OpenUI and Tambo (3)**

- Generative UI is the core of both products.

## R6: shadcn, Tailwind 4 and our tokens

**Own+pieces (3)**

- Copied-in shadcn patterns.
- Streamdown uses shadcn CSS variables and needs a Tailwind 4 `@source` line [S9].
- The A2UI catalog is ours.

**AUI full (2)**

- The shadcn-styled UI is copied in through its CLI and registry.
- But runtime behaviour and some markup come from the package.
- Its dependency is `radix-ui`, while Know Meet uses Base UI (`base-nova`) [S1]. That is a
  mismatch with our Base UI primitives.

**AUI headless (3)**

- Only the primitives come from assistant-ui; the visuals are ours. The radix dependency is
  still pulled in.

**shadcn AIE (3)**

- Base UI variants exist [S10].

**CopilotKit (1)**

- Ships its own `styles.css` [S20].

**OpenUI (1)**

- Ships its own component library.

## R7: React 19, Vite, no Next.js lock-in, Tauri webview, bundle size

| Option | Score | Evidence |
| --- | --- | --- |
| Own+pieces | 3 | entity-graph peer: React `>=19 <20`. Streamdown and `@a2ui/react` peers: React 18 or 19. |
| AUI | 3 | Peer React 18 or 19. Separate `vite` package [S1][S3]. |
| shadcn AIE | 3 | Plain React. |
| AI SDK Elements | 2 | Its README requires Next.js [S6]. |
| CopilotKit | 2 | React works, but the examples assume a Node runtime. |

**Bundle size:**

- Only one figure is measured: `@assistant-ui/react` at 272,393 B gzip for the whole package
  [S41].
- Every other bundle size is **Unknown**, because Bundlephobia timed out.
- Lit and preact signals come along with `@a2ui/web_core`.

**Tauri webview:**

- No candidate documents Tauri problems. Compatibility is **Unknown** until we test it in
  WebKit (macOS) and WebView2.

## R8: Maturity

Verified on 2026-11-09. Stars and contributor counts come from the GitHub API.

| Package | Latest version (date) | Licence | Stars / contributors | Notes |
| --- | --- | --- | --- | --- |
| entity-graph-core/react | 4.3.0 | MIT | n/a (in-house) | We own it. AG-UI bridge is STATE-only. |
| @assistant-ui/react | 0.15.33 (2026-11-08) | MIT | 13,026 / 208 | Still 0.x; 462 versions. Under 0.x semver, minor bumps may break (not audited). |
| @assistant-ui/react-ag-ui | 0.1.2 (2026-11-08) | MIT | (same repo) | 69 versions in about 12 months. |
| streamdown | 2.7.1 (2026-10-19) | Apache-2.0 | 5,751 / 105 | Vercel. Major version 2. |
| @a2ui/react | 0.15.0 (2026-11-02) | Apache-2.0 | 17,024 / 105 | Google-led. Renderer marked "Stable". |
| a2ui_flutter | 0.1.0 (2026-11-04) | (repo Apache-2.0) | (same repo) | Alpha. |
| @ag-ui/core | 1.0.4 (2026-11-05) | MIT | 17,078 / 190 | Published by CopilotKit's npm account. |
| shadcn AI Elements | changelog 2026-10-14 | MIT | 127,706 / 650 | About 4 weeks old. |
| ai-elements | 1.9.1 (2026-10-14) | Apache-2.0 | 2,511 / 62 | **Deprecated end of Nov 2026.** |
| @copilotkit/react-core | 1.85.0 (2026-11-06) | MIT | 38,580 / 286 | Contrast only. |
| @openuidev/react-ui | 0.18.5 (2026-11-06) | MIT | 15,017 / 54 | Thesys. |
| @tambo-ai/react | 1.4.0 (2026-10-08) | MIT | 11,225 / 61 | Cloud shut down 2026-10-31. |
| @hashbrownai/react | 0.8.3 (2026-10-26) | MIT (npm) | 731 / 21 | |
| @json-render/react | 0.22.0 (2026-11-04) | Apache-2.0 | 19,497 / 24 | Vercel Labs. |
| deep-chat-react | 2.5.1 (2026-08-27) | MIT | 3,743 / 17 | |
| @llamaindex/chat-ui | 0.6.1 (2025-08-28) | MIT | 596 / 17 | **Archived.** |
| @nlux/react | 2.17.1 (2024-08-15) | MPL-2.0 (modified) | 1,387 / 13 | Stale. |
| prompt-kit | registry only | MIT | 3,148 / 13 | |

**Breaking-change history:**

- For assistant-ui, our only evidence is a code comment in `external-store-adapter.ts`
  ("TODO: remove parentId in 0.12.0"), plus the 0.x versioning.
- Detailed breaking-change counts per library are **Unknown**; we did not audit them.

## R9: Accessibility

**Own+pieces (1)**

- We own the work. The building blocks help:
  - shadcn Trace: "Keyboard and screen reader support from the trigger" [S11].
  - Questionnaire: keyboard shortcuts.
  - Message: `aria-pressed`.
- A live region for streaming has to be added by us. Whether Message Scroller has one is
  **Unknown**.

**AUI (2)**

- `aria-live="polite"` appears in 2 places in `packages/ui` React components [S3].
- A full audit is **Unknown**.

**All others (?)**

- Not verified.

## R10: Lock-in (backend and runtime coupling)

**Own+pieces (3)**

- Only open wire formats: AG-UI and A2UI.
- Every library is replaceable.
- Residual risk: AG-UI's governance is effectively CopilotKit's, and the A2UI spec is
  steered by Google.

**AUI (2)**

- No backend is required, but the runtime owns the state.
- It ships an `assistant-cloud` dependency even if we never use it [S1].

**shadcn AIE (3)**

- Copied-in code.

**AI SDK Elements (1)**

- Tied to AI SDK.

**CopilotKit (0)**

- Needs the Copilot Runtime in production [S20].

**OpenUI (1)**

- Built around the OpenUI Lang DSL and Thesys cloud observability.

**Tambo (0)**

- Its cloud has shut down.

**json-render (2)**

- Uses its own catalog/spec format.
