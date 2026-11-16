## Why

Under VLBV the phase has one boundary run. It proves the adopted scenarios against the built images and then at the public URL, with cluster changes only after a second operator approval.

## What Changes

- Static gates and the artifact scan
- Packaged scenarios against the built images
- Accessibility run, independent UI review and security review
- After the second operator approval: cluster verification, Argo CD sync, digest comparison, DNS and certificate
- Hosted scenarios at `https://meet.know-me.tools`
- README and release notes updated to say what shipped and what did not
- Evidence in a new dated folder with a README

## Capabilities

### New Capabilities

- `release-verification`: The boundary packet runs once, in order, and stops safely

### Modified Capabilities

- None

## Impact

- Owner roles: `bdd-quality`, `independent-reviewer`, `security-reviewer`, `livekit-platform`, `delivery-lead`. Operator batch 2 is required.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
