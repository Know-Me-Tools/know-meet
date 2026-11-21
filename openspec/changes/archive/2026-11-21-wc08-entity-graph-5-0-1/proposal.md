## Why

The operator decided Know Meet pins entity graph 5.0.1 from npm, superseding the commit pin. Local history is built on it.

## What Changes

- Stop unless `npm view` shows `latest: 5.0.1` for core and react
- Pin 5.0.1 in `tooling/versions.toml`, `apps/web` and both spikes; both spikes already pin `@ag-ui/core` 1.0.4, inside 5.x's `^1.0.0` peer range
- Clean install refreshes the lockfile

## Capabilities

### New Capabilities

- `entity-graph-dependency`: Entity graph resolves to 5.0.1

### Modified Capabilities

- None

## Impact

- Owner roles: build-platform, client-shell, architect, ui-engineer.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
