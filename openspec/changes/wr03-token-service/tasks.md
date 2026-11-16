## 3. Token service

- [ ] 3.1 Create the services/livekit crate with env config and health
- [ ] 3.2 Issue room codes and scoped short-lived tokens
- [ ] 3.3 Add rate limit, Origin check and room limits
- [ ] 3.4 Document the service and its configuration

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr03-token-service / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
