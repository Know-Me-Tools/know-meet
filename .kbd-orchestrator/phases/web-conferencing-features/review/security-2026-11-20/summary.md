# Security review — wc11 11.3 (2026-11-20, candidate 11ecd347)
Reviewer: security-reviewer subagent (read-only, static, no git access).
Verdict: no CRITICAL. 1 HIGH (operator policy decision), 2 MEDIUM, 4 LOW.

- H1: a late joiner's media is captured while their consent is pending, and kept after they decline; no timeout on pending (consent-transitions.ts:334-345,379-384; desired-media.ts:28-44). This is decision D2 working as written.
- M1: consent cannot be withdrawn after agreeing (consent-transitions.ts:396).
- M2: DELETE without VACUUM may leave deleted chat/history rows in IDB pages (unverified).
- L1: the sender sets the private/everyone label, so it can be spoofed (chat-codec.ts:63-68). The sender identity is safe.
- L2: deleting a recording leaves its meeting_recording_link row (recording-library.ts:206).
- L3: worker-src blob: is still in the hosted CSP (background effects).
- L4: the entity-graph 5.0.1 comes from the registry with an integrity pin, but is exempted from the minimumReleaseAge quarantine.
Clean: secrets, token grants/TTL, production rate limits, chat rendering (no HTML), private destinationIdentities, no egress of history or recordings, object URL revocation, hosted CSP (no unsafe-eval), Tauri guards.
