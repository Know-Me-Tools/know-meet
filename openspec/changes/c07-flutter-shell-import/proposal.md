## Why

The Flutter app must live in the workspace on the shared tokens with persisted theme mode.

## What Changes

- apps/mobile with flutter_rust_bridge kept
- Generated ThemeData light/dark, persisted theme mode
- Pinned riverpod, go_router, shared_preferences; flutter_lints

## Capabilities

### New Capabilities

- `mobile-shell`: Mobile uses generated theming

### Modified Capabilities

- None

## Impact

- Owner role: `mobile-engineer` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
