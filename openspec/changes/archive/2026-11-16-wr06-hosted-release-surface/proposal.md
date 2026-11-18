## Why

Dashboard, agents, recordings, settings, notes and sign-in run on sample data. The operator decided they are left out of the hosted release so it does not imply features that do not exist.

## What Changes

- A hosted build mode whose router and navigation expose only home, join and the meeting room
- No stub sign-in entry point in hosted mode; every other path renders not-found
- `build:hosted` builds the web bundle alone and writes the CSP header value as a build artifact

## Capabilities

### New Capabilities

- `hosted-surface`: The hosted build exposes only working screens

### Modified Capabilities

- None

## Impact

- Owner role: `client-shell`.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
