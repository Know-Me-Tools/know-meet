## Why

VLBV runs generated code once, at the phase boundary, against the packaged image and then the hosted URL.

## What Changes

- Static gates and repository rules
- Packaged scenarios against the built web image with real LiveKit
- Accessibility, UI and security reviews
- Operator-approved push and merge; continuous deployment; digest check
- Hosted scenarios; README and release notes

## Capabilities

### New Capabilities

- `conferencing-verification`: The phase is verified once at the boundary

### Modified Capabilities

- None

## Impact

- Owner roles: bdd-quality, independent-reviewer, security-reviewer, delivery-lead.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
