## Why

Home, join and the meeting room render sample data. They must drive the real use cases so two guests can meet.

## What Changes

- Home starts a meeting or joins by code
- Join lobby with display name, device preview and permission errors
- Meeting room with tiles, speaking state, mute, leave and not-found, permission-denied and disconnected states
- Impeccable `audit` and `polish` on the three screens; the existing Know Meet design is preserved

## Capabilities

### New Capabilities

- `guest-meeting`: A guest can start, join and leave a meeting

### Modified Capabilities

- None

## Impact

- Owner role: `ui-engineer`. Required skills: `impeccable`, `prometheus-ui-ux`, `vercel-react-best-practices`, `shadcn`.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
