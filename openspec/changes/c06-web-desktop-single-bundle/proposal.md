## Why

The generator duplicates the web app for desktop; Goal 2 requires one bundle powering both.

## What Changes

- apps/web as the only React app, mapped onto domain/application/infrastructure/presentation
- apps/desktop src-tauri with frontendDist → apps/web/dist and isTauri() guards
- Token CSS, self-hosted fonts and CSP

## Capabilities

### New Capabilities

- `web-desktop-shell`: Desktop runs the web bundle

### Modified Capabilities

- None

## Impact

- Owner role: `client-shell` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
