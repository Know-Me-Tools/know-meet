# Adversarial review of the agentic-UI evaluation

Reviewed 2026-11-09 through the liter-llm gateway. Neither reviewer produced the research.
Raw outputs: `.kbd-orchestrator/phases/hybrid-shell-foundation/review/agentic-ui/`.

| Reviewer | Model | Verdict | Agrees with research | Confidence |
|---|---|---|---|---|
| Critic | MiniMax-M3 | REVISE | No | 0.83 |
| Judge | Kimi k3.1-pro | REVISE | No | 0.84 |

## Where both reviewers agree

1. **The ranking's decisive claim is false.** "Own+pieces is the only option where state lives in our own
   store" is contradicted by the research's own rank 3 (assistant-ui fed from entity-graph through an
   external store). Clean architecture does not require entity-graph to own per-token live state.
2. **The matrix is scored asymmetrically.** Own+pieces got 3s for components that are designs, not code
   (part registry, SVG and media renderers, A2UI catalog, Tauri fit). Several totals don't reconcile.
3. **Both recommend the same alternative:** assistant-ui's AG-UI runtime as the live run/session state,
   behind a Know Meet presentation port; entity-graph as the durable canonical store, fed by idempotent
   checkpoints (message, tool and run boundaries) or a replayable AG-UI event journal; AG-UI and A2UI stay
   the only wire contracts; Streamdown plus the copied shadcn AI Elements patterns for presentation.
4. **Every option leaves the same hard requirements unproven:**
   - R4: Streamdown does not cover raw SVG, video or audio by default; Mermaid output sanitization is unshown.
   - R5: no human-in-the-loop state machine (pending, approved, rejected, expired, cancelled; idempotency;
     restart recovery; action authorization).
   - R9: no candidate has a streaming screen-reader audit.
   - R2: web and Flutter A2UI parity is unverified (Flutter renderer is alpha; shadcn catalog proposed).
   - R7: no Tauri WebKit/WebView2 runs, no tree-shaken Vite bundle numbers, lit and zod 3/4 unresolved.
5. **Evidence quality:** versions and dates cite mutable URLs; no tarball hashes or commit SHAs. Release
   counts and stars are not conformance evidence.

## Candidates the reviewers say were missed

Vercel Chat SDK; TanStack AI; `@ai-sdk/react` used internally behind an AG-UI adapter; json-render's AG-UI
path; `@a2ui/lit`; `flutter_ai_toolkit`; a react-markdown/remark/rehype fallback; reusing `@ag-ui/client`
or assistant-ui's MIT reducer under entity-graph.

## Gating work both reviewers require before standardizing

1. Two time-boxed vertical prototypes (assistant-ui runtime + entity-graph checkpoints vs own reducer on
   entity-graph) in a Vite app run inside Tauri on WebKit and WebView2, measuring latency, renders,
   memory and production bundle size.
2. A pinned AG-UI conformance harness (every event incl. CUSTOM, ordering, cancel, reconnect, replay).
3. An A2UI golden-surface corpus run through `@a2ui/react` and `a2ui_flutter`.
4. A hostile-markdown and media corpus (XSS, SVG, Mermaid output, incomplete streams, origin allowlists, CSP).
5. A streaming accessibility suite (throttled announcements, aria-busy, focus preservation, keyboard approvals).
6. Pinned versions with tarball integrity hashes and an SBOM/licence scan of the exact lockfile.
