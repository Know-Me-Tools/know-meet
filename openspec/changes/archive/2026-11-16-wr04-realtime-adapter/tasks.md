## 4. Realtime adapter

- [x] 4.1 Implement the RealtimeRoom adapter over livekit-client
- [x] 4.2 Add the HTTP TokenIssuer adapter and composition wiring

Owners and scenarios per task: see the Tasks table in `.kbd-orchestrator/phases/web-release/plan.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-release/plan.md` → Task model assignments, rows keyed `web-release / wr04-realtime-adapter / <task id>`. Contract: `adopted-contract.json` sha256 9ccc9805…

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wr09-release-boundary`.
