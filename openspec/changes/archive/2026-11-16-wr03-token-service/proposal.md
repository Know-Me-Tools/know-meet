## Why

Clients must receive short-lived LiveKit tokens from a server that holds the API secret. The only token server in the repo is frozen prototype code. With guests only, the endpoint is public and spends LiveKit Cloud minutes, so it must bound abuse.

## What Changes

- New Axum crate `services/livekit`, a workspace member, configured from the environment only
- Endpoints to create a room code, issue a token for a code the service generated, and report health
- Per-client rate limit keyed on the forwarded client address, `Origin` check, participant cap and empty-room timeout
- Service documentation

## Capabilities

### New Capabilities

- `token-service`: Tokens are scoped, short-lived and issued only for service-generated rooms

### Modified Capabilities

- None

## Impact

- Owner role: `livekit-platform`. Security review by a separate reviewer at the boundary. New dependency pins needed from the operator.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
