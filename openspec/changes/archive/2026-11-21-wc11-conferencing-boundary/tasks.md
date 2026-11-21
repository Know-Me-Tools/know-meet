## 11. Single boundary run and go-live

- [x] 11.1 Run static gates and repository rules
- [x] 11.2 Run the packaged scenarios against the built web image
- [x] 11.3 Run accessibility, UI review and security review
- [x] 11.4 Publish through continuous deployment and confirm the digest
- [x] 11.5 Run the hosted scenarios at the public URL
- [x] 11.6 Update the README and release notes to match what shipped

Completion evidence (2026-11-21): 11.4 PR #16 → 59543ab1 and PR #17 → 8eb98147, deployed-digest comparisons in `evidence/boundary-2026-11-21-hosted*/`; 11.5 `evidence/boundary-2026-11-21-hosted/` and `-hosted-r11/`; 11.6 PR #18 → fc5fe48c. The phase was closed (PASS) before 11.3–11.6 could be written to the canonical ledger, which is immutable once closed, so the ledger shows wc11 at 2 of 6.

Owners and scenarios per task: see the task table in `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md` → Task model assignments, rows keyed `web-conferencing-features / wc11-conferencing-boundary / <task id>`.

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wc11-conferencing-boundary`.
