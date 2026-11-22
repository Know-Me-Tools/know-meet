## 3. Short recordings are never left empty

- [x] 3.1 Measure the short-recording mechanism on current main
- [x] 3.2 Keep encoding until 0.5 s after the encoder started when Stop comes sooner
- [x] 3.3 Expose each library item's state (data-state) for the scenario contract

Amendment 1 (2026-11-21): task 3.1 found the cause is an encoder stopped before its first frame;
the start/stop race was not reached. The adopted amendment changed tasks 3.2 and 3.3
from "fix the race" and "remove empty recordings with a notice" (KBD task titles keep their original
wording; this file and the amended contract are authoritative).

WITHDRAWN by amendment 3 (2026-11-22): the code of 3.2 and 3.3 was returned to main. The checkboxes
record work done, not shipped behaviour. Archive without syncing the delta.

Task model assignments and scenario coverage: see `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md` (Task model assignments) and `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (scenarioMatrix ownerTask).

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wh05-hardening-boundary`, except task 3.1's measurement of current main.
