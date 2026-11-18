## 1. Release scenarios

- [x] 1.1 Write release value scenarios and spec skeletons
- [x] 1.2 Define the secret-hygiene scenario and scan contract
- [x] 1.3 Define accessibility and design acceptance for the three screens
- [x] 1.4 Start a clean branch from main
- [x] 1.5 Collect pins and operator prerequisites
- [x] 1.6 Verify cluster-context.md against the live cluster, read-only

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr01-release-scenarios / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
