## Why

The extended port needs a LiveKit implementation, and the 225-line adapter must become a feature directory before it grows past the 500-line limit.

## What Changes

- Split `livekit-realtime-room.ts` into a feature directory
- Screen share with `setScreenShareEnabled`
- Text streams with one chat topic constant and one reserved consent topic; `registerTextStreamHandler` for receive
- Devices through `switchActiveDevice`; output gated on `setSinkId`; `startAudio` for playback
- Processor hook reapplied after a device switch

## Capabilities

### New Capabilities

- `realtime-conferencing`: The LiveKit adapter implements the conferencing port

### Modified Capabilities

- None

## Impact

- Owner roles: webrtc-engineer.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
