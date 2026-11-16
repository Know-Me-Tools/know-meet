# Security re-check: correction cycle (HEAD f4e1fb2e on e059e1db)

Reviewer: security-reviewer role, read-only; saved by the lead. Nothing was run.

**Verdict: PASS, conditional** on the boundary confirming the public listener is IPv4-only.
If it answers IPv6, H1's residual returns to HIGH and the verdict is BLOCK.

| Item | Status |
|---|---|
| H1 meeting-code exhaustion | PARTIAL: HIGH reduced to MEDIUM on IPv4 (about 2,000 addresses now needed to fill the store, was 10). Returns to HIGH if IPv6 is served: one /48 yields 65,536 /64 keys, and the 100,000-entry meeting-limiter table can also be filled. |
| N1 (new) per-address cap | MEDIUM: shared addresses (office or carrier NAT) get 5 meetings per 24 h once codes are used; if M3's client address is wrong, the whole site gets 5 per 24 h. |
| M2 NetworkPolicies | Correct selectors and ports; OPEN in effect until enforcement is confirmed (LEGACY_DATAPATH needs the network-policy add-on). Envoy proxy labels unconfirmed. LOW residual: node and hostNetwork traffic is allowed on GKE either way. |
| L1 hosted CSP | FIXED (header and meta). |
| L5 display names | FIXED; LOW residual: blank-looking non-Cf characters (U+3164, U+2800). |
| L6 namespace prune | FIXED. |
| CD deploy job | SOUND: job-only contents: write, push-to-main only, no untrusted input in run:, SHA validation, two-line guard, no backwards move, no loop. NEW LOW: deploys by tag, not digest; use the images job's digest outputs. |
| M4 + unprotected main | NOT FIXED, MEDIUM, heavier with CD: any push to main is a public deploy, and manifests under infra/ auto-sync with the Argo CD default project. Needs a dedicated AppProject, a ruleset with CODEOWNERS on infra/** and .github/** (with a bypass for the deploy bot), or an explicit operator risk acceptance before the phase closes. |

Verify at the boundary: Envoy Service ipFamilies and any AAAA record for meet.know-me.tools;
NetworkPolicy enforcement plus a negative test from another namespace; Envoy proxy pod labels;
the X-Forwarded-For shape (M3).

Cheap follow-ups: KM_MAX_STORED_CODES to 100000 or more; per-owner cap on IPv6 at /56 or /48;
count only unused codes against the per-owner cap, or extend used codes only while the room is
occupied; alert on capacity-exceeded and rate_limit_table_full; deploy by digest.
