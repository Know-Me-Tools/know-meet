## Why

UI review W1-W3: the group is announced busy while still operable, 'Preparing' shows when nothing is being prepared, and the unsupported note gives no fix for the software-graphics cause.

## What Changes

- Background effects support carries an unsupported cause (browser or graphics)
- aria-busy only while a chosen effect loads; no preparation with an effect applied; 'Preparing' only after 400 ms
- Two cause notes; shape section 6 and the WC-4 copy assertion updated

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `background-effects`: Background effects states say what is really happening

## Impact

- Owner roles: architect (2.1), ui-engineer (2.2-2.4), bdd-quality (2.5).
- Phase: `web-conferencing-hardening`; plan: `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (digest recorded at adoption)

> Amendment 3 clarified preparation triggers. Preparation runs on join and when the camera turns on. An applied effect suppresses the Preparing message, and choosing None starts no preparation.
