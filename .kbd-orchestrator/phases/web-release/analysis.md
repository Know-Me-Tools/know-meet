# Analysis: web-release

```
ANALYSIS: web-release
Project: know-meet
Date: 2026-11-14
Mode: stack specified (React 19 + Vite web, Rust/Axum services, GKE platform
  baseline from cluster-context.md)
Inputs: assessment.md, cluster-context.md, prior-context.md, team manifest
Operator decisions in force: real LiveKit meetings (Q1); target cluster GKE
  `main` in `knowme-corporate` (Q2)
```

Every verdict below is a recommendation. Nothing is adopted until the operator
adopts the outcome contract. Version and health figures were read from the
registries and GitHub on 2026-11-14 and are cited in
`library-candidates.json`.

## What the scope decision changes

"Real meetings" turns a packaging phase into a product phase. Four things that
were out of reach of a deployment plan are now required:

1. A realtime client in the web app.
2. A server that issues LiveKit tokens.
3. A LiveKit server to connect to.
4. A way for a person to get into a room without the stub sign-in.

The deployment work from the assessment (image, manifests, DNS, TLS, pipeline)
is unchanged and still required.

## Findings that were not in the assessment

1. **The architecture for realtime is already written down.** The team
   manifest (`.agent-team/know-meet-team/team.json`) assigns a `RealtimeRoom`
   port over `livekit-client` to `webrtc-engineer`, a `TokenIssuer` port to
   `architect`, and "a tested token service in `services/livekit` that
   supersedes `docs/design/live/server.mjs`" to `livekit-platform`. None of it
   exists yet: `packages/domain` and `packages/application` hold only notes,
   theme and capabilities. The analysis follows that design and does not
   propose a different one.
2. **A LiveKit Cloud project is recorded in memory.** Two memory records
   (`1c2acef6`, 2026-10-19; `1e1964ca`, 2026-10-25) say `~/.bash_profile` sets
   `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, that the URL
   points to a LiveKit Cloud project, and that the credentials listed rooms
   successfully. Not re-checked in this session. The same URL already appears
   in the repo as sample data (`sample-workspace.ts`). Whether that project is
   the one production should use is the operator's call.
3. **The organisation has a working precedent for this exact deployment
   shape.** `Know-Me-Tools/conduit` deploys to GKE with Gateway API on Envoy
   Gateway (`gatewayClassName: eg`), cert-manager `letsencrypt-prod`, a
   Certificate, an HTTPS HTTPRoute and an HTTP redirect route, with images on
   `ghcr.io/know-me-tools/*`. It targets a different cluster
   (`client-cluster`) and deploys by `kubectl apply` from GitHub Actions with a
   service-account key. It also self-hosts LiveKit and a token service
   (`k8s/livekit`, `k8s/lk-jwt-service`) and needs a UDP firewall rule to do
   so.
4. **`versions.toml` has no pins.** It is the authoritative file for
   dependency pins and its `[pins]` table is empty. Agents may not edit it.
   Any new dependency this phase adds needs the operator to pin it there.
5. **The repo is public.** GHCR packages built from it can be public, which
   removes the need for an image pull secret on the cluster.

## Gaps and verdicts

Gap ids are local to this analysis. Candidate ids refer to
`library-candidates.json`.

### G1. Realtime client in the web app

| Candidate | Verdict | Why |
|---|---|---|
| `livekit-client` 2.24.1 (cand-001) | adopt | The official browser SDK, Apache-2.0, released the day of this analysis. The team manifest already names it. It goes behind the `RealtimeRoom` port in an infrastructure adapter, so domain and application code never import it. |
| `@livekit/components-react` 2.9.25 (cand-002) | reject for UI, reference for behaviour | Its prefab components ship their own look. CLAUDE.md requires UI from the shared shadcn kit themed by the tokens and forbids copying components per app. The room UI already exists as Know Meet screens. |
| `livekit-examples/meet` (cand-018) | reference | A Next.js app, so not portable. Useful for the lobby and pre-join device flow. |

The room UI is build work: wiring the existing `/meet` and `/join` screens to a
real room.

### G2. Token service

| Candidate | Verdict | Why |
|---|---|---|
| `livekit-api` 0.10.2, feature `access-token` only (cand-003) | adopt | Official Rust server SDK, Apache-2.0. `AccessToken::with_api_key(..).with_identity(..).with_grants(VideoGrants{..}).with_ttl(..).to_jwt()` covers the need. Default features pull in `reqwest` and the service clients; token minting needs only `access-token`. |
| `docs/design/live/server.mjs` (cand-004) | reference | It defines the behaviour to match: grants, identity format, TTL, response shape. It is frozen prototype code and must not be deployed. |
| `livekit-server-sdk` for Node (cand-005) | reject | It would add a Node runtime to a repo whose services are Rust. |

The service itself (`services/livekit`, Axum) is build work. Its abuse controls
are the hard part, not the token: see Risks. For the rate limit,
`tower_governor` 0.8.0 (cand-020) is a candidate to evaluate at spec time
before hand-rolling; only its registry listing was read. Behind the Gateway
the client address arrives in a forwarded header, so a limiter keyed on the
socket address would rate-limit the Gateway, not the visitor.

### G3. LiveKit server

| Candidate | Verdict | Why |
|---|---|---|
| LiveKit Cloud, existing project (cand-006) | adopt, pending operator confirmation | Recorded as working. No media server to run, no UDP firewall, no TURN. |
| Self-hosted LiveKit on the cluster (cand-007) | reject for this phase | Needs host networking or a UDP port range, a firewall rule, TURN and capacity planning. Memory records two nodes of unknown size. The conduit repo shows it can be done, and shows the cost. |

### G4. Getting into a room

No library fits; this is a product decision, then build work.

- **Recommended for this release: guests only.** A visitor enters a display
  name and starts or joins a room by code. This matches the product's own
  design ("start as a guest", "invitees never need an account") and the
  prototype's live room.
- **Not recommended for this release: real accounts.** The organisation has
  forks of Ory Kratos and Oathkeeper, and the cluster has no identity service
  recorded. Adding sign-in is a phase of its own.

Consequence: the stub sign-in must not gate anything real, and the token
endpoint is public. See Risks 1 and 2.

### G5. Serving the bundle

| Candidate | Verdict | Why |
|---|---|---|
| A static file server image, `static-web-server` v2.44.2 (cand-008) | adopt | The bundle is static files. A small Rust server with no application code is the smallest thing that can be on the internet. Read from its source and sample config after review: `page-fallback` serves an HTML file with status 200 for missing paths and keeps 404 for missing assets, custom headers are set per glob, and it has a health endpoint. Not yet run with this bundle. |
| `services/bff` made deployable (cand-009) | reject for this release | It was written for the local desktop case: loopback bind, loopback `Host` check, an unauthenticated notes API on one SQLite file. Hardening it means changing its security model and gating routes, to serve files a static server already serves. It stays as it is for desktop and local development. |

Result: two small workloads behind one hostname. The HTTPRoute sends `/api/*`
to the token service and everything else to the static server. Same origin, so
no CORS.

### G6. Security headers

Gateway API `ResponseHeaderModifier` on the HTTPRoute (cand-015) is a core
filter and Envoy Gateway supports it. It sets HSTS, Referrer-Policy,
Permissions-Policy, `nosniff`, frame denial and the CSP as real response
headers, in one reviewed manifest. `Permissions-Policy` must allow camera and
microphone for this origin; the usual "deny all" value would break meetings.

The repo already has `buildContentSecurityPolicyHeader()`. The manifest value
should be generated from it, not typed by hand, so the meta tag and the header
cannot drift.

### G7. Container registry

| Candidate | Verdict | Why |
|---|---|---|
| GitHub Container Registry (cand-010) | adopt | Organisation precedent. The built-in workflow token can push. Public repo, so images can be public and the cluster needs no pull secret. |
| Google Artifact Registry (cand-011) | reject for now | Nothing is recorded about it, Workload Identity is off, and pull access would depend on the node service account. |

### G8. Manifests and delivery

| Candidate | Verdict | Why |
|---|---|---|
| Kustomize manifests in this repo plus one Argo CD Application (cand-012) | adopt | Argo CD is installed and idle. It pulls from a public repo, so no cluster credential leaves the cluster. |
| `kubectl apply` from GitHub Actions (cand-013) | reference | The conduit precedent. It stores a long-lived GKE service-account key in GitHub. |
| conduit's Gateway, Certificate and HTTPRoute manifests (cand-014) | adapt | Same gateway class and issuer names. Change the hostname, namespace and backends. |
| The repo's `scripts/build-site.sh`, `publish-pages.sh`, `publish-ipfs.sh` (cand-021) | reject | They publish the design site (`docs/design/`) to GitHub Pages and IPFS, which have no server side. The release needs a token service, so they are not its delivery path. |

**DNS.** Nothing in the repo creates the record. On this cluster it is
expected to appear on its own: memory records external-dns watching
`gateway-httproute` sources on the `know-me.tools` zone, so the HTTPRoute's
hostname should produce the A record pointing at the Gateway's load balancer.
That is recorded behaviour, not observed. The plan needs an explicit task to
confirm the record resolves before the production certificate is requested,
with creating it by hand in Cloudflare as the operator's fallback.

**Image tag promotion does not meet VS-C as proposed.** The assessment's VS-C
("merge to main and it is live with no manual steps") needs something to move
the image tag. A pull request that bumps the tag is one manual step per
release, so it fails VS-C as written. Fully automatic needs Argo CD Image
Updater or a CI commit to `main`; neither was researched. VS-C is a proposal,
not an adopted scenario, so this is the operator's choice (A8), not a default
the plan may carry silently.

### G9. Secrets on the cluster

| Candidate | Verdict | Why |
|---|---|---|
| A Kubernetes Secret created by the operator from the shell, value piped on stdin (cand-016) | adopt for the first release | It is the pattern memory already records for this cluster. Nothing secret enters the repo, the image or the CI system. The manifest refers to the Secret by name only. |
| Sealed Secrets (cand-017) | reference | The right next step once more than one secret is managed through Git. One more controller to install. |
| External Secrets Operator with Secret Manager | reject for now | Depends on Workload Identity, which is off. |

Cost of the adopted option: rotation is manual, and a rebuilt cluster does not
get the Secret back from Git.

### G10. Proof that it works

Playwright is already in the repo. Chromium's fake camera and microphone flags
allow two browser contexts to join one room and assert that each sees the
other's track (cand-019). The check asks the running token service for its
tokens, first from the built images and then from the deployed URL. The test
runner therefore never holds the LiveKit secret, which keeps G9's rule intact.
For the pre-deploy run the token service container needs the secret from the
operator's shell environment, the same way the prototype gets it today.

The fake-device flags are not in `playwright.config.ts` today and were not
verified against the pinned `@playwright/test` 1.65.0. That is the first thing
to check in the plan; the fallback is a run on a machine with real devices.

Two lessons from `prior-context.md` apply directly:

- "External integrations require at least one real-service test": the token
  service and the client must be exercised against the real LiveKit project,
  not only a fake of the port.
- "Boundary gates must launch the packaged artifact": the final check runs the
  built images, and then the deployed URL, not Vite preview.

## Build required

No adoptable candidate exists for these. They become build tasks in the plan.

1. Meeting domain types and the `RealtimeRoom` and `TokenIssuer` ports in
   `packages/domain` and `packages/application`, with in-memory fakes.
2. The `RealtimeRoom` adapter over `livekit-client` in the web app's
   infrastructure layer.
3. `services/livekit`: token endpoint, server-generated room codes, abuse
   controls, health endpoint, configuration from environment only.
4. Wiring `/meet` and `/join` to a real room: lobby with device preview, tiles,
   mute, leave, connection and permission errors.
5. The guest path, and an honest state for every screen that still runs on
   sample data (dashboard, agents, recordings, settings).
6. Two Dockerfiles, the Kustomize tree, the Argo CD Application, the
   build-and-push workflow, and a web-only build path that does not build
   Tauri or Flutter.
7. Hosted checks: deep links, headers, TLS, a two-participant meeting.

## Risks

1. **A public token endpoint spends the operator's LiveKit Cloud minutes.**
   With guests only, anyone on the internet can ask for a token. Controls to
   specify, each tied to this named failure: server-generated room codes (a
   client cannot name an arbitrary room), short token TTL, a participant cap
   and empty-room timeout on the room, a per-IP rate limit, and an `Origin`
   check. None of these stops a determined abuser; they bound the cost. A
   spending alert on the LiveKit project is the backstop and is outside the
   repo.
2. **The stub sign-in is still in the bundle.** If it stays reachable, a
   visitor can "sign in" by writing `localStorage` and see screens that imply
   features exist. The release must either remove those entry points or label
   them.
3. **The product's name promises more than this release holds.** No agents,
   no dots, no Concierge, no recording, no transcript, no summary. A meeting
   room without them is a plain video call.
4. **Every cluster fact is still second-hand.** No command has been run
   against the cluster. The first cluster-side task must be read-only
   verification of `cluster-context.md`, and it needs the operator to
   authenticate.
5. **Two nodes of unknown size.** The two new workloads are small, and media
   goes to LiveKit Cloud, so this is low. It is still unmeasured.
6. **A wrong hostname makes a DNS record that is never removed.** Carried from
   the assessment; the HTTPRoute hostname needs review before it is applied.
7. **Tauri's webview uses the same bundle.** The `RealtimeRoom` adapter will
   ship in the desktop build too. Desktop is out of scope, so it is not
   verified here, and it must not break the desktop build.

## Lessons recalled

From `prior-context.md`, recorded by agents and treated as information:

- "Boundary gates must launch the packaged artifact". Applied in G10.
- "External integrations require at least one real-service test". Applied in
  G10.
- "Preserve production evidence in dated review folders". Applied: hosted
  check output goes to a new dated folder with a README, never over earlier
  evidence.
- "Ask once at phase boundary for operator-only actions". Applied: the
  operator-only actions are collected below for one approval at plan time, not
  asked piecemeal during execution.
- "Default MVP verification demos to agent-run with recorded authorization".
  Applied: the two-participant check is automated; the operator is not asked to
  join a call by hand.

Knowledge gaps: none recorded in `prior-context.md`.

## Operator-only actions this phase will need

Collected for one approval at the plan boundary. None has been done.

- `gcloud auth login` so cluster commands can run.
- Creating the `LIVEKIT_*` Secret on the cluster from the shell.
- Pinning new dependencies in `versions.toml`.
- Connecting this repository to Argo CD, or approving an agent to do so.
- Making the GHCR packages public.
- Merging pull requests.

## Readiness mapping

No outcome contract is adopted for this phase, so each decision maps to the
contract section it would satisfy.

| Decision | Contract section | New runtime code needed |
|---|---|---|
| `livekit-client` behind `RealtimeRoom` | Desired observable result | Yes |
| `services/livekit` on `livekit-api` | Desired result; safety checks (secret stays server-side) | Yes |
| LiveKit Cloud | Supported environments | No |
| Guests only | User operation; exclusions (accounts) | Yes |
| Static server plus token service | Safety checks (no open write API) | No for serving; config only |
| Headers at the Gateway | Safety checks | No; manifest |
| GHCR, Kustomize, Argo CD | Desired result (reproducible from the repo) | No; config and CI |
| Out-of-band Secret | Safety checks; risk acceptance (manual rotation) | No |
| Two-participant hosted check | Evidence for the user operation | Test code |

The phase cannot reach READY without new runtime code. That follows directly
from the scope decision.

## Open questions for the operator

Scope questions; the plan cannot be sized without them:

- **A1. Guests only for this release?** Recommended: yes.
- **A2. Is the LiveKit Cloud project recorded in memory the one production
  uses?** Recommended: confirm, and set a spending alert on it.
- **A3. What happens to the screens still on sample data** (dashboard, agents,
  recordings, settings, sign-in)? Recommended: keep them out of the release
  navigation. The alternative is a visible "preview" label on each.
- **A4. Does the blocked c13 run gate this release?** Carried from the
  assessment (Q6). The meeting screens are part of the shell c13 was checking.

Infrastructure questions; each has a recommended default and can be settled at
plan time:

- **A5. Registry.** Recommended: GHCR, public packages.
- **A6. Manifests in this repo, deployed by Argo CD.** Recommended: yes.
- **A7. Gateway.** Recommended: create the shared `main-gateway`, because the
  platform's HTTP-01 solver already expects it and each separate Gateway gets
  its own load balancer. It belongs to the platform, which has no repo, so its
  manifest would live here until one exists.
- **A8. Image tag promotion.** Either accept one pull request per release, and
  drop or reword VS-C, or ask for automatic promotion, which adds research and
  a component. Recommended: accept the pull request for the first release.
- **A9. Secret delivery.** Recommended: operator-created Secret for the first
  release.

## Research budget

- Tier 1 (GitHub): 5 queries. Organisation repo list, two repo trees, one
  sparse clone of `conduit` read locally, one manifest read.
- Tier 2 (docs): 8 calls. `livekit-client` connect, `livekit-api` tokens,
  Envoy Gateway v1.10.0, and after review `static-web-server`.
- Tier 3 (registries and repo health): 11 lookups. This is 3 over the cap of
  8, a process deviation recorded here and in `library-candidates.json`.
- Tier 4 (web): 0.
- Memory: 2 searches. The second returned about 220,000 characters; it was
  searched for registry terms and the search failed on pattern complexity, so
  **that result was not read**. The registry verdict rests on the conduit repo,
  not on memory.

Not researched: Argo CD Image Updater, Sealed Secrets installation, LiveKit
Cloud pricing and limits, and `tower_governor` beyond its registry listing.
Confidence in the verdicts that touch those is lower.

## Uncomfortable point

"Real meetings" is the right call for a URL named `meet`, and it is also the
answer that this phase can only partly deliver. What ships is a guest video
call on someone else's media service, behind a token endpoint that anyone can
use, wearing a product name whose distinguishing features are all absent. The
recommended architecture also means the shell built in the previous phase gets
its first real feature while its own verification run is still blocked.

## Recommendation

```
BLOCKED
```

Minimal missing items, both the operator's:

1. Answers to A1 to A4.
2. Adoption of the outcome contract built from those answers, and a selected
   method for the phase.

The candidate set is complete enough to write specs as soon as those exist.
A5, A6, A7 and A9 do not block: the plan can carry the recommended defaults.
A8 needs an explicit answer because its default changes a proposed scenario.

## Review record

- Adversarial review: verdict PASS, 0 critical, 5 warnings, 3 suggestions
  (`review/analyze/findings.json`).
- Judge: `glm-5.3` through the local gateway. `MiniMax-M3`, used for the
  assess review, returned output the tool could not parse on two attempts, so
  the judge was switched by environment override. The run recorded
  `cross_model_check: unverified-producer-unknown`: the tool could not confirm
  independence from this session's model, although the judge is a different
  vendor.
- Warnings addressed in this file after the review: DNS has no owner (added
  under G8); the proof design contradicted the secret rule (resolved in G10);
  `static-web-server` adopted on unread docs (docs read, G5 updated); the
  image-tag default fails VS-C (A8 now needs an answer); the publish scripts
  were not evaluated (cand-021).
- Suggestions addressed: a rate-limit candidate is recorded (cand-020); the
  budget overage is recorded; the fake-device check is named as the first plan
  task.
- The revised text was not re-reviewed.

```
ANALYSIS COMPLETE
```
