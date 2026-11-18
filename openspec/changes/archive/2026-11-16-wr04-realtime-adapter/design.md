## Context

Library and pattern decisions come from the Analyze stage (`.kbd-orchestrator/phases/web-release/library-candidates.json`).

## Decisions

### cand-001: livekit-client (adopt)

Official browser SDK, already named by the team design. Lives behind the RealtimeRoom port in an infrastructure adapter.

Evidence:

- Tier 3: npm view: version 2.24.1, license Apache-2.0, modified 2026-11-14. (https://www.npmjs.com/package/livekit-client)
- Tier 2: Room.connect(url, token) with adaptiveStream and dynacast; ConnectionError exposes reason and status for a rejected token. (https://github.com/livekit/client-sdk-js/blob/main/README.md)
- Tier 1: Team manifest assigns the RealtimeRoom port over livekit-client to webrtc-engineer. (.agent-team/know-meet-team/team.json)

Risks:

- Not pinned in versions.toml; the operator must pin it.
- The same bundle runs in the Tauri webview; desktop is unverified in this phase.
