# c13 Stage B continuation

Date: 2026-11-13. Phase: hybrid-shell-foundation, Execute.
Current contract: `6d67489066e4dc6cd06ee6772623d07a9ae0b0eaaa52c622e7d9d6a6173658f4`.
Original continuation contract: `261ec2fd7ff96c0deaa35a4d59f8723858ecdcdeec2e417e0e090c27d7bec7b6`.

The operator requested: “Reconcile the KBD state with the latest evidence,
then continue c13 Stage B and fix the fidelity failures.” This continues the
boundary authorized on 2026-11-12; it does not restart Assess or reset budgets.

## Execution plan

1. Reconcile canonical tasks and OpenSpec checkboxes using the KBD driver.
   Preserve old receipts and distinguish historical passes from current-tree proof.
2. Diagnose the saved VS-1 failures against the frozen prototype and thresholds.
3. Batch fixes to shared UI, screens, frame, and demonstrated harness defects.
4. At the completed repair boundary, run the production build and applicable
   Stage B scenarios, retain command/exit/candidate receipts, and inspect captures.
5. Run the independent UI/code review after the repair batch is complete.
   Record unresolved failures honestly; never change baselines to force a pass.

## Dispatch

The current operator invoked Codex. This continuation uses its native team roles
and inherited model settings in place of the historical Claude implementation
route, with four concurrent slots including the driver. Existing ownership holds:

- Driver: KBD/OpenSpec state, evidence reconciliation and boundary scheduling.
- ui-engineer: `packages/ui/**`, `apps/web/src/presentation/**`.
- client-shell: `apps/web/src/app/**`, `apps/web/src/styles/**`.
- bdd-quality: `tests/**`, `features/**`.

Reviewers stay dormant until the implementation batch is complete. The recorded
cross-model review route remains required; availability must be checked then.
Existing uncommitted mobile and other work is preserved.

## Scope and uncomfortable fact

The 2026-11-12 decision carries c08.8.3 and c16 outside this boundary. They remain
unfinished. The latest saved fidelity result is 54 failed / 20 passed, so earlier
build and golden successes do not establish phase completion. The original
time/tool consumption is unknown and must not be treated as zero. Saved VS-1
attempt history includes an interrupted run; see the reconciliation report.

## Operator-approved fourth repair cycle

The 2026-11-13 operator answers authorize exactly one additional batched
correction-and-verification cycle, bringing the known repair limit from 3 to 4.
The earlier interrupted attempt and failed support batch remain consumed; prior
wall time and tool consumption remain UNKNOWN. See `decision-log.md`.

The complete correction set covers the observed viewport/name/focus harness
failures, candidate rename/symlink isolation, the overclaimed embedded-payload
check, and the 25 narrowly approved references. Original references and rejected
scratch captures are retained under `evidence/c13-stage-b-2026-11-13/reference-correction/`.
Independent reference adjudication must approve the exact replacement set before
promotion and signed contract amendment. Thresholds, matrix and rubric do not change.

After all source and reference changes are frozen, run one serialized batch:
production web build, workspace TypeScript check, real-Git candidate-isolation
integration, BDD generation, Stage B plus the five affected VS-2 scenarios, and
repository lint. The Playwright command is package-local:
`pnpm --filter @know-meet/fidelity-tests exec playwright test -c playwright.config.ts --grep '@VS-1|@VS-2|@VS-4|@VS-5|@a11y|@motion'`.
Preserve argv/exit/log/candidate/contract receipts under
`evidence/c13-stage-b-2026-11-13/approved-cycle-4/`. Native build operations are
serialized. Then request the single independent correction confirmation.
A failed final gate checkpoints BLOCKED; it does not authorize a fifth repair.
