# c13 Stage B repair checkpoint

Date: 2026-11-13. Contract: 261ec2fd, binding revision 4. Stage: Execute.

## Plan-to-delivery delta

The requested state reconciliation and first production repair batch are done.
The requested green fidelity boundary is not done. Frozen-reference defects need
operator adoption, and the recovered repair consumption reaches the three-attempt
limit. A further correction cycle is requested, not assumed approved.

KBD/OpenSpec reconciliation now returns `clean: true`, `drifted: 0`, `errors: []`.
c13 has 7/10 tasks complete. Fresh VS-4 and VS-5 passes are recorded as 13.4 and
13.5 complete. Tasks 13.1 and 13.10 are blocked; certification is blocked.

The immutable legacy c08.8.3 title cannot be replaced by `task register` (runtime
returned `task 8.3 already exists`). A canonical decision records its adopted own
AG-UI interpretation; no duplicate task or event rewrite was created. The active
task selector now points into c13. The old exactNextCommand remains historical
operator intent and must not be used to restart Assess.

## Changed production files

Paths below are relative to the repository. Prior dirty edits were preserved;
the cumulative diff also contains changes made before this continuation.

| File | Repair |
|---|---|
| apps/web/src/app/frame/app-bar.tsx | Compact action sizing |
| apps/web/src/app/frame/account-menu.tsx | Menu width, spacing, icons and hover |
| apps/web/src/app/frame/brand.tsx | Wordmark breakpoint and focused-flow visibility |
| apps/web/src/app/frame/layouts.tsx | Home footer outside rail-inset content |
| apps/web/src/styles/frame.css | Scoped brand hiding, footer clearance and selected hover |
| packages/ui/src/styles/globals.css | Scan field utility directory; prototype heading defaults |
| packages/ui/src/components/native-select.tsx | Filled dropdown indicator |
| packages/ui/src/components/toast.tsx | Room placement and optional dismissal |
| apps/web/src/presentation/auth/why-aside.tsx | List spacing and guest action stretch |
| apps/web/src/presentation/settings/presentation/settings-shell.tsx | Sidebar group spacing |
| apps/web/src/presentation/dashboard/presentation/dashboard-parts.tsx | Hash-specific active tabs and status typography |
| apps/web/src/presentation/dashboard/presentation/schedule-view.tsx | Empty error-summary layout space |
| apps/web/src/presentation/dashboard/presentation/upcoming-view.tsx | Inherited date typography |
| apps/web/src/presentation/shared/sign-in-gate.tsx | Margin-collapse spacing equivalent |
| apps/web/src/presentation/agents/presentation/registry-view.tsx | Metadata flow |
| apps/web/src/presentation/agents/presentation/wizard-frame.tsx | Stepper margin |
| apps/web/src/presentation/recordings/presentation/detail-view.tsx | Breadcrumb spacing |
| apps/web/src/presentation/home/home-screen.tsx | Footer export, list spacing and brand breakpoint |
| apps/web/src/presentation/meeting-room/presentation/meeting-room-screen.tsx | Prototype entry toast |

## Changed harness and workflow files

- `tests/fidelity/src/support/candidate-snapshot.ts`: new dirty-input snapshot,
  including modes/deletions and a fingerprint; workflow output is excluded.
- `tests/fidelity/src/support/scratch-worktree.ts`: overlay that snapshot onto
  the detached negative-control tree; preserve cleanup on preparation failure.
- `tests/fidelity/steps/fidelity.steps.ts` and `web-smoke.steps.ts`: attach the
  negative-control candidate receipt before injecting a defect.
- `tests/fidelity/baseline-defects.md`: reference evidence and proposed correction.
- `tests/fidelity/support-correction-plan.md`: precise pending harness fixes.
- Phase `execution.md`, `decision-log.md`, `evidence/c13-state-reconciliation.md`:
  recovered plan, dispatch and provenance. Runtime-generated projections and
  c13/c16 OpenSpec task checkboxes were synchronized through supported commands.
- Required OpenSpec refresh updated generated integration files; no authored
  specification was changed by that refresh. User-level receipt retains backup.
- Independent review artifacts live in
  `.agent-team/reviews/code/c13-stage-b-2026-11-13/`.

## Executed verification and actual results

This is the authorized c13 repair boundary, not per-edit testing.

| Command | Observed result |
|---|---|
| `pnpm --filter @know-meet/web build` | Exit 0; Vite built in 704ms; chunk-size warning retained |
| `pnpm --filter @know-meet/fidelity-tests typecheck` | Exit 0 |
| `pnpm --filter @know-meet/fidelity-tests exec bddgen -c playwright.config.ts` | Exit 0 |
| `pnpm exec playwright test -c tests/fidelity/playwright.config.ts --grep ...` | Exit 1, `unknown command 'test'`; wrong root executable, no scenarios ran |
| Package-local Playwright command below | Exit 1; 17 passed, 28 failed, 98.2s |
| `git diff --check -- apps/web/src/app apps/web/src/styles apps/web/src/presentation packages/ui tests/fidelity` | Exit 0, no output |

Actual support invocation:

```sh
pnpm --filter @know-meet/fidelity-tests exec playwright test \
  -c playwright.config.ts --grep '@VS-4|@VS-5|@a11y|@motion'
```

Node 26.5.0, unique preview port 4191, and an absolute evidence directory were
set for the runner. `*-commands.json` records argv, cwd, dates, exit codes and
log hashes. `*-candidate.json` records HEAD plus dirty-input hashes.
The complete report is `suite/playwright.json`, with traces and screenshots
under `suite/test-results/`. No generated production change was made during it.

Fresh successes include all three VS-4 scenarios and both VS-5 scenarios,
including the injected unguarded-Tauri negative control. Failures: 23 rejected
320px setup cases, two rejected 600/1000px motion setups, one accessible-name
approximation failure, and two focus-injection negative controls. The majority
therefore do not yet tell us whether the product passes accessibility.

No new VS-1 comparison ran: the historical 54 failed / 20 passed is still the
latest full fidelity result. It must not be described as repaired or passing.

## Scope, guards and unverified claims

No new product feature, dependency, baseline pixel or threshold was added.
The required OpenSpec refresh and review/evidence artifacts are workflow outputs.
No unrelated mobile changes were reverted or repaired. No commit/push occurred.

The candidate concurrency guard traces to the observed HEAD-only negative-control
defect: changing sources during capture must not produce mismatched candidates.
Cleanup guards apply to the actual scratch-checkout resource boundary. No new
speculative production guard was added.

Visual tolerance across the full current matrix, accessibility, full focus
behavior and phase certification remain unverified. The provisional independent
review is BLOCK. Its separate concern about the pre-existing dirty desktop
payload scanner is not evidence of a newly reproduced native application fault.

Pending approval requests: the narrow 25-image reference correction with unchanged
thresholds, and one additional correction/verification cycle. The proposed fixes
are concrete in the two `tests/fidelity/*-defects/correction-plan` reports above.
Original failed receipts and UNKNOWN phase-wide time/tool usage are retained.
