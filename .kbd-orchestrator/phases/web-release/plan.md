# Plan: web-release

```
PLAN: web-release
Project: know-meet
Date: 2026-11-14
OpenSpec available: YES (2.0.0, refreshed through the managed runner today)
Changes to implement: 9
Tasks: 39
Contract: .kbd-orchestrator/phases/web-release/adopted-contract.json
  ADOPTED by the operator; digest after amendment 2 (2026-11-16)
  abf8d22d66112ffbd92b1ff79ccf8b754acd6befa0828225c28cee4ac01882db
  decision contract-adoption-web-release-abf8d22d, plan revision 1
  (first adoption 9ccc9805…, amendment 1 772bfa1f…)
Method: VLBV, selected by the operator
```

## What this plan delivers

Two guests hold a real video meeting at `https://meet.know-me.tools`. Nothing
else from the product is in this release. The contract's `releaseClaim`,
`exclusions` and nine scenarios (WR-1 to WR-9) are the acceptance; this file
orders the work that reaches them.

## Operator decisions this plan rests on

All from 2026-11-14, recorded in `decision-log.md` and as runtime decisions:
real meetings; guests only; the existing LiveKit Cloud project; screens on
sample data left out of the hosted build; c13 is not a gate; a pull request
bumps the image tag. Target cluster: GKE `main`, `knowme-corporate`,
`us-south1`.

Adopted with the contract, from the analysis defaults: GitHub Container
Registry with public packages, manifests in this repo deployed by Argo CD, a
shared `main-gateway`, an operator-created Secret. The phase works in a
separate git worktree on a new branch from `main`; the existing checkout and
its uncommitted changes are left untouched.

## Method

The operator selected VLBV for this phase. AGENTS.md also requires one
integration gate at the end of the phase with only narrow compiler checks
before it. This plan is written to that rule: acceptance is defined in wr01
before any production code, no generated code is tested until wr09, and wr09
is one boundary run.

The cost of that rule here is stated under Risks, item 1.

## Change list (ordered)

Role names are the `.agent-team/know-meet-team` roles; each writes only inside
its owned paths. `library:` refers to `library-candidates.json`.

1. **wr01-release-scenarios**: acceptance, clean base and prerequisites
   - Scope: tests (definition only), repo meta
   - Depends on: NONE
   - Roles: bdd-quality, design-lead, delivery-lead, build-platform,
     livekit-platform (task 1.6, run by the lead in that role's paths)
   - Est. complexity: M. Complexity score: Medium. Model class: frontier
   - Customer value: MEDIUM (nothing visible; everything else is judged by it)
   - Details: Write WR-1 to WR-9 as Gherkin in `features/` and as Playwright
     spec skeletons in `tests/release/` with packaged and hosted projects.
     Start a clean branch from `main`. Collect the dependency pins the
     operator must add to `versions.toml`. Check every fact in
     `cluster-context.md` against the live cluster with read-only commands and
     record what was observed, so wr08 is written on observed facts.

2. **wr02-meeting-domain-and-ports**: meeting types, ports and fakes
   - Scope: domain, application
   - Depends on: wr01
   - Roles: architect, build-platform
   - Est. complexity: M. Complexity score: Medium. Model class: frontier
   - Customer value: MEDIUM
   - Details: Room code, participant and connection-state types in
     `packages/domain`. `RealtimeRoom` and `TokenIssuer` ports, the start,
     join, leave and mute use cases, and in-memory fakes in
     `packages/application`. No framework or LiveKit imports.

3. **wr03-token-service**: the server that issues room codes and tokens
   - Scope: api
   - Depends on: wr01
   - Roles: livekit-platform
   - library: cand-003 (adopt), cand-004 (reference), cand-020 (evaluate)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details: New Axum crate `services/livekit`. It generates room codes,
     issues a short-lived token only for a code it generated, and exposes a
     health endpoint. Configuration comes from the environment only. Abuse
     controls: rate limit keyed on the forwarded client address, `Origin`
     check, participant cap and empty-room timeout.

4. **wr04-realtime-adapter**: LiveKit behind the port
   - Scope: infrastructure
   - Depends on: wr02, wr03 (task 4.2 follows the HTTP contract wr03 defines)
   - Roles: webrtc-engineer, client-shell
   - library: cand-001 (adopt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details: `packages/realtime` implements `RealtimeRoom` over
     `livekit-client`: connect, tracks, mute, device selection, reconnection
     and typed errors. The web app gets an HTTP `TokenIssuer` adapter and the
     composition wiring.

5. **wr05-guest-meeting-flow**: the three screens become real
   - Scope: ui
   - Depends on: wr02, wr04
   - Roles: ui-engineer
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details: Home starts a meeting or joins by code. The join lobby takes a
     display name and shows a device preview. The meeting room shows tiles,
     speaking state, mute and leave, with not-found, permission-denied and
     disconnected states. Existing Know Meet design is preserved; Impeccable
     governs the work, with `audit` and `polish` before handoff.

6. **wr06-hosted-release-surface**: only what works is reachable
   - Scope: app shell, build
   - Depends on: wr01
   - Roles: client-shell
   - Est. complexity: M. Complexity score: Medium. Model class: medium
   - Customer value: HIGH (this is what stops the release overclaiming)
   - Details: A hosted build mode whose router and navigation expose only
     home, join and the meeting room, with a not-found state for every other
     path and no stub sign-in entry point. A `build:hosted` script that builds
     the web bundle alone and writes the CSP header value as a build artifact.

7. **wr07-container-images**: two images and their pipeline
   - Scope: build, CI
   - Depends on: wr03, wr06
   - Roles: build-platform, client-shell, livekit-platform
   - library: cand-008 (adopt), cand-010 (adopt)
   - Est. complexity: M. Complexity score: Medium. Model class: medium
   - Customer value: MEDIUM
   - Details: A static image on `static-web-server` with page fallback, and a
     multi-stage image for the token service; both non-root. A workflow builds
     and pushes both to GHCR tagged by commit SHA and records digests. A
     local compose file mirrors the route split for the packaged run. Repo
     rules cover the new file types.

8. **wr08-cluster-manifests**: everything the cluster needs, in Git
   - Scope: infra
   - Depends on: wr07, and task 1.6 (observed cluster facts)
   - Roles: livekit-platform, delivery-lead
   - library: cand-012 (adopt), cand-014 (adapt), cand-015 (adopt),
     cand-016 (adopt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details: Kustomize base and production overlay under `infra/k8s`; the
     shared Gateway under `infra/platform`; HTTPRoutes with the `/api` split,
     HTTP redirect and the header filter generated from the CSP artifact; the
     certificate path from staging to production; one Argo CD Application;
     read-only cluster and endpoint verification tools; the operator runbook;
     and the pull request that pins the release image tags.

9. **wr09-release-boundary**: the single run, then go-live
   - Scope: all
   - Depends on: wr01 to wr08, except task 8.6, which runs inside the
     boundary after the second approval (amendment 2)
   - Roles: bdd-quality, security-reviewer, independent-reviewer,
     livekit-platform, delivery-lead
   - library: cand-019 (adopt)
   - Est. complexity: L. Complexity score: High. Model class: frontier
   - Customer value: HIGH
   - Details: Runs the contract's boundary packet once, in order: static
     gates, packaged run against the built images, reviews, then, after a
     second operator approval, cluster verification, sync, DNS and
     certificate, and the hosted run at the public URL. Evidence goes to a new
     dated folder.

## Tasks

Backend task IDs are the OpenSpec task ordinals. The full key is phase path
`web-release` + change ID + task ID.

| Change | Task | Title | Role | Scenarios |
|---|---|---|---|---|
| wr01 | 1.1 | Write release value scenarios and spec skeletons | bdd-quality | WR-1 to WR-5, WR-7, WR-9 |
| wr01 | 1.2 | Define the secret-hygiene scenario and scan contract | bdd-quality | WR-6 |
| wr01 | 1.3 | Define accessibility and design acceptance for the three screens | design-lead | WR-8 |
| wr01 | 1.4 | Start a clean branch from main | delivery-lead | none |
| wr01 | 1.5 | Collect pins and operator prerequisites | build-platform | none |
| wr01 | 1.6 | Verify cluster-context.md against the live cluster, read-only | livekit-platform | WR-3, WR-7 |
| wr02 | 2.1 | Add meeting domain types | architect | WR-1 |
| wr02 | 2.2 | Add RealtimeRoom and TokenIssuer ports, use cases and fakes | architect | WR-1 |
| wr02 | 2.3 | Extend boundary lint to packages/realtime and services/livekit | build-platform | WR-9 |
| wr03 | 3.1 | Create the services/livekit crate with env config and health | livekit-platform | WR-1, WR-6 |
| wr03 | 3.2 | Issue room codes and scoped short-lived tokens | livekit-platform | WR-1, WR-4 |
| wr03 | 3.3 | Add rate limit, Origin check and room limits | livekit-platform | WR-4 |
| wr03 | 3.4 | Document the service and its configuration | livekit-platform | none |
| wr04 | 4.1 | Implement the RealtimeRoom adapter over livekit-client | webrtc-engineer | WR-1 |
| wr04 | 4.2 | Add the HTTP TokenIssuer adapter and composition wiring | client-shell | WR-1 |
| wr05 | 5.1 | Wire home to start and join | ui-engineer | WR-1, WR-8 |
| wr05 | 5.2 | Build the join lobby with device preview | ui-engineer | WR-1, WR-8 |
| wr05 | 5.3 | Make the meeting room live | ui-engineer | WR-1, WR-8 |
| wr05 | 5.4 | Audit and polish the three screens | ui-engineer | WR-8 |
| wr06 | 6.1 | Add the hosted build mode and its route set | client-shell | WR-5 |
| wr06 | 6.2 | Remove sign-in and sample-data entry points in hosted mode | client-shell | WR-5 |
| wr06 | 6.3 | Add build:hosted and emit the CSP header artifact | client-shell | WR-3 |
| wr07 | 7.1 | Add the static web image | client-shell | WR-2 |
| wr07 | 7.2 | Add the token service image and the artifact scan | livekit-platform | WR-6 |
| wr07 | 7.3 | Add the build-and-push workflow | build-platform | WR-7 |
| wr07 | 7.4 | Add the local compose stack and extend repo rules | build-platform | WR-9 |
| wr08 | 8.1 | Add the Kustomize base and production overlay | livekit-platform | WR-7 |
| wr08 | 8.2 | Add the Gateway, HTTPRoutes and header filter | livekit-platform | WR-2, WR-3 |
| wr08 | 8.3 | Add the certificate path from staging to production | livekit-platform | WR-3 |
| wr08 | 8.4 | Reference the Secret by name and write the operator runbook | livekit-platform | WR-6 |
| wr08 | 8.5 | Add the Argo CD Application and the verification tools | livekit-platform | WR-7 |
| wr08 | 8.6 | Pin the release image tags in the production overlay by pull request | delivery-lead | WR-7 |
| wr09 | 9.1 | Run static gates and the artifact scan | bdd-quality | WR-6, WR-9 |
| wr09 | 9.2 | Run the packaged scenarios against the built images | bdd-quality | WR-1, WR-2, WR-4, WR-5 |
| wr09 | 9.3 | Run accessibility, UI review and security review | independent-reviewer | WR-8 |
| wr09 | 9.4 | Verify the cluster, sync and compare digests | livekit-platform | WR-7 |
| wr09 | 9.5 | Confirm the DNS record and issue the certificate | livekit-platform | WR-3 |
| wr09 | 9.6 | Run the hosted scenarios at the public URL | bdd-quality | WR-1 to WR-5 |
| wr09 | 9.7 | Update the README and release notes to match what shipped | delivery-lead | none |

Scenarios, from the draft contract (which exists on disk at the path in the
header and validates against the contract schema):

| ID | Scenario |
|---|---|
| WR-1 | Two guests hold a real meeting at the public URL |
| WR-2 | Deep links and reloads return the app |
| WR-3 | Valid TLS and security headers at the public URL |
| WR-4 | The public token endpoint bounds abuse |
| WR-5 | Screens on sample data are not reachable in the hosted build |
| WR-6 | No secret in the repo, the bundle, the images or the manifests |
| WR-7 | The deployment is reproducible from the repo |
| WR-8 | The three shipped screens are accessible and match the design |
| WR-9 | Repository rules hold and the other shells still build |

Every scenario has a defining task in wr01, at least one building task, and a
verifying task in wr09. The map is the `ownerTask` field of each scenario in
the contract.

## Task model assignments

Evidence for all rows, dated 2026-11-14: this session's Agent tool lists the
team roles as subagent types and accepts a model override of `sonnet`, `opus`,
`haiku` or `fable`. That shows the routes are configured. None was exercised
during planning, so every route is **configured, not verified**. No local
benchmark compares these models on this repo; rationales rest on what each task
demands. Reasoning effort is left at the harness default for every row,
because the Agent tool sets effort only on explicit instruction.

Routes:

- **R-O**: Claude Code native subagent of the named role, model
  `claude-opus-5-5`. Native alternative: the same role on `claude-sonnet-5-5`.
- **R-S**: Claude Code native subagent of the named role, model
  `claude-sonnet-5-5`. Native alternative: the same role on `claude-opus-5-5`.
- **R-L**: the lead session (`claude-fable-5-2`) acting in the delivery-lead
  role, no subagent.
- **R-J**: independent review through the local liter-llm gateway
  (`http://localhost:4000/v1`, chat completions), judge `glm-5.3`. Verified
  today for artifact review. Alternates: `MiniMax-M3` (unparseable output
  three times today), `k3.1-pro` (upstream timeouts). The review skill's
  scripts are the launcher; an inference response is not workspace execution.

Worker contract for R-O and R-S: scope is the task's files inside the role's
owned paths; working directory is the phase worktree; skills are those
CLAUDE.md requires for the file types touched; the result returns to the lead
session as changed files plus a report, and the lead owns task completion.

| Phase path | Change ID | Backend task ID | Requirements | Provider/model | Reasoning effort | Rationale and dated evidence | Harness and route | Worker launch and handoff | Native alternative | Availability and verification | Prerequisites |
|---|---|---|---|---|---|---|---|---|---|---|---|
| web-release | wr01-release-scenarios | 1.1 | Acceptance design, high ambiguity, tests only | Anthropic claude-opus-5-5 | default | Scenarios decide what done means | Claude Code, R-O | bdd-quality | sonnet | configured | none |
| web-release | wr01-release-scenarios | 1.2 | Security acceptance, small scope | Anthropic claude-opus-5-5 | default | Negative control must discriminate | Claude Code, R-O | bdd-quality | sonnet | configured | none |
| web-release | wr01-release-scenarios | 1.3 | Design judgement, images | Anthropic claude-opus-5-5 | default | Needs DESIGN.md and prototype reading | Claude Code, R-O | design-lead | sonnet | configured | impeccable context |
| web-release | wr01-release-scenarios | 1.4 | Git only, low risk if careful | Anthropic claude-fable-5-2 | default | Touches the dirty tree question; lead holds context | Claude Code, R-L | lead session | none | verified (in use) | operator answer on the dirty tree |
| web-release | wr01-release-scenarios | 1.5 | Lookup and listing | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | build-platform | opus | configured | none |
| web-release | wr01-release-scenarios | 1.6 | Read-only kubectl, comparison, no writes | Anthropic claude-fable-5-2 | default | Needs operator auth in the lead session; findings change wr08 | Claude Code, R-L | lead session | none | verified (in use) | gcloud auth login (pre-execution batch) |
| web-release | wr02-meeting-domain-and-ports | 2.1 | Domain modelling, small | Anthropic claude-opus-5-5 | default | Types constrain every later change | Claude Code, R-O | architect | sonnet | configured | none |
| web-release | wr02-meeting-domain-and-ports | 2.2 | Interface design, medium | Anthropic claude-opus-5-5 | default | Port shape must fit LiveKit without importing it | Claude Code, R-O | architect | sonnet | configured | none |
| web-release | wr02-meeting-domain-and-ports | 2.3 | Lint config | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | build-platform | opus | configured | none |
| web-release | wr03-token-service | 3.1 | Rust, Axum, config | Anthropic claude-sonnet-5-5 | default | Scaffold with known patterns | Claude Code, R-S | livekit-platform | opus | configured | pins |
| web-release | wr03-token-service | 3.2 | Security-sensitive Rust | Anthropic claude-opus-5-5 | default | Token scope errors are the phase's worst failure | Claude Code, R-O | livekit-platform | sonnet | configured | pins |
| web-release | wr03-token-service | 3.3 | Security-sensitive, proxy semantics | Anthropic claude-opus-5-5 | default | Forwarded-address handling is easy to get wrong | Claude Code, R-O | livekit-platform | sonnet | configured | cand-020 evaluation |
| web-release | wr03-token-service | 3.4 | Writing | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | livekit-platform | opus | configured | none |
| web-release | wr04-realtime-adapter | 4.1 | WebRTC, async state, high uncertainty | Anthropic claude-opus-5-5 | default | Hardest code in the phase; no test until the boundary | Claude Code, R-O | webrtc-engineer | sonnet | configured | pins |
| web-release | wr04-realtime-adapter | 4.2 | TypeScript wiring | Anthropic claude-sonnet-5-5 | default | Small adapter | Claude Code, R-S | client-shell | opus | configured | wr03 HTTP contract (3.2) |
| web-release | wr05-guest-meeting-flow | 5.1 | React, design fidelity | Anthropic claude-opus-5-5 | default | UI behaviour with design constraints | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-release | wr05-guest-meeting-flow | 5.2 | React, media permissions | Anthropic claude-opus-5-5 | default | Device and permission states | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-release | wr05-guest-meeting-flow | 5.3 | React, live state | Anthropic claude-opus-5-5 | default | Largest UI task | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-release | wr05-guest-meeting-flow | 5.4 | Design review, images | Anthropic claude-opus-5-5 | default | Judgement task | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-release | wr06-hosted-release-surface | 6.1 | Router config | Anthropic claude-sonnet-5-5 | default | Bounded change | Claude Code, R-S | client-shell | opus | configured | none |
| web-release | wr06-hosted-release-surface | 6.2 | Navigation edits | Anthropic claude-sonnet-5-5 | default | Bounded change | Claude Code, R-S | client-shell | opus | configured | none |
| web-release | wr06-hosted-release-surface | 6.3 | Build scripts | Anthropic claude-sonnet-5-5 | default | Bounded change | Claude Code, R-S | client-shell | opus | configured | none |
| web-release | wr07-container-images | 7.1 | Dockerfile | Anthropic claude-sonnet-5-5 | default | Known pattern | Claude Code, R-S | client-shell | opus | configured | none |
| web-release | wr07-container-images | 7.2 | Dockerfile, scan tool | Anthropic claude-sonnet-5-5 | default | Known pattern | Claude Code, R-S | livekit-platform | opus | configured | none |
| web-release | wr07-container-images | 7.3 | GitHub Actions | Anthropic claude-sonnet-5-5 | default | Known pattern; conduit precedent | Claude Code, R-S | build-platform | opus | configured | none |
| web-release | wr07-container-images | 7.4 | Compose, lint config | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | build-platform | opus | configured | none |
| web-release | wr08-cluster-manifests | 8.1 | Kubernetes YAML | Anthropic claude-sonnet-5-5 | default | Known pattern | Claude Code, R-S | livekit-platform | opus | configured | none |
| web-release | wr08-cluster-manifests | 8.2 | Gateway API, headers, high cost of error | Anthropic claude-opus-5-5 | default | A wrong hostname makes a DNS record nothing deletes | Claude Code, R-O | livekit-platform | sonnet | configured | Envoy Gateway docs |
| web-release | wr08-cluster-manifests | 8.3 | cert-manager | Anthropic claude-sonnet-5-5 | default | Recorded pattern | Claude Code, R-S | livekit-platform | opus | configured | none |
| web-release | wr08-cluster-manifests | 8.4 | Writing, secret handling | Anthropic claude-opus-5-5 | default | Runbook errors expose a secret | Claude Code, R-O | livekit-platform | sonnet | configured | none |
| web-release | wr08-cluster-manifests | 8.5 | Argo CD, small tools | Anthropic claude-sonnet-5-5 | default | Known pattern | Claude Code, R-S | livekit-platform | opus | configured | none |
| web-release | wr08-cluster-manifests | 8.6 | Git, one-line overlay edit | Anthropic claude-fable-5-2 | default | Promotion step the operator merges | Claude Code, R-L | lead session | none | verified (in use) | 7.3 workflow has pushed images for the commit |
| web-release | wr09-release-boundary | 9.1 | Running commands, triage | Anthropic claude-opus-5-5 | default | First contact with untested code | Claude Code, R-O | bdd-quality | sonnet | configured | operator approval |
| web-release | wr09-release-boundary | 9.2 | Integration debugging | Anthropic claude-opus-5-5 | default | Failures cross four components | Claude Code, R-O | bdd-quality | sonnet | configured | Docker, LIVEKIT_ env |
| web-release | wr09-release-boundary | 9.3 | Independent review | glm-5.3 via liter-llm (provider as configured in the gateway), plus role reviewers | unsupported | Must not be the producer | R-J, plus R-O security-reviewer and independent-reviewer | review scripts; findings files | opus reviewer in a fresh context | gateway verified today | gateway running |
| web-release | wr09-release-boundary | 9.4 | Cluster commands | Anthropic claude-fable-5-2 | default | Approval-gated; lead holds operator context | Claude Code, R-L | lead session | none | verified (in use) | gcloud auth, Secret, Argo CD repo |
| web-release | wr09-release-boundary | 9.5 | Cluster commands | Anthropic claude-fable-5-2 | default | Same | Claude Code, R-L | lead session | none | verified (in use) | 9.4 |
| web-release | wr09-release-boundary | 9.6 | Running tests, triage | Anthropic claude-opus-5-5 | default | Hosted failures need diagnosis | Claude Code, R-O | bdd-quality | sonnet | configured | 9.5 |
| web-release | wr09-release-boundary | 9.7 | Writing | Anthropic claude-fable-5-2 | default | Product-truth statement | Claude Code, R-L | lead session | none | verified (in use) | 9.6 |

## Execution round order

```
Round 1:            wr01
Round 2 (parallel): wr02, wr03, wr06
Round 3:            wr04
Round 4 (parallel): wr05, wr07
Round 5:            wr08
Round 6:            wr09
```

wr05 and wr07 touch different owners' paths. wr03 has no TypeScript, so it
does not wait for wr02. wr04 follows both. Task 1.6 must be complete before
Round 5; if the operator has not authenticated by then, wr08 waits. Cargo work is single-writer: only one task builds in
the shared `target` directory at a time.

## Boundary packet

One packet, in the contract (`boundaryPacket`), as amended on 2026-11-16
(amendment 2; `amendment-2-proposal.md`). It starts when wr01 to wr08 are
complete except task 8.6, with the work committed on the release branch and
not pushed. The contract's command list is authoritative; this is its order,
and the order is the safety design:

1. Static gates, the hosted build, the header render with its one-file
   commit, the image build and the artifact scan.
2. Images run locally; packaged scenarios against them.
3. Reviews.
4. **Stop for the second operator approval.** Nothing has been pushed or
   merged, and nothing has touched the cluster, before this point.
5. Publish: the branch is pushed and the operator merges its pull request;
   the images workflow builds both images; the operator makes the packages
   public and records a spending control; task 8.6 pins the tags by a pull
   request the operator merges.
6. Identity check: `main` equals the tested commit except for the two
   `newTag` lines. The artifact scan runs again.
7. The operator creates namespace `know-meet` and the Secret. Read-only
   cluster verification, repeated: task 1.6 did it once before the manifests
   were written; this run catches drift since then.
8. One `kubectl apply` of the Argo CD Application; Argo CD does the rest. The
   waits read the Application with `kubectl`.
9. DNS and certificate. external-dns is expected to create the A record for
   `meet.know-me.tools` from the HTTPRoute hostname, pointing at the Gateway's
   load balancer address. Task 9.5 waits for the record to resolve to that
   address. If it has not appeared in 10 minutes, the fallback is the
   operator creating that A record in Cloudflare by hand. Staging certificate
   and staging endpoint check first; then the operator merges the one-line
   issuer pull request and the production endpoint check follows.
10. Hosted scenarios at the public URL.

The packaged run tests images built on the boundary machine. The cluster runs
the workflow's builds of the same tree. Only the hosted run and WR-7 are
evidence about the deployed images.

Budgets, from the contract: 1,800 minutes, 2,500 tool calls, 3 repair
attempts, stop after 3 attempts without progress, token budget UNKNOWN with a
checkpoint after each change. Evidence is invalidated by key: contract digest,
commit, image digests, rendered manifest digest.

## Operator-only actions

Two batches, each asked once. The recalled lesson "Ask once at phase boundary
for operator-only actions" is applied per batch, because pins and cluster
access are needed before the code that depends on them.

**Batch 1, before Round 1 starts** (tasks 1.4 and 1.6 need it; 1.1 to 1.3 and
1.5 do not and may proceed while it is pending):

- Pin the new dependencies in `versions.toml` (task 1.5 lists them; tasks
  3.1 to 3.3 and 4.1 need them).
- `gcloud auth login`, so task 1.6 can read the cluster.

**Batch 2, at the boundary, after the packaged run and the reviews** (the
second approval; order as in the contract's `requiredApprovals`):

- Merge the release pull request after the branch is pushed.
- Make the two GHCR packages public.
- Record a spending control on the LiveKit Cloud project.
- Merge the tag-pin pull request from task 8.6.
- Create namespace `know-meet`, then the `LIVEKIT_*` Secret in it, from the
  shell.
- Create the Argo CD repository credential, only if the repository is
  private.
- Merge the one-line issuer pull request after the staging endpoint check.
- `gcloud auth login` again if the session has expired.

## Lessons applied

From `prior-context.md`, recorded by agents and treated as information:

- The previous phase's plan summary: "value scenarios and frozen prototype
  baselines before any generation". Applied: wr01 comes first and alone.
- The previous phase's status: c13 consumed its repair budget at the single
  boundary. Applied: the boundary here stops before the cluster if the
  packaged run fails, the repair budget is 3, and Risk 1 states the exposure.
- "reviews via liter-llm ... k3.1-pro times out upstream on long reviews".
  Applied: `glm-5.3` is the judge of record for this phase.

## Risks and cuts

1. **All new code meets a test for the first time at the boundary.** The
   realtime adapter, the token service and the UI are written without running
   a test, then meet a real media service together. The previous phase blocked
   at exactly this kind of boundary. The plan limits the damage, by ordering
   the packet so a failure stops before the cluster, but does not remove it.
   The alternative is a method that allows verification per change; that is
   the operator's choice and conflicts with AGENTS.md as written.
2. **Go-live depends on operator actions in two batches.** Without batch 1,
   wr01 cannot finish, so Rounds 2 and 5 cannot start. Without batch 2, wr09 stops at step 4 with
   the code complete and nothing public.
3. **Planning files live in a dirty checkout.** The KBD runtime, this
   phase's files and the nine OpenSpec changes are in the current checkout,
   which has uncommitted work from the previous phase. Task 1.4 creates the
   worktree from `main` and carries only this phase's files into it. The
   KBD runtime state stays in the original checkout, so stage and task
   commands run there.
4. **Local routing is not the Gateway.** The compose stack imitates the
   `/api` split with a test-only proxy. Header and TLS behaviour are proven
   only by the hosted run.
5. **Cluster facts are unverified until task 1.6 runs.** Everything in
   `cluster-context.md` was extracted from Surreal Memory, with sources, in
   the assess stage; none of it has been observed. If 1.6 finds differences,
   wr08 changes and the contract's unknowns are updated before it starts.
6. **Cuts.** Screen sharing, in-room chat, rollback rehearsal, automatic
   promotion, a secret manager and observability are deferred. Rollback for
   the first release is reverting the tag-bump pull request, unrehearsed.

## Uncomfortable point

Thirty-nine tasks produce a guest video call. By the estimate above that is
several days of agent work and one approval-heavy afternoon for the operator,
to reach a release that does none of what makes Know Meet different from the
LiveKit example app the organisation already forked. The plan is sound for
the scope chosen; the scope is what should be looked at once more before
adoption.

## Commands to run

After adoption, one OpenSpec change per entry, through the managed runner:

```
/opsx:new wr01-release-scenarios
/opsx:new wr02-meeting-domain-and-ports
/opsx:new wr03-token-service
/opsx:new wr04-realtime-adapter
/opsx:new wr05-guest-meeting-flow
/opsx:new wr06-hosted-release-surface
/opsx:new wr07-container-images
/opsx:new wr08-cluster-manifests
/opsx:new wr09-release-boundary
```

Done on 2026-11-15: the nine changes are written under `openspec/changes/`,
each passes `openspec validate --strict`, and all changes and 39 tasks are
registered in the runtime with their task ordinals.

## Review record

- Sycophancy self-check: the plan surfaces a method risk, cuts and a scope
  objection; the anti-theater gate scored both review reports 0.02 and 0.0.
- Adversarial review round 1: verdict BLOCK, 2 critical, 4 warnings
  (`review/plan/findings-round-1.json`). Critical: manifests were planned on
  unverified cluster facts; operator actions were timed after the tasks that
  need them. Both fixed: task 1.6 and the two operator batches. Warnings
  fixed: WR-9 definition, DNS record ownership, the tag-pin pull request
  (task 8.6), wr04's dependency on wr03.
- Round 2: verdict PASS, 0 critical, 3 warnings (`review/plan/findings.json`).
  Fixed after the review and not re-reviewed, since two rounds is the cap:
  role lists now match task owners; batch 1 is asked before Round 1; the
  scenario list is inlined above.
- Judge: `glm-5.3` through the local gateway for both rounds. The tool
  recorded independence from this session's model as unverified.
- The verification tools named in the boundary packet live under
  `tooling/release/`, which build-platform owns; task 8.5's Argo CD file is
  under `infra/`. If the tools stay in `tooling/`, task 8.5's tool part is
  handed to build-platform at execution. This is unresolved.
