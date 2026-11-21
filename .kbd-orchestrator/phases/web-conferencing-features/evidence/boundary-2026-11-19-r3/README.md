# Boundary run r3 — 2026-11-19

Candidate: `440156e2` (repair attempt 3 of 3: the public `playwright` fixture in the WC-7 spec), branch `feat/web-conferencing-features`.
Runner: scratchpad `run-boundary-steps.mjs` (stops at the first failing step). Argv, exit codes and timing: `argv-and-exit.json`.

| Step | Command | Exit | Log |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 | `01-static-1.log` |
| 2 | `pnpm lint` | 0 | `02-static-2.log` |
| 3 | `pnpm typecheck` (8 packages, web included) | 0 | `03-static-3.log` |
| 4 | `pnpm test` | 1 | `04-static-4.log` |

## Result: FAIL at step 4

- `@know-meet/web`: 44 of 45 unit tests pass. One fails: `tests/unit/lazy-realtime-room.test.ts:51`, "the first connect loads once, adopts listeners and bindings, then delegates". The assertion at line 67 expects 1 subscriber notification and observes 5.
- Read-only diagnosis, not verified by a run: the test predates this phase. wc02 rewrote the shared fake (`packages/application/src/meeting/fakes/fake-realtime-room.ts`, +237/-40), and the rewritten fake publishes snapshots during `connect`, which the old one did not. The likely cause is a stale expectation in the test, not a defect in `lazy-realtime-room.ts`. This is UNCONFIRMED.
- Turbo reported 6 of 7 test tasks successful. Whether other packages' tests were cut off is not established from this log.
- Not run: `pnpm build`, `build:hosted`, header render, images, compose, packaged run, reviews. No WC scenario has been exercised.

Repair attempts used: 3 of 3. The budget is exhausted.
