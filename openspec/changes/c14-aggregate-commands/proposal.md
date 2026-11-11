## Why

Goal 8 requires real build, test and lint commands across every surface once they exist.

## What Changes

- Root build/test/lint cover web, desktop, Rust/BFF and Flutter (including non-signing APK and iOS-simulator builds)
- project.json build_health_command, test_command, lint_command

## Capabilities

### New Capabilities

- `build-commands`: One command per concern covers every surface

### Modified Capabilities

- None

## Impact

- Owner role: `build-platform` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
