## Why

The package generator rejects rgba, has no clamp handling, hardcodes fonts, skips missing directories silently and emits no web, shadcn or ThemeData output.

## What Changes

- Unmodified vendored copy under `packages/design-tokens/generator/vendor/`
- Extension modules (≤500 lines each) for the tokens.json adapter, rgba, clamp, fonts and loud failures
- Outputs: web CSS variables, shadcn mapping, Tailwind 4 @theme, Dart tokens and ThemeData

## Capabilities

### New Capabilities

- `design-token-generation`: One token edit propagates everywhere

### Modified Capabilities

- None

## Impact

- Owner role: `design-lead` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
