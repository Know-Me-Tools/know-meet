# Security review: web release (boundary task 9.3, security part)

- Reviewer: security-reviewer role (read-only tools: Read, Glob, Grep). Saved here by the lead
  verbatim in substance, because the reviewer had no write tool.
- Scope: worktree state at 3b02b792 on `feat/web-release`, across the four threat-model areas.
  No diff was run and nothing was executed; every claim comes from reading the source.
- The CD job added later in e059e1db is not covered by this review.

**Verdict: BLOCK** (one HIGH; no CRITICAL; no secret exposure).

## HIGH

### H1. Anyone can fill the meeting-code store, then nobody can start a meeting
Where: `services/livekit/src/config/mod.rs:96-98` (refill 60 s, code TTL 86,400 s, at most
10,000 stored codes); `services/livekit/src/application/code_store.rs:33-45`;
`services/livekit/src/http/handlers.rs:84-90`; `infra/k8s/base/token-service.yaml:81-84`.

Creating a meeting needs only a passing Origin header and a rate-limit token (10 per 60 s per
address, about 14,400 codes per address per day). Codes live 24 hours and are purged only when the
store is full at 10,000. One address fills it in about 17 hours, 10 in about 100 minutes, 100 in
about 10 minutes. Then every `POST /api/meetings` returns 503 `capacity-exceeded` for everyone.
The Origin check is not authentication (`http/guards.rs:3-5`).

Fix: a separate, stricter limit on `/api/meetings` (for example 3 per 10 minutes per address);
a cap on live codes per address; a shorter code TTL or expiry of unused codes after minutes;
a larger store and an alert on `capacity-exceeded`.

## MEDIUM

### M1. Room codes are short enough to guess when they are the only access control
Where: `services/livekit/src/domain/room_code.rs:1-15`, `services/livekit/src/application/meetings.rs:76-80`.
36^6 codes; with 10,000 live codes a guess hits about 4.6 in a million; about 6 to 7 meetings a
day for 100 addresses. A hit gets publish and subscribe rights. Fix: longer codes (10 or more
symbols) or a long secret in the invite link hash; a stricter bucket for `meeting-not-found`.

### M2. Any pod in the shared cluster can bypass Envoy and forge X-Forwarded-For
Where: `infra/k8s/base/kustomization.yaml:5-8` (no NetworkPolicy),
`infra/k8s/base/token-service.yaml:75-76`, `services/livekit/src/http/client_addr.rs:20-43`.
A direct caller writes the rightmost entry itself, which removes the rate limit. Fix:
NetworkPolicies in `know-meet`: token-service ingress only from Envoy data-plane pods on 8080
plus probes; token-service egress deny-all; web ingress only from Envoy.

### M3. Client-address setup unverified; if wrong, the whole site shares one bucket
Where: `infra/k8s/base/token-service.yaml:72-76`, `infra/README.md:83-91`. With
`externalTrafficPolicy: Cluster` or another proxy hop, the rightmost entry is a node address.
Fix: confirm end to end at the boundary; pin `externalTrafficPolicy: Local` on the Envoy Service;
record the observed header shape.

### M4. The Argo CD Application uses the `default` project and auto-syncs `main`
Where: `infra/argocd/know-meet.yaml:27,35-38`. Whatever merges under the production overlay is
applied with Argo CD's rights. Fix: a dedicated AppProject restricted to this repo, destinations
`know-meet` and `envoy-gateway-system`, cluster-scoped kinds `Namespace` and `GatewayClass`;
branch protection and CODEOWNERS on `infra/**`.

## LOW

- **L1.** Hosted CSP allows `ipc:` and `http://ipc.localhost` (`apps/web/scripts/content-security-policy.ts:27-35`). Low risk; drop both when hosted. Tauri code does not reach the hosted bundle unguarded.
- **L2.** Playwright traces hold live 10-minute tokens; `tests/release/reports/` is not gitignored. Ignore it; retain traces on failure only for hosted.
- **L3.** Web base images pinned by tag only (`apps/web/Dockerfile:18,60`); overlay pins tags, not digests.
- **L4.** `images.yml` checkout persists the `packages:write` token during `pnpm install`. Use `persist-credentials: false` and `--ignore-scripts`.
- **L5.** Display names allow Unicode format characters such as U+202E (`services/livekit/src/domain/display_name.rs:21`).
- **L6.** Pruning the Namespace would delete the operator-created Secret; add `Prune=false,Delete=false` to it.
- **Note.** `infra/platform/certificate.yaml:31` still points at `letsencrypt-staging` (planned switch).

## Checked and found sound

Token TTL bounds and one-room grants; server-generated identities; strict code parsing and CSPRNG
generation; Origin, content type, body limit and timeout; X-Forwarded-For parsing; fixed error
messages and redacted logs; no secret in tracked files, bundle, images, compose or manifests;
workflow permissions, pinned actions and the scan's negative control; CSP and security headers;
no innerHTML or open redirect; pod security contexts, restricted Pod Security Standard, and only
`meet.know-me.tools` on listeners, routes and the Certificate.
