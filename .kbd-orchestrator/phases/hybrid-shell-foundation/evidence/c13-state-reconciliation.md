# c13 state reconciliation

Date: 2026-11-13. Source canonical revision: 236. Method: VLBV.
Contract: `261ec2fd7ff96c0deaa35a4d59f8723858ecdcdeec2e417e0e090c27d7bec7b6`.

## Observed state

`kbd-phase-readiness-check.sh --phase hybrid-shell-foundation` returned
`READY`, plan revision 1, with the contract above.

`kbd-apply.sh reconcile hybrid-shell-foundation --json` returned 11 ledger-ahead
tasks, zero inspection errors. The mismatches are c13 tasks 13.2, 13.3, 13.6,
13.7, 13.8 and c16 tasks 16.2 through 16.7. Sync these checkboxes through
`kbd-apply mark-done`; do not hand-edit generated state or reopen completed work.

The c08.8.3 canonical title still names assistant-ui, although its authored
OpenSpec task and the adopted operator decision select the own AG-UI core.
Its pending status remains correct. Refresh the title through typed registration.

## Saved evidence and freshness

| Evidence | Observed result | Interpretation |
|---|---|---|
| Stage A decision log, commit 425ae27 | Aggregate checks passed | Historical candidate only |
| Flutter golden approval record | 282/282 approved | Preserve recorded 13.3 completion |
| `c13-raw/stageb-vs4-token-propagation.log` | 3 passed (7.8s) | Historical positive result; current-candidate identity not established |
| `c13-raw/stageb-vs1-fidelity.log` | 61 failed / 13 passed | Initial saved failed run |
| `c13-raw/stageb-vs1-fidelity-run2.log` | Interrupted by SIGTERM | No complete-run result; preserve consumed attempt |
| `c13-raw/stageb-vs1-fidelity-run3.log` | 54 failed / 20 passed | Latest complete saved failure |

The latest full Playwright/Cucumber artifacts are under `/private/tmp/km-vs1c/`.
They contain 324 failed screenshot comparisons. The source tree has additional
uncommitted changes, so those captures diagnose failures but do not certify it.

Negative-control scratch worktrees use HEAD, omitting the candidate's dirty
changes. This must be fixed before claiming same-candidate negative-control proof.

## Budget and effects

Contract limits remain 2,400 minutes, 3,000 tool calls, 3 repair attempts and a
no-progress limit of 3. Global consumption is UNKNOWN. Saved fidelity history
shows an initial run followed by two runs, one interrupted. Preserve both repair
attempts rather than treating the interruption as free. Further discovered
receipts may raise that lower bound; no budget is reset by this continuation.

No running process or incomplete scratch cleanup is assumed resolved merely
because its log exists. Reconcile active processes/scratch resources before the
next invocation. Keep old evidence intact and write new evidence separately.

## Next action

c13.13.1 is the active continuation, followed by remaining Stage B evidence and
independent review. c08.8.3 and c16.16.1 remain follow-ups outside this boundary
under the operator decision of 2026-11-12. Historical passes remain recorded;
phase certification remains pending until current required evidence passes.
