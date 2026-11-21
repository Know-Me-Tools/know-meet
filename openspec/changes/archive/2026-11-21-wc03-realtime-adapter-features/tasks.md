## 3. LiveKit adapter for share, chat, devices, audio and processors

- [x] 3.1 Split the LiveKit adapter into a feature directory
- [x] 3.2 Implement screen share
- [x] 3.3 Implement text streams for chat and consent
- [x] 3.4 Implement devices, output gating and audio start
- [x] 3.5 Implement the video processor hook

Owners and scenarios per task: see the task table in `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md` → Task model assignments, rows keyed `web-conferencing-features / wc03-realtime-adapter-features / <task id>`.

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wc11-conferencing-boundary`.
