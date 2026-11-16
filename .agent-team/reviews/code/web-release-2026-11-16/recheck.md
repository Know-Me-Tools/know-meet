# Code re-check: correction cycle (HEAD f4e1fb2e on e059e1db)

Reviewer: independent-reviewer role, read-only, same model family; saved by the lead.

**Verdict: PASS.** No CRITICAL.

| Item | Status |
|---|---|
| C1 Back leaves the meeting | FIXED. StrictMode, hash-only changes, the lobby-to-room hand-off and Leave-then-Back all behave. LOW: lobby preview and room briefly share the camera on Back. |
| M1 late join | FIXED. LOW race: a join whose device step hits connection-lost still reports success, and its late leave() could disconnect a newer session. |
| WR-1 Back test | FIXED and proves C1 (precondition, deterministic wait, in-page navigation). |
| CD deploy job | Works. MEDIUM prerequisite: a future ruleset on main would refuse the bot push. LOW: `pin \|\| exit 0` treats any failure inside pin as "nothing to deploy" (set -e is off there), so a failed commit ends green. LOW: only "Re-run failed jobs" recovers a failed deploy. |
| Limits vs the release suite | HIGH for the boundary run: about 10 meeting creations per project from one address exceed production limits. Packaged run relaxes them by environment; hosted run is reduced (operator decision). |
| Limits vs the web client | Safe mapping. MEDIUM: the 429 copy says "Wait a minute" while the real wait is about 200 to 900 s; use Retry-After. LOW: 503 capacity-exceeded shows "check your connection". |
| Process | Every main push goes live with no hosted check first; covered only by the operator's CD decision of 2026-11-16. H2 (staging issuer, private packages) remains a hard prerequisite of the first deploy. |
