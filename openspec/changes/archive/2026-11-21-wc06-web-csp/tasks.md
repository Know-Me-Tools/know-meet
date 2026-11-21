## 6. Hosted-only CSP widening with a desktop guard

- [x] 6.1 Add the hosted-only directives and the desktop guard
- [x] 6.2 Update the CSP unit and artifact tests
- [x] 6.3 Update the TLS and headers feature
- [x] 6.4 Regenerate the gateway security header

Owners and scenarios per task: see the task table in `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md`.

Task model assignments: see `.kbd-orchestrator/phases/web-conferencing-features/plan-tasks.md` → Task model assignments, rows keyed `web-conferencing-features / wc06-web-csp / <task id>`.

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wc11-conferencing-boundary`.
