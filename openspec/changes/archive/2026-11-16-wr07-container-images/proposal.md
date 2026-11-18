## Why

Nothing in the repo can be run on a cluster. The release needs two images and a pipeline that publishes them with immutable tags.

## What Changes

- `apps/web/Dockerfile`: the hosted bundle on `static-web-server` with page fallback, non-root
- `services/livekit/Dockerfile`: multi-stage build, non-root; an artifact scan for secrets
- A workflow that builds and pushes both images to GHCR tagged by commit SHA and records digests
- A local compose stack that mirrors the route split for the packaged run; repo rules extended to Dockerfile, YAML and shell

## Capabilities

### New Capabilities

- `container-images`: Each image runs non-root and contains no secret

### Modified Capabilities

- None

## Impact

- Owner roles: `client-shell`, `livekit-platform`, `build-platform`. The operator makes the two GHCR packages public.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
