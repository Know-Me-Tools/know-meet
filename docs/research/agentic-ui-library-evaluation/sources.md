# Sources

All sources were accessed on **2026-11-09**.

- **npm data** comes from `npm view <pkg> version time license dependencies peerDependencies
  maintainers --json`.
- **GitHub data** comes from `gh api repos/<owner>/<repo>` (stars, open issues, licence,
  last push) and from the `contributors?per_page=1&anon=1` Link header (contributor count).
- **Code claims** come from shallow clones of each repo at its default branch on 2026-11-09.

## assistant-ui

**[S1] npm packages**

- https://www.npmjs.com/package/@assistant-ui/react (0.15.33, 2026-11-08T04:11:54Z, MIT,
  dependencies and peer dependencies)
- @assistant-ui/react-ag-ui 0.1.2
- @assistant-ui/react-ai-sdk 1.4.22
- @assistant-ui/react-langgraph 0.14.39
- @assistant-ui/react-markdown 0.14.25
- @assistant-ui/react-streamdown 0.3.21
- @assistant-ui/react-generative-ui 0.1.8
- Checked and not found: `@assistant-ui/react-a2ui`

**[S2] Repository**

- https://github.com/assistant-ui/assistant-ui (13,026 stars, 49 open issues, 208
  contributors)

**[S3] Code evidence from the clone of assistant-ui/assistant-ui**

- `packages/react-ag-ui/src/runtime/event-parser.ts`: event type strings, including the
  CUSTOM case.
- `packages/react-ag-ui/CHANGELOG.md`: PRs #5345, #5352, #5386, #8063, #8067, #8876 and
  #9078 (A2UI and activity handling).
- `packages/generative-ui/src/a2ui*`: A2UI version strings v0.9, v0.9.1 and v1.0.
- `packages/react-generative-ui/README.md`.
- `packages/core/src/runtimes/external-store/external-store-adapter.ts`: the
  ExternalStoreAdapter fields.
- `packages/react/src/index.ts`: `makeAssistantDataUI` and `useExternalStoreRuntime`
  exports.
- `packages/react-streamdown/package.json` and `packages/react-markdown/package.json`.
- `packages/ui/src/components/react/assistant-ui/elements/*`: `aria-live="polite"`
  occurrences.

## Vercel AI SDK Elements, Streamdown, AI SDK

**[S5] ai-elements on npm**

- https://www.npmjs.com/package/ai-elements (1.9.1, 2026-10-14T17:05:30Z, Apache-2.0)

**[S6] ai-elements repository**

- https://github.com/vercel/ai-elements: README deprecation warning; releases
  ai-elements@1.9.1 (2026-10-14) and 1.9.0 (2026-03-12); commit #519 "Add deprecation notice
  for move to shadcn/ui" (2026-10-14). 2,511 stars, 62 contributors.

**[S7] Vercel changelog entries**

- https://vercel.com/changelog/ai-elements-1-9
- https://vercel.com/changelog/ai-code-elements

**[S8] Streamdown on npm**

- https://www.npmjs.com/package/streamdown (2.7.1, 2026-10-19T09:14:40Z, Apache-2.0)
- @streamdown/math 1.0.3, @streamdown/mermaid 1.0.3, @streamdown/code 2.0.0,
  @streamdown/cjk 1.0.4, remend 1.4.0 (all released 2026-09-30)

**[S9] Streamdown repository and docs**

- https://github.com/vercel/streamdown: README, and
  `apps/website/content/docs/{security,custom-renderers,configuration,interactivity}.mdx`
  and `plugins/mermaid.mdx`
- https://streamdown.ai
- 5,751 stars, 105 contributors

## shadcn/ui AI Elements (the new release)

**[S10] Docs pages**

- https://ui.shadcn.com/docs/ai-elements: pattern list and the migration table from AI SDK
  Elements
- https://ui.shadcn.com/docs/ai-elements/base/message: recommends Streamdown and shows the
  AI SDK usage

**[S11] Changelog**

- https://ui.shadcn.com/docs/changelog and
  https://ui.shadcn.com/docs/changelog/2026-10-ai-elements
- https://ui.shadcn.com/rss.xml: "October 2026 - Trace, Code Block and AI Elements", pubDate
  Wed, 14 Oct 2026

**[S12] Supporting packages and llms.txt**

- @shadcn/react 0.3.1 (2026-08-31)
- @shadcn/helpers 0.3.0 (2026-10-16)
- shadcn 4.23.0 (2026-10-27)
- https://ui.shadcn.com/docs/changelog/2026-08-helpers-human-in-the-loop
- https://ui.shadcn.com/llms.txt (0 matches for "ag-ui" or "a2ui")

## A2UI (Google)

**[S13] Repository and roadmap**

- https://github.com/a2ui-project/a2ui (the old URL https://github.com/google/A2UI
  redirects): README, `specification/versions.json`, and `docs/public/roadmap.md` (renderer,
  transport and integration status tables)
- Apache-2.0, 17,024 stars, 105 contributors
- Python releases on 2026-11-02
- https://a2ui.org

**[S14] npm packages and React renderer README**

- @a2ui/react 0.15.0, @a2ui/lit 0.15.0, @a2ui/web_core 0.15.0 (all 2026-11-02);
  @a2ui/angular 0.14.0
- `typescript/renderers/react/README.md`: multi-version support statement

**[S15] Flutter and Dart (pub.dev API)**

- https://pub.dev/packages/a2ui_flutter (0.1.0, 2026-11-04)
- https://pub.dev/packages/a2ui_core (0.5.0, 2026-11-04)
- https://pub.dev/packages/genui (0.10.4, 2026-09-29)
- https://pub.dev/packages/genui_a2ui (0.7.0, 2026-02-07)
- https://pub.dev/packages/ag_ui (0.3.0, 2026-06-24)
- https://pub.dev/packages/flutter_ai_toolkit (1.0.0, 2025-12-15)
- https://github.com/flutter/genui (1,797 stars)

## AG-UI

**[S16] Protocol packages and organisation**

- @ag-ui/core, @ag-ui/client and @ag-ui/encoder 1.0.4 (2026-11-05), MIT. Dependencies and
  npm maintainers come from `npm view`.
- https://github.com/ag-ui-protocol/ag-ui (17,078 stars, 190 contributors, 564 open issues)
- `gh api orgs/ag-ui-protocol`

**[S17] Integrations page**

- https://docs.ag-ui.com/integrations

## CopilotKit (contrast)

**[S18] Packages and repository**

- @copilotkit/react-core and @copilotkit/react-ui 1.85.0 (2026-11-06): dependency list
- https://github.com/CopilotKit/CopilotKit (38,580 stars, 286 contributors)

**[S19] A2UI renderer package**

- @copilotkit/a2ui-renderer 1.85.0: tarball inspected with `npm pack`. Dependencies, and
  `dist` references to `v0_9` only.

**[S20] Docs**

- https://docs.copilotkit.ai/backend/copilot-runtime ("Connecting to an AG-UI agent
  directly": `agents__unsafe_dev_only`, "not recommended for production")
- https://docs.copilotkit.ai/backend/ag-ui
- https://docs.copilotkit.ai/generative-ui/a2ui

## Other candidates

**[S21] OpenUI / Thesys**

- https://github.com/thesysdev/openui (redirected from thesysdev/crayon). README package
  table.
- npm: @openuidev/react-ui 0.18.5, @openuidev/react-headless 0.18.5,
  @openuidev/lang-core 1.1.0, @openuidev/react-lang 1.1.0, @openuidev/a2ui 0.5.0,
  @crayonai/react-ui 0.9.16, @thesysai/genui-sdk 0.10.3

**[S22] Tambo**

- https://github.com/tambo-ai/tambo: README shutdown notice
- https://tambo.co/blog/posts/tambo-is-shutting-down (linked from the README; not fetched
  directly)
- npm @tambo-ai/react 1.4.0: dependencies

**[S23] Hashbrown**

- https://github.com/liveloveapp/hashbrown: README
- npm @hashbrownai/react and @hashbrownai/core 0.8.3

**[S24] json-render**

- https://github.com/vercel-labs/json-render: README, `apps/web/content/docs/a2ui.mdx` and
  `ag-ui.mdx`
- npm @json-render/core, react and shadcn 0.22.0 (2026-11-04)

**[S25] json-render for Chat SDK**

- https://vercel.com/changelog/json-render-and-chat-sdk-agents
- https://vercel.com/changelog

**[S26] prompt-kit**

- https://github.com/ibelick/prompt-kit: README
- `prompt-kit` is not on npm

**[S27] LlamaIndex chat-ui**

- https://github.com/run-llama/chat-ui (`archived: true`)
- npm @llamaindex/chat-ui 0.6.1 (2025-08-28)

**[S28] NLUX**

- https://github.com/nlkitai/nlux: README licence section
- npm @nlux/react 2.17.1 (2024-08-15), MPL-2.0

**[S29] deep-chat**

- https://github.com/OvidijusParsiunas/deep-chat
- npm deep-chat and deep-chat-react 2.5.1 (2026-08-27)

**[S30] Kibo UI**

- https://github.com/shadcnblocks/kibo (redirected from haydenbleasel/kibo)
- npm `@kibo-ui/ai` not found

**[S31] Vercel AI SDK and Chat SDK**

- npm ai 7.0.166 and @ai-sdk/react 4.0.170 (2026-11-09)
- npm `chat` 4.44.0 and `@chat-adapter/web` 4.44.0 (2026-11-02), from
  https://github.com/vercel/chat

## Know Meet internal

**[S40] Repo files and installed packages**

- `apps/web/package.json`: entity-graph-core/react 4.3.0, @shadcn/react 0.3.1, React 19.2.7,
  Tailwind 4.3.5, Tauri api 2.11.1. No @assistant-ui, @ag-ui or @a2ui packages.
- `apps/web/components.json`: style base-nova.
- `apps/web/src/infrastructure/entities/register-note-entities.ts`.
- `apps/web/node_modules/@prometheus-ags/entity-graph-core`: `package.json` (peer and
  optional dependency metadata), `README.md` ("AG-UI snapshot/delta ingestion and JSON
  Patch"), and `dist/index.d.ts` (`applyAgUiSnapshot`, `applyAgUiDelta`, `AgUiStateMapping`,
  `coalesceBurstThreshold`, `upsertEntity` and `patchEntity` in `graph-*.d.ts`).
- `apps/web/node_modules/@prometheus-ags/entity-graph-react/dist/index.d.ts`: hook list.

## Bundle size

**[S41] Bundlephobia**

- https://bundlephobia.com/api/size?package=@assistant-ui/react@0.15.33 (size 907,878 B,
  gzip 272,393 B)
- Later requests for the other packages timed out, and the process was killed. Those sizes
  are **Unknown**.

## Markdown pipeline package versions (npm)

| Package | Version | Released | Licence |
| --- | --- | --- | --- |
| react-markdown | 10.1.0 | 2025-03-07 | |
| rehype-sanitize | 6.0.0 | 2023-08-26 | |
| rehype-katex | 7.0.1 | 2024-08-19 | |
| remark-math | 6.0.0 | 2023-09-19 | |
| dompurify | 3.4.17 | 2026-10-12 | MPL-2.0 OR Apache-2.0 |
| mermaid | 12.3.0 | 2026-11-03 | |
| shiki | 4.6.0 | 2026-11-02 | |
