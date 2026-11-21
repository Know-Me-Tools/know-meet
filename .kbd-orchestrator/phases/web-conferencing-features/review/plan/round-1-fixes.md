# Round 1 fixes (verdict BLOCK: 1 critical, 5 warnings, 2 suggestions)

- CRITICAL, CD prerequisite: CD by digest is live on main (PR #9, PR #13, deploy commits 85e8d2d6 and ec165d98). Stated in boundary step 5, with a read-only kubectl digest fallback and a BLOCKED stop.
- Contract adoption timing: added a gate before Round 1, plus batch 1 items (adopt the contract with D1 to D5; record the policy ACK).
- AG-UI: rejected as a factual matter. Both spikes already pin @ag-ui/core 1.0.4. The plan's own claim of a bump was wrong too and is removed (plan, plan-tasks, wc08 tasks and proposal).
- Task 6.4 render: it now runs inside boundary step 1, with a one-file commit before the push approval.
- WC-6 unsupported branch: forced in every engine by an init script that removes setSinkId.
- PRODUCT.md: task 1.3 (design-lead, which owns PRODUCT.md) commits the amendment if D1 is adopted.
- WC-1 surfaces: window and screen are chosen in the browser picker and recorded as NOT_EXERCISED.
- Same-role serialization: one writer per role per round.
