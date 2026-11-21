## Why

The free version records in the browser without LiveKit Egress, and principle 4 requires consent before capture.

## What Changes

- Composite recorder: canvas plus AudioContext mix into MediaRecorder, MP4 preferred, WebM fallback
- OPFS writer worker with `createSyncAccessHandle`, `storage.persist()` and a clean stop on quota
- Consent over the reserved topic; indicator for everyone; late joiner per D2
- Recordings library with playback and download

## Capabilities

### New Capabilities

- `local-recording`: Recording requires consent and stays on the device

### Modified Capabilities

- None

## Impact

- Owner roles: client-shell, ui-engineer.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
