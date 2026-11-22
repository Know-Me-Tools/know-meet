## 5. Hardening boundary run, reviews and hosted rerun

- [x] 5.1 Run the packaged boundary
- [x] 5.2 Capture the HD-6 screenshots
- [x] 5.3 Run the UI and security reviews
- [x] 5.4 Open the PR, pass required checks, merge and confirm the deploy
- [x] 5.5 Run the hosted rerun of WC-1, 4, 5, 8 and 12
- [x] 5.6 Update the release notes and README, archive the changes

Task model assignments and scenario coverage: see `.kbd-orchestrator/phases/web-conferencing-hardening/plan.md` (Task model assignments) and `.kbd-orchestrator/phases/web-conferencing-hardening/adopted-contract.json` (scenarioMatrix ownerTask).

Method: VLBV. No generated-code test, build or probe runs before the single boundary run in `wh05-hardening-boundary`, except task 3.1's measurement of current main.

Closeout evidence follows adopted amendments 3 and 4. For task 5.3, the signed
scope requires independent UI and code reviews. Task 5.6 records documentation
completion before KBD closure. OpenSpec verification and archival follow closure.
The withdrawn wh03 recording delta is kept in the archive without syncing it.

The packaged run, both reviews and the hosted rerun are indexed in
`.kbd-orchestrator/phases/web-conferencing-hardening/boundary-results.json`.
