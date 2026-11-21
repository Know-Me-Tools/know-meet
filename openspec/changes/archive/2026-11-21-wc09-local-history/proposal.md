## Why

The operator wants a client-only history of sessions and chats that never leaves the device.

## What Changes

- `HistoryRepository` port and history entities
- Vite `optimizeDeps.exclude` for PGlite and hashed same-origin emission of its WASM and data files
- PGlite 0.5.16 on `idb://` in a leader-elected same-origin worker; tables `meeting_session`, `chat_message`, `recording`
- Entity transports honouring `ListQuery`, with live queries; writes through `useEntityMutation`; no snapshot adapter
- History screen with a local-only notice and delete

## Capabilities

### New Capabilities

- `local-history`: Meetings and chats are kept on the device

### Modified Capabilities

- None

## Impact

- Owner roles: architect, client-shell, ui-engineer.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
