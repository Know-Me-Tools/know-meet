> **Withdrawn by amendment 3 (signed 2026-11-22).** This change ships no code.
> The archive preserves its spec delta. Recording and consent remain proposed
> follow-up work. The UI can reach the start/stop race described below.

## Why

A recording stopped within about a second is kept as a 0-byte or header-only, unplayable item. Task 3.1 measured the cause: Stop reaches the encoder before its first frame (Chromium hands back no data, Firefox a 340-byte header). The start/stop race in the recorder was not reached.

## What Changes

- Measure the mechanism on current main (local diagnostic patch, never committed)
- When Stop comes within 0.5 s of the encoder starting, keep encoding until 0.5 s, then stop
- Library items expose their state (`data-state`) for the scenario contract

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `local-recording`: A stopped recording always holds real frames and plays

## Impact

- Owner roles: client-shell.
- Phase: `web-conferencing-hardening`; plan: `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md`
- Contract: `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (amendment 1)
