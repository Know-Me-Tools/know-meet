## 4. F6 keeps keyboard focus visible

- [x] 4.1 Forward F6 focus to the frontmost toast and give it the focus fill

Task model assignments and scenario coverage: see `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md` (Task model assignments) and `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (scenarioMatrix ownerTask).

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wh05-hardening-boundary`, except task 3.1's measurement of current main.
