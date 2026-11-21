# Boundary run r2 — 2026-11-19

Candidate: `917b82ce` (repair attempt 2: `meterFill` in the mobile fallback palette), branch `feat/web-conferencing-features`.
Runner: scratchpad `run-boundary-steps.mjs` (stops at the first failing step). Argv, exit codes and timing: `argv-and-exit.json`.

| Step | Command | Exit | Log |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 | `01-static-1.log` |
| 2 | `pnpm lint` (all eight rules, including native) | 0 | `02-static-2.log` |
| 3 | `pnpm typecheck` | 1 | `03-static-3.log` |

## Result: FAIL at step 3

- `@know-meet/release-tests`: two TS2339 errors in `tests/release/wc-7-local-history.spec.ts` (lines 62 and 151). The tests destructure a `browserType` fixture that Playwright's public test types don't provide.
- Turbo stopped after the first failure: 3 of 6 typecheck tasks completed, so the other packages were never type-checked. The full typecheck error set is UNKNOWN.
- Not run: `pnpm test`, `pnpm build`, `build:hosted`, header render, images, compose, packaged run, reviews.

Repair attempts used: 2 of 3.
