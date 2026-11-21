## Why

Participants want to blur or replace their background; @livekit/track-processors 0.8.3 provides it if its assets are self-hosted.

## What Changes

- Self-host tasks-vision 0.10.14 WASM and a pinned segmenter model; override every remote default
- Remove the library's blob: worker through an option or `pnpm patch` if possible, otherwise record why
- `BackgroundProcessor` behind the processor hook, gated by `supportsBackgroundProcessors()`
- Effects picker: off, blur, image

## Capabilities

### New Capabilities

- `background-effects`: Participants blur or replace their background

### Modified Capabilities

- None

## Impact

- Owner roles: client-shell, webrtc-engineer, ui-engineer.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
