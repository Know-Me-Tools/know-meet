## 6. Hosted release surface

- [x] 6.1 Add the hosted build mode and its route set
- [x] 6.2 Remove sign-in and sample-data entry points in hosted mode
- [x] 6.3 Add build:hosted and emit the CSP header artifact

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr06-hosted-release-surface / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
