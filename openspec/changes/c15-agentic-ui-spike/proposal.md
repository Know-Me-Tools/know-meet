## Why

The agentic-UI evaluation (`docs/research/agentic-ui-library-evaluation/`) and its cross-model adversarial
review (MiniMax-M3 critic, Kimi k3.1-pro judge, both REVISE) disagree with an own-built core. The operator
chose "hybrid plus spike" on 2026-11-09: adopt the hybrid as the working direction and let measured
prototypes decide before any agentic-UI dependency enters the product.

## What changes

- Two time-boxed vertical prototypes under `spikes/agentic-ui/` (outside the pnpm workspace and product tree):
  - **H (hybrid):** assistant-ui AG-UI runtime behind a Know Meet presentation port; entity-graph as the
    durable store via idempotent checkpoints or a replayable AG-UI event journal; Streamdown; shadcn AI
    Elements patterns.
  - **O (own):** own AG-UI reducer (`@ag-ui/core` types) on `@prometheus-ags/entity-graph`; Streamdown;
    shadcn AI Elements patterns.
- A shared harness both prototypes must pass: AG-UI golden event corpus with a mock SSE endpoint,
  A2UI golden surfaces, hostile markdown and media corpus, streaming accessibility checks, measurement.
- A2UI web/Flutter parity run (`@a2ui/react` vs `a2ui_flutter`) on the same surfaces.
- A comparison report, a cross-model adversarial review, and an operator decision.

## Out of scope

No agentic-UI dependency in `apps/` or `packages/` until the operator decides. CopilotKit is excluded.

## Impact

Unblocks c08 task 8.3 and the agentic surfaces in c11. Spike builds and runs are an operator-approved,
spike-scoped exception to VLBV; product code still follows VLBV.
