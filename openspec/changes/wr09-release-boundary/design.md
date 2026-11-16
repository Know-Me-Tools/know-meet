## Context

Library and pattern decisions come from the Analyze stage (`.kbd-orchestrator/phases/web-release/library-candidates.json`).

## Decisions

### cand-019: Playwright two-context meeting check with fake media devices (adopt)

Automated proof of the user operation against the real service and the deployed URL.

Evidence:

- Tier 1: Playwright is already configured in the repo. (playwright.config.ts)

Risks:

- Chromium fake-device flags are not set in playwright.config.ts today and were not verified against the pinned @playwright/test 1.65.0; verify early in the plan, with an agent-run machine with real devices as fallback.
- The check drives the public token endpoint of the built or deployed service, so the test runner never holds the LiveKit secret. It still uses LiveKit Cloud minutes.
