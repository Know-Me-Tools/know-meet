## 8. Cluster manifests

- [ ] 8.1 Add the Kustomize base and production overlay
- [ ] 8.2 Add the Gateway, HTTPRoutes and header filter
- [ ] 8.3 Add the certificate path from staging to production
- [ ] 8.4 Reference the Secret by name and write the operator runbook
- [ ] 8.5 Add the Argo CD Application and the verification tools
- [ ] 8.6 Pin the release image tags in the production overlay by pull request

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr08-cluster-manifests / <task id>`. Contract: `adopted-contract.json` digest abf8d22d… (amendment 2, 2026-11-16). Task 8.6 runs inside the boundary run, after the second operator approval and the images workflow, not before `wr09-release-boundary` starts.

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
