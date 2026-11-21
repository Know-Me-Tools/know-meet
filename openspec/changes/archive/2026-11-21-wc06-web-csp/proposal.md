## Why

PGlite, MediaPipe, worker-based storage and local playback need WebAssembly, workers and blob media. The security review (ADOPT WITH CHANGES) requires the change on hosted output only.

## What Changes

- Add `'wasm-unsafe-eval'`, `worker-src 'self' blob:`, `media-src blob:` and `img-src blob:` only when `hosted === true`
- Unit test: `tauri.conf.json` csp equals the default policy; golden tests of the default policy
- wr-3 checks the header on worker `.js` and `.wasm` responses and `application/wasm`
- Regenerate `security-headers.yaml` and ship it with the image

## Capabilities

### New Capabilities

- `web-content-security-policy`: Hosted CSP allows the adopted sources only

### Modified Capabilities

- None

## Impact

- Owner roles: client-shell, bdd-quality, livekit-platform.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
