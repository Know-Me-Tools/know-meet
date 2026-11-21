## Why

`RealtimeRoom` knows only microphone and camera. Share, chat, devices, audio playback, video processing and recording consent need port operations that stay free of LiveKit.

## What Changes

- Domain types: chat message with audience, device descriptors, share state, consent states
- `RealtimeRoom` gains screen share, text with explicit audience, device list and switch (output included), audio playback status and start, and a video-processor hook; fakes updated
- The join use case carries the lobby's device choice into the room
- Recording consent use cases: request, answer, start, stop, late joiner (decision D2)

## Capabilities

### New Capabilities

- `conferencing-ports`: Conferencing operations are expressed through ports

### Modified Capabilities

- None

## Impact

- Owner roles: architect.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
