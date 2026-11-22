## 2. Honest background effects states

- [x] 2.1 Add the unsupported cause to background effects support
- [x] 2.2 Set aria-busy only while a chosen effect loads
- [x] 2.3 Skip preparation with an effect applied; delay the Preparing line 400 ms
- [x] 2.4 Write the two cause notes and update shape section 6
- [x] 2.5 Update the WC-4 software-path copy assertion

Task model assignments and scenario coverage: see `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md` (Task model assignments) and `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (scenarioMatrix ownerTask).

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wh05-hardening-boundary`, except task 3.1's measurement of current main.

> Amendment 3 superseded the preparation wording in task 2.3. The final behavior is recorded in the Background Effects spec delta.
