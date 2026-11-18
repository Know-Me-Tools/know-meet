## 9. Release boundary and go-live

- [x] 9.1 Run static gates and the artifact scan
- [x] 9.2 Run the packaged scenarios against the built images
- [x] 9.3 Run accessibility, UI review and security review
- [x] 9.4 Verify the cluster, sync and compare digests
- [x] 9.5 Confirm the DNS record and issue the certificate
- [x] 9.6 Run the hosted scenarios at the public URL
- [x] 9.7 Update the README and release notes to match what shipped

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr09-release-boundary / <task id>`. Contract: `adopted-contract.json` digest abf8d22d… (amendment 2, 2026-11-16). Tasks 9.1 to 9.3 run before any push or merge; the push, the merges and task 8.6 follow the second operator approval, before task 9.4.

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
