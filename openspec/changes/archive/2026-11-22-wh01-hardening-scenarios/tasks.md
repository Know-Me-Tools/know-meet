## 1. Hardening acceptance scenarios

- [x] 1.1 Write wh-hardening.spec.ts for HD-1 to HD-4
- [x] 1.2 Add the saving state to the WC-13 audit (HD-5)
- [x] 1.3 Add the packaged-gpu project and the HD-2 init-script variants
- [x] 1.4 Tag HD-3 and WC-8 @cross-engine

Task model assignments and scenario coverage: see `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md` (Task model assignments) and `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (scenarioMatrix ownerTask).

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wh05-hardening-boundary`, except task 3.1's measurement of current main.

> Amendment 3 superseded the cross-engine work in tasks 1.1 and 1.4. Checked items preserve the historical task record. The adopted acceptance delta defines the final scope.
