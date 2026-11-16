## 2. Meeting domain and ports

- [x] 2.1 Add meeting domain types
- [x] 2.2 Add RealtimeRoom and TokenIssuer ports, use cases and fakes
- [x] 2.3 Extend boundary lint to packages/realtime and services/livekit

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr02-meeting-domain-and-ports / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
