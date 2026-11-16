## Why

The web app has no realtime client. The `RealtimeRoom` port from wr02 needs an implementation over LiveKit.

## What Changes

- `packages/realtime`: `RealtimeRoom` over `livekit-client` with connect, track subscription, mute, device selection, reconnection and typed errors
- An HTTP `TokenIssuer` adapter in the web app's infrastructure layer and the composition wiring

## Capabilities

### New Capabilities

- `realtime-room`: The adapter joins a real room and reports its state through the port

### Modified Capabilities

- None

## Impact

- Owner roles: `webrtc-engineer`, `client-shell`. The same bundle runs in the Tauri webview; desktop is not verified in this phase.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
