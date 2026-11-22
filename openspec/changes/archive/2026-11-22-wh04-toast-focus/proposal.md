## Why

Base UI's F6 focuses the toast viewport, which has no fill, so keyboard focus disappears (WCAG 2.4.7).

## What Changes

- F6 moves focus to the frontmost toast, which shows the focus fill

## Capabilities

### New Capabilities

- `keyboard-focus-visibility`: Focus after F6 is visible

### Modified Capabilities

- None

## Impact

- Owner roles: ui-engineer.
- Phase: `web-conferencing-hardening`; plan: `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (digest recorded at adoption)
