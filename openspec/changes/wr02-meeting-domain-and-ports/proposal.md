## Why

The team design puts realtime and token issuing behind ports so domain and application code never import LiveKit. Neither port exists.

## What Changes

- Room code, participant and connection-state types in `packages/domain`
- `RealtimeRoom` and `TokenIssuer` ports, start, join, leave and mute use cases, and in-memory fakes in `packages/application`
- Boundary lint extended to `packages/realtime` and `services/livekit`

## Capabilities

### New Capabilities

- `meeting-core`: Meeting use cases depend only on ports

### Modified Capabilities

- None

## Impact

- Owner roles: `architect`, `build-platform`.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
