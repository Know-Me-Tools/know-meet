## Why

`tokens.json` does not match what the prototype renders (17 missing tokens, a conflicting `--text-display`, no weights or line heights), so no shell can match the design.

## What Changes

- Reconciled `docs/design/tokens.json` (both themes) from `docs/design/prototype/assets/km.css`
- Self-hosted OFL fonts in `packages/design-tokens/fonts`
- Machine-readable route/screen/state inventory and source hierarchy

## Capabilities

### New Capabilities

- `design-token-source`: Tokens are the single design source

### Modified Capabilities

- None

## Impact

- Owner role: `design-lead` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
