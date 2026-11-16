## 7. Container images

- [x] 7.1 Add the static web image
- [x] 7.2 Add the token service image and the artifact scan
- [x] 7.3 Add the build-and-push workflow
- [x] 7.4 Add the local compose stack and extend repo rules

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr07-container-images / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
