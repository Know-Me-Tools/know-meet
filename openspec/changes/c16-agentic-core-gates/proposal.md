## Why

The operator adopted prototype O (own AG-UI core on entity-graph) on 2026-11-10, conditional on the seven gates in
`spikes/agentic-ui/report.md`. The cross-model review found the spike functionally tied and asked for these
checks before product code builds on O.

## What changes

Seven gates, each with evidence under `spikes/agentic-ui/`; H stays the fallback if O misses them.

## Impact

Unblocks c08/8.3 and the agentic surfaces in c11 once gates 1–5 pass. Gate 2 changes the
prometheus-entity-management repo (cross-team).
