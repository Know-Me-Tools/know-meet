# Assessment: web-release

```
ASSESSMENT: web-release
Project: know-meet
Date: 2026-11-14
Codebase baseline: main at 0762412 (PR #4 merged); assessed on branch
  feat/round-5-ui-kit-flutter-commands at 3590e0a, one merge commit behind main,
  with 138 uncommitted changes from other work.
Cross-tool progress: none for this phase (0 changes registered)
```

This is fact-finding. It proposes nothing as decided. Repo claims cite the file
or command they came from. Cluster claims come from Surreal Memory, read through
the Surreal Memory MCP server, and cite the memory record in
`cluster-context.md`; none was observed on the cluster. Items marked UNKNOWN
were not observed at all.

## Headline

A web bundle artifact exists, but the build was not verified in this
assessment, nothing in the repo can put a bundle on a cluster, and what the
bundle does today is display sample data. Three facts shape the whole phase:

1. **No deployment packaging exists.** There is no Dockerfile, container
   build, Kubernetes manifest, Helm chart, Kustomize overlay, Argo CD
   Application or web deploy workflow in the repo.
2. **The web app is a shell on sample data.** It has no LiveKit client, sign-in
   is a `localStorage` stub, and every product screen reads fixtures. Deployed
   as it is, `meet.know-me.tools` would show the screens but nobody could hold
   a meeting.
3. **No server in the repo can run on a cluster as written.** There are three:
   - `services/bff` (the product's server) binds to loopback, rejects any
     request whose `Host` is not loopback, and exposes an unauthenticated notes
     API.
   - `docs/design/live/server.mjs` belongs to the frozen design prototype.
   - `live/server.mjs` at the repo root is a stale duplicate of that prototype.
     CLAUDE.md says not to use the root `live/` folder. It must not be deployed
     or used as a source.

What "release" means, shell preview or working meetings, is not stated in the
goals and is the first decision for the operator (Q1).

## Implementation status

| Area | Status | Evidence |
|---|---|---|
| Web bundle build | PARTIAL | `apps/web/scripts/build.mjs` runs `tsc --noEmit` then `vite build`. `apps/web/dist/` exists, dated 2026-11-13. Not rebuilt in this assessment (see Build health). |
| Production configuration of the bundle | PARTIAL | `vite.config.ts` reads `KM_LIVEKIT_URL` and `KM_MEDIA_ORIGINS` from the process environment at build time to write the CSP meta tag. No runtime configuration mechanism, so the LiveKit URL is baked into the image at build. |
| Client-side routing in production | MISSING | `apps/web/src/app/router.tsx` uses TanStack Router with the default browser history and paths `/`, `/dashboard`, `/agents`, `/recordings`, `/settings`, `/notes`, `/auth`, `/join`, `/meet`. No server in the repo returns `index.html` for those paths: the BFF's `ServeDir` fallback has no SPA fallback. A deep link or reload on `/dashboard` would 404. |
| Security headers when hosted | MISSING | No serving component is chosen (Q7), so no hosted header exists. The pieces: the bundle carries a CSP meta tag (`csp-meta-plugin.ts`); `apps/web/scripts/content-security-policy.ts` documents `buildContentSecurityPolicyHeader()` for hosted serving, adding `frame-ancestors`, and nothing calls it from a server; the BFF sets `nosniff` and `X-Frame-Options: DENY` only (`main.rs:76-83`). HSTS, Referrer-Policy and Permissions-Policy are set nowhere: `grep -rniE "strict-transport|referrer-policy|permissions-policy"` over `services/`, `apps/web/src`, `apps/web/scripts`, `apps/web/index.html` and `apps/web/vite.config.ts` returned no matches. |
| Docs-site publishing scripts | DONE, not applicable | `scripts/build-site.sh`, `scripts/publish-pages.sh` and `scripts/publish-ipfs.sh` stage and publish `docs/design/` (the brand kit and static prototype) to GitHub Pages and IPFS. They do not build or publish `apps/web`. They are not a web-app release path. |
| Real meetings (LiveKit in the web app) | MISSING | `apps/web/package.json` has no `livekit-client` dependency. `grep` for `livekit` in `apps/web/src` finds only settings UI, fixtures and copy. `/meet` renders UI state, not a room. |
| LiveKit token service | MISSING in the app; DONE in the prototype | `docs/design/live/server.mjs` mints short-lived HS256 LiveKit tokens at `/api/token` from `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, with no npm dependencies. It belongs to the frozen design prototype, not to the product. `services/bff` has no token route. |
| Sign-in | STUB | `apps/web/src/infrastructure/session/local-session.ts`: "Static signed-in state for the frame (contract exclusion: no real auth in this phase)". It reads `localStorage` key `km-auth`. |
| Product data | STUB | Screens read `sample-workspace.ts`, `sample-meetings.ts` and `agents-fixtures.ts`. `sample-workspace.ts` names a LiveKit Cloud URL as sample data. |
| Backend for frontend (`services/bff`) | PARTIAL, not deployable | Axum 0.8.8. Routes: `/api/notes` (GET, POST), `/api/capabilities`, `/api/runtime` (always 503). `main.rs:113` binds `Ipv4Addr::LOCALHOST`. `main.rs:61-64` allows only `127.0.0.1:<port>` and `localhost:<port>` as `Host`. Notes are a single SQLite file under `APP_DATA_DIR`. No authentication on any route. |
| Container image | MISSING | `git ls-files` has no Dockerfile, `.dockerignore` or compose file. |
| Kubernetes manifests | MISSING | No Deployment, Service, Gateway, HTTPRoute, Certificate, namespace or NetworkPolicy. |
| GitOps wiring | MISSING | No Argo CD Application or AppProject. Memory records that Argo CD on the cluster has no repository connected. |
| CI for web delivery | MISSING | `.github/workflows/release.yml` verifies the repo and builds Tauri desktop installers into a draft GitHub Release. No job builds or pushes a web image or deploys. `ci.yml` builds the web bundle as part of `turbo run build`. |
| Public endpoint | MISSING | `dig +short meet.know-me.tools` returned nothing and `curl -I https://meet.know-me.tools` got no response on 2026-11-14. |
| Target cluster platform | PARTIAL (from memory, unverified) | See the next section. |

## Cluster setup by category

All values are from Surreal Memory records, cited by the first eight characters
of the record id; full ids and details are in `cluster-context.md`.

| Category | Recorded | Source | Gap |
|---|---|---|---|
| Ingress | Envoy Gateway v1.10.0, Gateway API CRDs v1.6.1 | `d208848e` | Shared `main-gateway` not created (`881f511b`, `8bd62299`) |
| TLS | cert-manager v1.21.3; ClusterIssuers `letsencrypt-staging`, `letsencrypt-prod`; DNS-01 through Cloudflare | `881f511b` | Issuer manifest is in no repo (`8bd62299`), so the issuer names are unverified until checked on the cluster |
| DNS | external-dns v0.24.0 on Cloudflare; the token covers nine zones including `know-me.tools`; policy `upsert-only`; no domain filter | `cccc18fb` | `meet.know-me.tools` does not resolve today. A wrong record is removed by hand in Cloudflare |
| Registry | nothing | none | UNKNOWN |
| GitOps | Argo CD v3.6.1, ClusterIP only, admin login verified | `8bd62299` | No repository, Application or AppProject recorded |
| Namespaces | `envoy-gateway-system`, `cert-manager`, `external-dns`, `argocd`; one app namespace, `tribehealth` | `d208848e` | None for Know Meet |
| Secrets | Cloudflare token in two Secrets; Argo CD admin credentials in shell variables | `cccc18fb`, `8bd62299` | No secret management tool recorded |
| Capacity | GKE Standard, v1.36, 2 nodes, Workload Identity off | `d208848e` | Machine type and autoscaling UNKNOWN |

The eight items not in memory: container registry, GitOps repository,
Know Meet namespace, runtime secret delivery, backend services (LiveKit server,
token service), node capacity, observability, and ownership of `main-gateway`.

## Cross-tool progress

NONE. `progress.json` for `web-release` has 0 changes and 0 tasks.

Related state in the previous phase, read from
`phases/hybrid-shell-foundation/progress.json`:

- `c13-fidelity-verification-and-evidence`: BLOCKED.
- `c16-agentic-core-gates`: IN_PROGRESS.
- c09 to c12, c14, c15: DONE.

The phase that built the web shell has not passed its own verification
boundary. A web release would ship a shell whose fidelity, accessibility and
security evidence run is recorded as blocked. Whether that blocks this phase is
an operator decision (Q6).

## Spec gap summary

`openspec/specs/` is empty: no canonical spec has been synced from the 16
changes under `openspec/changes/`. There is therefore no spec for deployment,
hosting, runtime configuration or release to compare against.

- **Deployment is unspecified.** No change, spec or doc describes hosting the
  web app. `docs/release/desktop-releases.md` covers desktop only.
- **Runtime configuration is unspecified.** The CSP depends on the LiveKit URL
  at build time. Nothing says how one image serves more than one environment.
- **The serving component is unspecified.** The repo has three candidates and
  none is ready: the BFF (loopback only), the prototype's Node server
  (prototype only), or a static file server (not present).
- **Root `README.md` describes the product as working** (recording, delivery,
  IPFS recall) while the app is on sample data. It says the prototype is
  simulated, but a visitor to a live `meet.know-me.tools` would have no such
  notice. This is a product-truth gap, not a code defect.

## Build health

- build check: **UNKNOWN**. Not run. `pnpm run build` also builds Tauri and
  Flutter, and `apps/web/dist/` may be the bundle the blocked c13 evidence run
  is bound to (`verify:bundle-identity`). Rebuilding from a tree with 138
  uncommitted changes could overwrite that evidence, so the assessment left it
  alone. Last known signal: commit `425ae27` "green scaffolding across web,
  desktop, Flutter and Rust", and a `dist/` dated 2026-11-13.
- known violations: UNKNOWN (lint not run, same reason).
- test coverage: **MINIMAL** for a hosted release.
  - Existing and relevant: `features/vs-5-web-without-tauri.feature` checks
    that the production web build renders the home route in a plain browser
    with no console errors and no Tauri reads. It serves the build with Vite
    preview and covers the home route only. `features/vs-1-web-fidelity.feature`,
    `accessibility.feature`, `motion.feature` and `flat-controls.feature`, with
    `tests/fidelity`, cover look and behaviour of the shell. These belong to
    the blocked c13 boundary run.
  - Existing, not about hosting: `apps/web/tests/unit`,
    `features/vs-8-repository-rules.feature`.
  - Not covered by anything: a container, a manifest, the deployed URL, SPA
    fallback on deep links, response headers, TLS, health checks, rollback.

## Constraint check

- AGENTS.md / CLAUDE.md violations: NONE observed for this phase's scope. Two
  rules bind the work ahead:
  - "Never commit LiveKit or other secrets. `LIVEKIT_*` values come only from
    the shell environment and stay server-side." On a cluster, "the shell
    environment" becomes a Kubernetes Secret, and memory records no secret
    management tool on the cluster.
  - The 500-line and kebab-case rules apply to manifests and scripts. The
    exceptions list names `Dockerfile` as a tool-mandated name.
- constraints.md violations: UNKNOWN. The checks were not executed in this
  assessment. `no-livekit-secrets-in-repo`, `no-hardcoded-secrets` and
  `token-secret-stays-server-side` all apply to deployment manifests.
- constraints.md is stale in two places. Line 8 says "Build, test and lint
  commands are not defined yet", but `project.json` now sets all three (noted
  there as set by c14). Line 46 says the 500-line checker is "to be added", but
  `tooling/repo-rules/src/check-lines.ts`, `tooling/ls-lint` and
  `tooling/git-hooks/pre-commit` exist. Whether those rules cover the file
  types this phase adds (Dockerfile, YAML manifests, shell) was not checked.

## Risks found

1. **Publishing a shell as a product.** With sample data and stub sign-in, a
   public URL would look like a working service. Anyone could "sign in" by
   writing `localStorage`.
2. **Unauthenticated write API.** If the BFF is deployed to serve the bundle,
   `/api/notes` POST is open to the internet and writes to one shared SQLite
   file with no tenant separation.
3. **Cluster facts are second-hand.** Everything in `cluster-context.md` comes
   from memory written by another session today. None of it was observed here.
   The baseline's issuer manifest and Helm values are recorded as living only
   in that session's scratchpad.
4. **Two nodes, no recorded sizing.** Memory records 2 nodes with no machine
   type or autoscaling. Capacity for the workload is UNKNOWN.
5. **external-dns never deletes.** Policy is `upsert-only` with no domain
   filter, across nine zones. A wrong hostname on a route creates a record that
   stays until removed by hand.
6. **Dirty tree on a merged branch.** The working tree is on the merged feature
   branch with 138 uncommitted changes. Work for this phase needs a clean base
   from `main`.

## Lessons recalled

From `prior-context.md` (recorded by agents; treated as information):

- "reviews via liter-llm MiniMax-M3 judge with Kimi k3.1-pro critic because
  k3.1-pro times out upstream on long reviews". Applied: the adversarial review
  of this file expects the Kimi critic may time out.
- "adapt knowme-builder (scratch generate, keep Tauri + Flutter hosts with
  shell-only stubs, strip rust-core/Axum/UAR/PEM)" and the later plan note
  "generator import (keep-all per operator)". Applied: this explains why
  `services/bff` exists as generator baseline code and is not a designed
  production server. Its README still carries the generator's title.
- "Background agents stop whenever this session ends". Applied: any long
  cluster operation in later stages should not depend on a background agent
  surviving the session.

Knowledge gaps: none recorded in `prior-context.md`.

## Goal progress

| Goal | Status | Reason |
|---|---|---|
| Ship a web-only release at https://meet.know-me.tools | NOT MET | No packaging, no manifests, no DNS record, no pipeline. |
| Desktop and mobile out of scope | MET | Recorded as an exclusion. Note that `pnpm run build` and `release.yml` build desktop and mobile, so a web release needs a web-only build path. |
| Extract cluster setup from Surreal Memory and configure to match | PARTIAL | Extraction done and sourced in `cluster-context.md`. Configuration not started. Eight items are not in memory. |
| Plan the release specifically | NOT MET | Assessment only. Planning follows analyze. |
| Secrets stay server-side and out of the repo | PARTIAL | True of the repo today by rule. No mechanism exists yet for secrets on the cluster. |
| Follow the full KBD process with OpenSpec changes | PARTIAL | Phase created through the runtime; assess in progress. |

## Adopted-outcome contract inputs

Recorded for the operator to adopt or correct. Only items marked "operator" are
adopted; the rest are proposals.

- **Decision owner:** Travis James (operator).
- **One useful shipped user operation:** UNKNOWN, pending Q1. Two candidates:
  - (a) A visitor opens `https://meet.know-me.tools` and can browse the Know
    Meet web shell over valid TLS.
  - (b) A visitor opens the URL, starts or joins a meeting, and is in a real
    LiveKit room with audio and video.
- **Observed baseline:**
  - `meet.know-me.tools` does not resolve (observed 2026-11-14).
  - No deployable artifact exists in the repo (observed).
  - Web app is on sample data with stub sign-in and no LiveKit client (observed).
  - Cluster state: UNKNOWN first-hand; recorded in memory as in
    `cluster-context.md`.
  - Web build health on `main`: UNKNOWN.
- **Desired observable result:** UNKNOWN until Q1. At minimum, for either
  candidate: the URL serves the current `main` web build over a valid
  Let's Encrypt certificate, deep links and reloads work on every route, and
  the deployment is reproducible from the repo.
- **Supported environments:** web browsers only (operator: "web-based release
  only"). Which browsers and viewport sizes: UNKNOWN. The design rules name
  375, 768, 1024 and 1440 widths in both themes.
- **Required safety and security checks (proposed):** no secret in the image,
  the repo or the bundle; TLS valid; CSP and security headers present as
  response headers; no unauthenticated write endpoint reachable from the
  internet; container runs as non-root.
- **Exclusions (operator):** desktop (Tauri) and mobile (Flutter).
- **Exclusions (proposed):** recording, delivery, calendars, SIP dial-in,
  agent dispatch, IPFS recall.
- **Risk acceptance:** none recorded. Risks 1 to 5 above need an explicit
  accept or mitigate.

## Value scenario proposals

Proposals only; none is adopted. Likelihood is UNKNOWN for all, since there is
no usage data.

| # | Actor and outcome | Source | Reason now | Constraint |
|---|---|---|---|---|
| VS-A | A visitor loads `https://meet.know-me.tools` and gets the home screen over valid TLS | Goal 1 | It is the release | Certificate from `letsencrypt-prod` |
| VS-B | A visitor reloads or deep-links `/dashboard`, `/join`, `/meet` and gets the app, not a 404 | Router uses browser history; no SPA fallback exists | Would fail on first reload | Hosting must rewrite to `index.html` |
| VS-C | The operator merges to `main` and the new build is live with no manual cluster commands | Goal 4; Argo CD is installed | Avoids a hand-deployed release | Needs a registry and a GitOps repo |
| VS-D | The operator rolls back to the previous build | Assumption | First public release | Image tags must be immutable |
| VS-E | A visitor starts a meeting and is in a real LiveKit room | Candidate (b) in Q1 | Only if the operator chooses (b) | Token service and LiveKit server required |
| Rare-critical | A request reaches a write API without authentication | BFF `/api/notes` | Would be public on day one | Must be impossible in the release |

## Open questions for the operator

- **Q1. What does this release do?** (a) shell preview on sample data, with a
  visible notice; (b) real meetings through LiveKit; or (c) something between.
  This sets the size of the phase more than any other answer.
- **Q2. Target cluster.** Confirmed in conversation as GKE `main` in
  `knowme-corporate`. Recorded here as operator-confirmed on 2026-11-14.
- **Q3. Container registry.** Not in memory. Google Artifact Registry in
  `knowme-corporate`, GitHub Container Registry, or another.
- **Q4. GitOps repository.** Manifests in this repo, or a separate infra repo
  that Argo CD watches. The platform baseline itself is in no repo.
- **Q5. Gateway.** Create the shared `main-gateway` in this phase, or give
  Know Meet its own Gateway.
- **Q6. Does blocked c13 gate this release?** The shell's fidelity, security
  and accessibility boundary run has not completed.
- **Q7. Serving component.** Static file server, the BFF made deployable, or a
  new service. Depends on Q1.
- **Q8. Secrets on the cluster.** If Q1 is (b): how `LIVEKIT_*` reach the
  cluster, and which LiveKit server (LiveKit Cloud or self-hosted).

## Uncomfortable point

The request is to plan a release, and the honest reading of the code is that
there is not yet a product to release, only a faithful shell. A deployment
plan can be made to succeed on its own terms (URL up, TLS valid) while
shipping something that cannot hold a meeting. That choice should be explicit.

## Review record

- Sycophancy check: score 0.0, no patterns (`sycophancy/`), run on the prose
  sections.
- Adversarial review: verdict PASS, 0 critical, 9 warnings, 0 suggestions
  (`review/assess/findings.json`). Judge MiniMax-M3 through the local gateway,
  selected by environment override after the configured judge, k3.1-pro, timed
  out twice with upstream error 524. The run recorded
  `cross_model_check: unverified-producer-unknown`, so independence from the
  producer is not proven by the tool, although the judge is a different vendor.
- All nine warnings were addressed in this file after the review. The revised
  text was not re-reviewed.
- Still open from the warnings: the web build on `main` is unverified, and the
  constraint and lint checks were not run.

```
ASSESSMENT COMPLETE
```
