# Reflection — web-conferencing-features

Closed 2026-11-21: `kbd-phase-close-eval.sh` → CLOSED, verdict PASS, 14 of 14 scenarios,
evidence sha256:90b935bc…, contract 3bf75c23…, budget note `budget-exhausted` (repairs 11 of 11).
Live at https://meet.know-me.tools from merge `8eb98147` (deploy `37587a9b`).

## Delta

**Planned:** 11 OpenSpec changes, 47 tasks, one boundary run in wc11 after all generation
(VLBV), repair budget 3, time 1500 minutes. Hosted run of the gate scenarios after merge.

**Delivered:** every operator goal, live. Six differences from the plan:

1. **Repairs: 11 used against an original budget of 3.** Six signed amendments raised the
   ceiling step by step (3→5→7→8→9→10→11) and time from 1500 to 4500 minutes. 3889 minutes
   were used.
2. **The boundary was not a single run.** It took r1–r11c locally plus two hosted runs: static
   gates first failed one at a time (r1–r3), then the packaged run, then the closing reviews,
   then the hosted run.
3. **The gate rule changed mid-phase (amendment 2):** lint, typecheck and unit tests became
   recorded signals; only user-task scenarios decide the verdict. This was the operator's
   correction ("we are supposed to only do behavior testing").
4. **The entity graph came from npm 5.0.1, not a build of `main`.** The operator published
   5.0.1 first (decision 2026-11-18), replacing the submodule-and-pack plan.
5. **The hosted run found a defect the packaged runs passed:** WC-7 lost the last history
   writes after Leave (repair 11). It shipped once in 59543ab1 and was fixed in 8eb98147.
6. **Firefox was never exercised until the last day.** The Firefox build was missing from
   the machine (noted at task 1.5) and the Firefox project had no fake media. Every earlier
   run was Chromium-only. Both were fixed on 2026-11-21; Firefox now passes WC-2, 3, 7.

wc11 in the ledger shows 2 of 6 tasks, though all six are done: tasks 11.3–11.6 finished
after closure, and a closed phase's ledger is immutable. Task 11.6 (README and release notes)
landed in PR #18 (`fc5fe48c`) after closure. All 11 OpenSpec changes verified PASS and are
archived; the archived wc11 `tasks.md` carries the completion evidence.

Lesson from this: closing the phase before the docs task and the archive left the ledger
permanently out of step. Close only after every task, including docs, is recorded.

## Goal achievement

| Goal | Status | Evidence |
| --- | --- | --- |
| Screen sharing | MET | WC-1 hosted 2/2 |
| Chat to everyone and privately | MET | WC-2, WC-3 hosted in Chromium, WebKit, Firefox |
| Background blur and image | MET | WC-4 hosted 3/3; GPU path, software path reports "not available" |
| Devices, speaker, levels, Enable audio | MET | WC-5, WC-12 hosted; WC-6 packaged (merged build) |
| Client-only history (PGlite) | MET | WC-7 hosted in three engines after repair 11; never-leaves-device control |
| Client-side recordings | MET, with a known defect | WC-8 hosted; WC-9 consent packaged. A recording stopped within ~1 s saves 0 bytes |
| Entity graph 5.0.x | MET as amended | WC-11 packaged: 5.0.1 with integrity hashes |
| Secrets server-side, short-lived tokens | MET | WR scenarios unchanged; artifact scan in web-release still holds |

7 of 8 goals fully met, 1 met with a known defect: about 94%.

## Root Cause

- **Generated code met its first execution at the boundary, so defects surfaced serially.**
  Repairs 1–4 were static-gate defects (formatting, a generated required field, a non-public
  Playwright fixture, a unit fake). Each stopped the run before the next could show. Amendment 1
  fixed the policy (run every static gate to completion, batch the repair); amendment 2 then
  removed static gates from the verdict.
- **The contract encoded environment facts nobody had checked.** The local meeting-creation
  limit (repair 5, r4: 22 of 23 failures), the production meeting limit (the hosted run had to
  be paced at one spec per 10 minutes), the missing Firefox build, and the Firefox fake-media gap.
  The first was already written down in the 2026-11-18 prerequisites and still was not encoded
  as a run input.
- **Scenarios passed on presence, not visibility (repair 8).** r7's chat and device scenarios
  passed while the panels were off-screen at 768+. Only the WC-13 audit and the UI review saw
  it. Locator presence is not "the person can use it".
- **A library stall was a real user defect (repair 9).** `@livekit/track-processors` 0.8.3
  froze the page on first use (0.5 s warm, 6.5 s cold with a GPU; continuous on software GL).
  The first diagnosis called it a test artifact; measuring on a GPU-backed browser showed
  otherwise.
- **Timing-dependent persistence escaped the packaged stack (repair 11).** Leave did not await
  history, and single-statement PGlite writes were never flushed. The local stack was fast
  enough to hide it; the live site and WebKit were not. My first repair (a 5 s cap) was a guess
  that WebKit disproved; a trace of the PGlite worker RPCs then showed slow writes
  (~3.3 s store creation, ~0.5 s per write), not a hang.

## Recalled Lessons

- **Applied:** "Boundary gates must launch the packaged artifact" — every gate ran the built
  images through compose and, after merge, the live site; that is what caught WC-7.
- **Applied:** "Preserve production evidence in dated review folders" — one folder per run
  (r1–r11c, hosted, hosted-r11, closure-2026-11-21); nothing overwritten.
- **Applied:** "Collect zero-question execution approvals at dispatch" — partly; approvals
  were asked per amendment, not at dispatch, which cost round trips.
- **Recurred (from web-release):** "Tooling written in this phase had never run before the
  boundary" and "the contract encoded environment facts nobody had checked". Both recurred
  here (repairs 1–5; Firefox; rate limits). The previous reflection named them and this phase
  did not prevent them.

## Contract accuracy

| Metric | Value |
| --- | --- |
| Contract amendments after adoption | 6 (all signed: budgets 1, 3, 4, 5, 6; gate rule 2) |
| BLOCKED caused by the contract | 2 (r4 meeting-creation run input; Firefox cells: browser missing, no fake media) |
| NOT_EXERCISED scenarios at closure | 0 (WC-13 has no hosted test by design; packaged only) |
| Repair attempts used / allowed | 11 / 11 (original 3) |
| Escapes past the packaged gate | 1 (WC-7, found by the hosted run after merge; fixed before closure) |
| Post-closure escapes | 0 known |
| Review findings at the closing reviews (critical / warning) | 0 / 4 (UI review W1–W4; open) |

Repair classes: static/tooling 4 (R1–R4), run input 1 (R5), product 5 (R6–R9, R11),
test-only 1 (R10). Product defects found by the boundary: R6 (three in-room defects), R8
(layout and accessibility), R9 (effects freeze), R11 (history writes).

## Artifact quality

- UI review (independent, fresh context): PASS with 4 warnings: `aria-busy` during "Preparing",
  "Preparing" flash on warm opens, the "not available" copy, no screenshots of the new states.
- Security review: CSP change adopted with changes (desktop policy unchanged, verified by WC-10).
  H1 (consent for late joiners) remains an open decision.
- CI on the merge: repo rules, typecheck, test, build, desktop and mobile builds, cargo pass.
  Flutter analyze/test fails (golden image sizes), as on `main` before this phase.

## Technical debt introduced

- Repair 11's "Saving this meeting…" line was not covered by the WC-13 axe audit.
- A reload or tab close while "Saving…" shows can still lose the last writes.
- Hosted evidence for WC-1, 4, 5, 8, 12 is from 59543ab1, before repair 11 changed Leave.
- The token-service digest on the cluster is unverified (gcloud needs an interactive re-login).
- Recordings under ~1 s save as 0-byte files; Base UI's F6 can focus a toast.
- The Firefox fake-media config lives in the shared Playwright config, not documented elsewhere.

## Lessons

- [GLOBAL] Run a hosted or production-like pass of every persistence scenario across engines before calling it proven: a fast local stack hides write-ordering and flush bugs that slower engines and real latency expose.
- [GLOBAL] When a fix depends on timing, measure the real timings first (trace the storage RPCs) and size any cap from the measurement, never from a guess.
- [GLOBAL] A UI scenario must assert the control is visible and usable, not only present in the DOM; presence passed while panels were off-screen.
- [GLOBAL] Encode every known environment fact (rate limits, installed browsers, fake devices, held ports) as a contract run input at plan time; facts written only in a prerequisites note get skipped.
- Run every static gate to completion and batch one repair; serial stop-at-first-failure gates cost one repair per defect.
- PGlite 0.5.16 does not flush single statements to IndexedDB; wrap every write in a transaction that flushes.
- Close a contract-bound phase only after every task, docs included, and the OpenSpec archive are recorded: a closed phase's ledger is immutable.
- A library stall that looks like a headless-test artifact must be measured on a GPU-backed browser before it is dismissed.

## Codify as Skill?

A "hosted gate run" procedure would have saved time: paced runs under production rate limits,
deployed-digest comparison by file hashes when the cluster is unreachable, and per-engine
setup checks (browsers installed, fake media). It is a candidate for a project skill, not
promoted here.

## Next Phase Seed

Proposals only; none is adopted scope.

1. A short hardening change for this feature set: UI review W1–W4, the 0-byte short-recording
   bug, the F6 toast focus, an axe pass over the saving line, and a hosted rerun of WC-1, 4,
   5, 8, 12 on the current build.
2. The security H1 decision on consent for late joiners.
3. Fix the Flutter golden CI failures so CI is green on `main`.
4. Then the product slice the operator named earlier: sign-in, then the Concierge
   (draft change `mc01-signed-in-meeting-creation`).

## Closure

`closure.json` and `closure-packet.md` hold the disposition. A successor phase needs an
operator-signed start-successor manifest; this reflection does not start one.
