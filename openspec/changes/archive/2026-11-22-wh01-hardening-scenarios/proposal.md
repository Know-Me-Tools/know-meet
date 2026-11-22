## Why

The hardening rules must be executable before any fix is written (VLBV). The previous phase left the saving state unaudited and ran WC-8 in Chromium only.

## What Changes

- `wh-hardening.spec.ts` with HD-1 to HD-4 (oracles and negative controls from the contract)
- Saving state added to the WC-13 audit under Chromium CPU throttling (HD-5)
- A `packaged-gpu` project (headed Chromium, ANGLE Metal, `@gpu`) and init-script variants for HD-2
- `@cross-engine` tags on HD-3 and WC-8

## Capabilities

### New Capabilities

- `conferencing-hardening-acceptance`: Hardening scenarios are executable before the fixes

### Modified Capabilities

- None

## Impact

- Owner roles: bdd-quality.
- Phase: `web-conferencing-hardening`; plan: `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (digest recorded at adoption)

> Amendment 3 superseded the original cross-engine plan. HD-3 was withdrawn, and WC-8 retains its existing Chromium regression test. The adopted acceptance delta records the shipped scope.
