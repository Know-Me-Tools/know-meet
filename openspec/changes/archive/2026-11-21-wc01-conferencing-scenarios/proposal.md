## Why

VLBV requires the acceptance for screen share, chat, effects, devices, local history and local recording to exist before any production code, and four new surfaces need approved designs.

## What Changes

- WC-1 to WC-14 as Gherkin in `features/` and Playwright skeletons in `tests/release/` with packaged and hosted projects
- Negative controls for consent and for on-device privacy
- `impeccable shape` for background effects, device settings, history and the recordings library
- The phase worktree from `main`, installed
- The dependency pins in `tooling/versions.toml`, and the three adopted libraries added to `apps/web` and installed

## Capabilities

### New Capabilities

- `conferencing-acceptance`: Conferencing scenarios exist before production code

### Modified Capabilities

- None

## Impact

- Owner roles: bdd-quality, design-lead, delivery-lead, build-platform.
- Phase: `web-conferencing-features`; plan: `.kbd-orchestrator/phases/web-conferencing-features/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json` (draft; digest recorded at adoption)
