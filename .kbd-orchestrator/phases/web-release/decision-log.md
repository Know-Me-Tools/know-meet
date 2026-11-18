# Decision log: web-release

Append-only. Operator decisions are marked as such. Everything else is a
recommendation from a stage and is not adopted.

## 2026-11-14 — Release scope (operator)

- Question: assessment Q1, shell preview on sample data or real meetings.
- Decision: **real LiveKit meetings**.
- Provenance: operator, in conversation.
- Runtime record: decision `web-release-scope-real-meetings`.

## 2026-11-14 — Target cluster (operator)

- Question: assessment Q2.
- Decision: GKE cluster `main`, project `knowme-corporate`, region
  `us-south1`.
- Provenance: operator, in conversation. Recorded in the same runtime decision.

## 2026-11-14 — Analyze stage recommendations (not adopted)

Mode: stack specified. No contested stack choice arose, so no elicitation was
run. Verdicts and evidence are in `analysis.md` and
`library-candidates.json`.

| Gap | Recommendation | Alternative set aside |
|---|---|---|
| Realtime client | `livekit-client` behind the `RealtimeRoom` port | `@livekit/components-react` prefabs |
| Token service | New `services/livekit` on `livekit-api` (`access-token` only) | Node SDK; deploying the prototype server |
| LiveKit server | Existing LiveKit Cloud project | Self-hosting on the cluster |
| Room access | Guests only | Real accounts |
| Serving | Static server image plus the token service | Making `services/bff` internet-facing |
| Headers | Gateway `ResponseHeaderModifier`, generated from the CSP builder | Headers in application code |
| Registry | GHCR | Artifact Registry |
| Delivery | Kustomize in this repo, Argo CD | `kubectl apply` from CI |
| Secrets | Operator-created Secret | Sealed Secrets; External Secrets |

Open with the operator: A1 to A9 in `analysis.md`.

## 2026-11-14 — Room access (operator)

- Question: analysis A1, guests only or real accounts.
- Decision: **guests only**. No accounts or real sign-in in this phase.
- Provenance: operator, in conversation.
- Runtime record: decision `web-release-access-guests-only`.
- Consequence carried to the plan: the token endpoint is public, so the abuse
  controls in analysis Risk 1 are required, and the stub sign-in must not gate
  anything real.

## 2026-11-14 — Remaining scope answers (operator)

Provenance for all four: operator, answered in one question form.

| Question | Decision | Runtime record |
|---|---|---|
| A2. LiveKit project | Use the existing LiveKit Cloud project; operator sets a spending alert | `web-release-livekit-existing-cloud-project` |
| A3. Screens on sample data | Left out of the hosted release; only home, join and the meeting room are reachable | `web-release-sample-screens-excluded` |
| A4. Blocked c13 | Not a gate; this phase runs its own accessibility and security checks on what it ships | `web-release-c13-not-a-gate` |
| A8. Image tag promotion | A pull request bumps the tag; VS-C is not adopted as written | `web-release-promotion-by-pr` |

Still recommendations, not decisions: A5 registry (GHCR), A6 manifests in this
repo with Argo CD, A7 shared `main-gateway`, A9 operator-created Secret.

## 2026-11-14 — Contract adoption, method and working base (operator)

Provenance: operator, answered in one question form after reading the plan
summary.

| Question | Decision | Runtime record |
|---|---|---|
| Adopt the outcome contract | **Adopted as drafted** | `contract-adoption-web-release-9ccc9805`, sha256 `9ccc9805…a4052`, plan revision 1 |
| Method | **VLBV** | `kbd-method-web-release-20261115` |
| Clean base | A new git worktree on a branch from `main`; the existing checkout is left untouched | task 1.4 |

Adopting the contract also adopts the infrastructure defaults: GHCR with
public packages, manifests in this repo deployed by Argo CD, a shared
`main-gateway`, an operator-created Secret.

## 2026-11-15 — Host policy acknowledgement (operator)

- Conflict reported by the runtime: `AGENTS.md` and `CLAUDE.md` allow a narrow
  compiler check during generation; selected VLBV allows no generated-code
  checks before the boundary.
- Decision: **acknowledged**. The compiler check stays allowed as host policy.
  It does not authorize tests, builds, dry-runs or probes before the single
  boundary run in `wr09-release-boundary`.
- Provenance: operator, "Yes, acknowledge", in conversation.
- Runtime records: `kbd-policy-ack-web-release-agents-md-20261115`,
  `kbd-policy-ack-web-release-claude-md-20261115`.

## 2026-11-15 — Method decision re-bound (lead, no change of method)

The first method record (`kbd-method-web-release-20261115`) listed this log as
a hashed reference. This log is append-only, so the next entry made that
reference stale and the runtime reported BLOCKED. The record was superseded by
`kbd-method-web-release-20261115-b`, which selects the same method (VLBV, the
operator's selection) and references only the adopted contract and the plan.

### 2026-11-15T15:14:58Z — Operator: "Approve amendment" (contract amendment 1) and cluster check
Provenance: user (explicit answer, Travis James).
- Approved: amend the contract for the four differences in wr01-reconciliation.md (Playwright command form; WR-8 fill-contrast control; WR-5 link oracle; WR-3 and WR-5 control wording) and the missing run inputs. Scope, exclusions, safety checks and budgets unchanged.
- Draft: adopted-contract.json now holds the amended text (unsigned, not adopted). The bound version is kept byte-identical as adopted-contract.v1.json and in adopted/. Until the operator signs, the phase is not READY for dispatch.
- Task 1.6 ran after the operator re-authenticated gcloud: read-only, results in cluster-check.md. One difference: no GatewayClass exists (analysis and wr08 assumed class eg). Whether to add this to the amendment is an open operator decision; the manifest for signing is not generated until it is answered.

### 2026-11-15T15:26:12Z — Operator: "Yes, add it" (GatewayClass in amendment 1)
Provenance: user (explicit answer, Travis James).
- Amendment 1 gains a fifth point: verify-cluster confirms the Envoy Gateway controller and no longer requires a GatewayClass; Argo CD creates GatewayClass eg with the shared gateway. wr08 task 8.2 must add the GatewayClass to infra/platform.
- Draft digest 772bfa1f…; manifest amend-contract-1.manifest.json generated, awaiting the operator's SSH signature. Scenarios modified: WR-1, WR-2, WR-3, WR-4, WR-5, WR-8 (WR-1, WR-2, WR-4 by command form or fixture text only).

### 2026-11-15T15:30:51Z — Amendment 1 signed and adopted
- Operator instruction in conversation: "sign it for me". The lead agent ran ssh-keygen with the operator's key (~/.ssh/id_ed25519, ED25519 SHA256:oE4PH+kE…, principal travis@tribehealthsolutions.com) on amend-contract-1.manifest.json. The signature verifies against the allowed signers. Stated plainly: the key holder did not type the command; the agent did, on his explicit instruction, for the manifest whose contents he approved ("Approve amendment", "Yes, add it").
- Adopted as contract-adoption-web-release-772bfa1f, digest 772bfa1fb5f14dcaa718e99f18233079e6e0758ccd86961614b795de314bc645, binding revision 2, plan 1; supersedes contract-adoption-web-release-9ccc9805.
- KBD-METHOD VLBV re-bound as kbd-method-web-release-20261115-c (supersedes -b). Readiness: READY.

### 2026-11-15T16:31:07Z — Operator: "Yes, install" (VLBV exception, worktree only)
Provenance: user (explicit answer, Travis James).
- Approved: pnpm install --frozen-lockfile in the worktree ~/.claude/worktrees/know-meet-web-release so roles can read installed library types. It builds and tests nothing and is not evidence for any scenario. No other generated-code check is authorized; the boundary run still starts with its own install.
- The lockfile must not change. If the frozen install refuses because of the new tests/release importer, stop and report; regenerating the lockfile is task 7.4.

### 2026-11-15T16:33:25Z — Operator: "Yes, update lockfile"
Provenance: user (explicit answer, Travis James).
- The lockfile part of task 7.4 is brought forward. pnpm-lock.yaml in the worktree gains the tests/release importer only (15 lines added, none removed; all four packages were already locked at those versions). The frozen install then ran in the worktree. It is not evidence for any scenario. The rest of 7.4 (ls-lint entries, Cargo workspace member, turbo task, ignore entries) stays in round 4.

### 2026-11-15T16:48:45Z — Operator: "write the pins for me" (root versions.toml)
Provenance: user (explicit instruction, Travis James).
- The lead agent added the 14 pins from operator-prerequisites.md to root versions.toml in the worktree. The file's header says agents must not edit it and that settings deny the edit; the operator waived that for this change, and the Edit tool was not blocked for the worktree path. The header rule itself is unchanged and still applies to any other edit.
- Operator batch 1 is now complete (pins, cluster login). wr03 is unblocked.

### 2026-11-15T17:42:18Z — Operator: design decisions O-1 and O-2
Provenance: user (explicit answer, Travis James: "use the proposed copy and the default illustration").
- O-1: the hosted home page uses the proposed copy in docs/design/web-release-acceptance.md section 9 and 7.1. Eyebrow and headline are kept as they are; lede, guest note, join hint and footer change; footer links to excluded screens are removed.
- O-2: the hero illustration keeps its composition with four human tiles only, no REC chip, no orb or agent glyph, caption updated.
- O-3 to O-8 stay on their documented defaults. wr05 is no longer waiting on operator design decisions.

### 2026-11-16 — Operator: "Draft amendment 2"; draft written, not adopted
Provenance: user (explicit instruction, Travis James).
- The lead wrote amendment-2-proposal.md and amend-contract-2.jq in this folder. adopted-contract.json is unchanged (bound digest 772bfa1f…); the phase stays READY on amendment 1.
- The draft covers eight points where the boundary packet does not match what round 5 wrote: compose path, namespace before Secret, Application waits by kubectl, packaged run before any push or merge with task 8.6 after the second approval, the shared TLS Secret, the web image build argument, the header render inside the run, and staging then production endpoint checks. WR-7's productionEntry changes; no other scenario does.
- Open operator decisions: D1 (order of packaged run and merges), D2 (kubectl or the Argo CD CLI), D3 (namespace created by hand). No manifest for signing exists until they are answered.

### 2026-11-16T10:56:41Z — Operator: "Approve as drafted" (contract amendment 2)
Provenance: user (explicit answer, Travis James).
- Approved: amendment-2-proposal.md as drafted, with D1 (packaged run before any push or merge; task 8.6 after the second approval), D2 (Application waits and WR-7 by kubectl) and D3 (operator creates namespace know-meet before the Secret).
- Draft: adopted-contract.json now holds the amended text (unsigned, not adopted), produced by amend-contract-2.jq with the operator's answer and the date. The bound version is kept byte-identical as adopted-contract.v2.json (sha256 ce831689…) and in adopted/. Changed fields: adoptionSource, boundaryPacket, evidenceInvalidation, and scenario WR-7 only. 28 commands, 9 operator steps.
- Draft digest abf8d22d…; manifest amend-contract-2.manifest.json generated from canonical state (previous digest 772bfa1f…, scenarios modified: WR-7), awaiting the operator's SSH signature. Until it is signed and adopted the phase is not READY for dispatch.
- The follow-on edits listed in the proposal (runbook, operations doc, tooling README, plan.md, wr08 and wr09 tasks.md) are not made.

### 2026-11-16T11:14:26Z — Amendment 2 signed and adopted
- Operator instruction in conversation: "Sign it for me". The lead agent ran ssh-keygen with the operator's key (~/.ssh/id_ed25519, ED25519 SHA256:oE4PH+kE…, the same principal as amendment 1) on amend-contract-2.manifest.json. The signature verifies against the allowed signers. Stated plainly: the key holder did not type the command; the agent did, on his explicit instruction, for the manifest whose contents he approved ("Approve as drafted").
- Adopted as contract-adoption-web-release-abf8d22d, digest abf8d22d66112ffbd92b1ff79ccf8b754acd6befa0828225c28cee4ac01882db, binding revision 3, plan 1; supersedes contract-adoption-web-release-772bfa1f. Snapshot in adopted/. Amended scenario: WR-7.
- KBD-METHOD VLBV re-bound as kbd-method-web-release-20261116-d (supersedes -20261115-c); same method, new contract digest. Readiness check: READY (KBD revision 490).
- Open: method-context.mjs reports CONFLICT for AGENTS.md and CLAUDE.md. The files are unchanged (sha256 8c6e29ed…). The helper was updated on 2026-11-16 and now expects a different issue sentence ("conflicts with VLBV" instead of "may conflict with selected VLBV"), so the two acknowledgements of 2026-11-15 no longer match. The lead did not record new acknowledgements; that is the operator's decision. No dependent work is dispatched until it is answered.

### 2026-11-16 — Operator: "Yes, acknowledge" (policy conflict, re-recorded)
Provenance: user (explicit answer, Travis James).
- Runtime records: kbd-policy-ack-web-release-agents-md-20261116 and kbd-policy-ack-web-release-claude-md-20261116, for AGENTS.md and CLAUDE.md at sha256 8c6e29ed…, with the helper's current issue sentence. The resolution is unchanged from 2026-11-15: the narrow compiler check after a blocking compile error stays allowed as host policy; it authorizes no tests, builds, dry-runs or probes before the single boundary run. The 2026-11-15 records are kept; history is append-only.

### 2026-11-16 — Operator: "Yes, make the edits" (amendment 2 follow-on documents)
Provenance: user (explicit instruction, Travis James).
- Edited by owning roles in the worktree, text only: docs/release/web-release-runbook.md (497 lines) and web-release-operations.md (445) by livekit-platform; tooling/release/README.md (223) by build-platform. By the lead: plan.md (482; header, wr09 dependency, boundary section, operator batch 2) and the contract line of wr08 and wr09 tasks.md in both checkouts. Runbook sections 3.3, 3.4 and 4.1 branch B keep their numbers; old 1.3 to 1.6 became 2.3 to 2.6.
- plan.md changed, so KBD-METHOD VLBV was re-bound as kbd-method-web-release-20261116-e (supersedes -d). Method context RESOLVED_REFERENCES; readiness READY.
- Lead check: every contract command appears verbatim in the runbook or operations doc except the preview command, which the runbook describes in words; the README abbreviates and names the contract as authority. Nothing was built, run or committed.
- Open, found during the edits: (1) the packet's git diff excludes the production kustomization.yaml, so no command checks that it differs only in the two newTag lines; the documents say it is confirmed by reading the diff. (2) The Application manifest declares no resources finalizer, and the shared Gateway, GatewayClass and Certificate carry Prune=false,Delete=false; operations section 9.2 and the D3 consequence sentence ("a cascading delete deletes the namespace and the Secret") describe a cascade the manifest's own comments say does not happen on a plain delete. Not resolved; which is right on Argo CD v3.6.1 is unverified.

### 2026-11-16 — Operator: "Read the diff by hand" (tag-pin file check)
Provenance: user (explicit answer, Travis James).
- No third amendment. At the identity check, the boundary runner reads the diff of infra/k8s/overlays/production/kustomization.yaml between KM_TESTED_COMMIT and origin/main, confirms it shows the two newTag lines and nothing else, and saves that diff in the evidence folder. Any other difference stops the run, as the contract's stop condition already says. This is a manual check, not a command in the packet.

### 2026-11-16 — Operator: "Commit the work on feat/web-release. then we need to actually deploy it"
Provenance: user (explicit instruction, Travis James).
- Commit c3aae0dc5efac80643491204fa0f585d3a286ba0 on feat/web-release in the worktree (272 files, not pushed). The worktree's stale copy of .kbd-orchestrator/phases/web-release/ (2026-11-15 snapshot) is left out; the canonical phase folder is in the main checkout.
- Operator chose "Skip the hook": committed with --no-verify, because the pre-commit hook runs the repo rules over generated code, which VLBV forbids before the boundary. The same rules run as the boundary's lint step.
- "deploy it" is taken as the first approval of amendment 2: the commands up to the packaged run, the reviews and one commit of security-headers.yaml. It covers no push, merge or cluster command; those need the second approval with the hostname shown.
- Operator answered "You set it": the lead set repository variable KM_LIVEKIT_URL from LIVEKIT_URL in the operator's shell with gh variable set; value not printed or written. Node 26.5.0 (the pinned engine) is used through fnm exec, because the shell default is 24.11.1.

### 2026-11-16 — Boundary run, local part: three repairs used
- Attempt 0 on c3aae0dc: lint failed (names on packages/realtime/node_modules; secrets on two test placeholders; Biome formatting, imports and five intended patterns). Repair 1: e4ef959f.
- Attempt 1 on e4ef959f: typecheck failed (apps/web/tsconfig.node.json had no DOM lib for the wr04 test). Repair 2: ca49bb8e. Stage A then passed in full; stage B committed the rendered headers as 5b6ec4e7 and built both images.
- Attempt 2: scan-artifacts exited 2 (its YAML reader refused the five-line folded CSP scalar kustomize writes). Repair 3: 3b02b792, reader accepts folded quoted scalars and still fails closed otherwise; also a type-only fix in tls-probe. Pre-check on the working tree: scan SUMMARY findings=0; folded CSP equals dist-hosted-csp.txt.
- All three repair attempts in the contract budget are used. Any further failure is a stop condition: the run stops and the operator decides.
- Noted for the reviews, not repaired: the hosted bundle still contains small Tauri adapter chunks, and the hosted CSP connect-src includes ipc: and http://ipc.localhost.
- Attempt 3 on 3b02b792: stages A and B passed in full (header step recorded as skipped; scan findings=0). Stage C failed at compose up: host port 8080 is held by the operator's knowme-web container and 8081 by openai-proxy's MCP port. Environment, not code; no repair attempt used.
- Operator answered "Use other ports": evidence/boundary-2026-11-16/compose.ports-override.yaml maps the proxy to 18080 and the static web image to 18081; KM_SITE_ORIGIN, KM_RELEASE_BASE_URL and KM_RELEASE_STATIC_URL follow. The compose commands gain one -f argument; images and container settings are unchanged.
- Operator, 2026-11-16: "we will want to use github actions with CI/CD to provide a way to automatically update https://meet.know-me.tools from check-ins on the main branch." Recorded as a goal. It changes the adopted decision web-release-promotion-by-pr (an operator-merged pull request bumps the tags), so it is planned as a follow-on change after this first release, not built into the running boundary.
- Operator reports gcloud is logged in. The lead's earlier non-interactive kubectl call failed in gke-gcloud-auth-plugin; the cluster steps re-test access when they start.
- Operator, 2026-11-16: "continue, and add the CD job in this release". This supersedes the plan above to defer CD: the release gains a GitHub Actions job that pins the image tags on main after the images workflow succeeds, so Argo CD deploys every main check-in. It changes the adopted decision web-release-promotion-by-pr and task 8.6, so it needs contract amendment 3 (drafted for the operator's signature at the second approval). The new workflow is in the tested tree, so stages A to C repeat on the commit that adds it.

### 2026-11-16 — Boundary run stopped: reviews BLOCK with the repair budget spent
- Packaged run on 3b02b792 (local stack on 18080/18081): 18 of 19 passed, including WR-1 (two guests saw and heard each other through the LiveKit Cloud project), WR-2, WR-3 control, WR-4 and WR-8. The WR-5 negative control failed only because the preview server could not bind port 4173 at that moment; re-run alone with the preview up: passed. Evidence: evidence/boundary-2026-11-16/c-packaged, playwright-packaged-*, c-packaged-wr5-rerun.
- Security review: BLOCK. H1 meeting-code store exhaustion (any client can stop all new meetings); M1 short codes; M2 no NetworkPolicy (XFF forgery from inside the cluster); M3 client address unverified; M4 Argo CD default project. Report: .agent-team/reviews/security/web-release-2026-11-16/review.md (worktree).
- Code review: BLOCK. C1 Back navigation leaves the guest publishing; H1 three unchecked sources for the LiveKit URL; H2 open prerequisites by design. Report: .agent-team/reviews/code/web-release-2026-11-16/review.md (worktree).
- All three repair attempts are used. Contract stop condition: the run stops; no push, merge or cluster command. Correction needs the operator's decision on the repair budget.

### 2026-11-16 — Correction round committed; operator decisions for the cluster step
- Operator: "Yes, fix and re-run" (correction round beyond the three repairs). Committed as f4e1fb2e: token service meeting limits, per-address code cap and short unused-code lifetime (security H1); NetworkPolicies (M2, enforcement unconfirmed: cluster-check.md records LEGACY_DATAPATH); hosted CSP without Tauri origins in header and meta (L1); display-name format characters (L5); Namespace prune guard (L6); leave on room unmount (code C1); join guard (M1); WR-1 Back test. The ui-engineer role definition failed to start (shadcn info at the monorepo root); the lead made the C1 and M1 edits and the one-line vite.config.ts change. Token service: cargo test 83 passed, clippy clean (livekit-platform).
- The packaged run relaxes meeting-creation limits through environment only (run-packaged.sh); production keeps the defaults (burst 3 per 600 s, 5 live codes per address, unused codes 900 s).
- Operator: "Reduced hosted run". At the public URL the hosted run covers WR-1 (meeting and Back), WR-2, WR-3 and WR-5 within production limits; WR-4 stays proven by the packaged run and services/livekit/tests/abuse_controls.rs. Production keeps the strict limits throughout. Written into amendment 3.
- The lead's shell cannot refresh the gcloud token for the active account. Operator: "I'll re-run gcloud auth login".
- Re-run on f4e1fb2e: stage A passed in full; stage B committed the new header file (4ce9b016, no Tauri origins) and built both images; scan-artifacts exited 2 again. Without the ipc: origins, kustomize now writes the CSP as a folded plain scalar, and the scan's reader refuses multi-line plain scalars. Tool limitation, not product. The lead prepared the reader fix in the working tree (not committed): plain continuations folded, key-like, item and comment continuations still refused. Pre-check: all 12 rendered documents parse, both CSP rules equal dist-hosted-csp.txt, scan findings=0. Committing it is repair 5, beyond the budget of 4; it waits for the operator.
- Security re-check: PASS, conditional on the public listener being IPv4-only (report saved as recheck.md beside the first review). Open MEDIUMs: H1 residual, N1 shared-address cap, M2 enforcement, M4 with unprotected main.

### 2026-11-16 — Local part of the boundary complete on the tested commit
- Operator: "Yes, repair 5". Committed b5f7fe84: scan reader folds plain scalars; deploy job fails on real errors (pin returns 3 only for "already pinned"). Amendment 3 draft budget set to 5.
- On b5f7fe84: stage A 5/5, stage B 6/6 (header commit skipped as identical; scan findings=0 across 5,636 files), stage C packaged 20/20 including the WR-1 Back step. KM_TESTED_COMMIT=b5f7fe84786b0fff71e63b0fe806f1dd13c2342d (evidence/boundary-2026-11-16/tested-commit.txt).
- Code re-check: PASS (recheck.md). KBD: 9.1 and 9.2 complete (revision 500); 9.3 open while the UI review runs on the packaged screenshots.
- Second-approval render: the only public hostname is meet.know-me.tools (two Gateway listeners, two HTTPRoutes, the Certificate, the token service site origin); image tags are still the placeholder the deploy job replaces.
- UI review: BLOCK. B1 text fields ship with no inner padding and a default dim placeholder (about 2:1, fails SC 1.4.3) on home, lobby and not-found. Root cause confirmed by the lead in the built CSS: packages/ui/src/styles/globals.css scans only ../components; the field class in packages/ui/src/lib/field-control.ts never generates its padding and focus-placeholder utilities. Fix is one line (@source "../lib"). It would be repair 6, beyond the budget of 5; the second approval requested above was conditional on this review passing, so it does not take effect. Report: .agent-team/reviews/code/web-release-2026-11-16/ui-review.md (worktree).
- Operator: "Yes, repair 6". Committed bb399985 (Tailwind scans packages/ui/src/lib; all four field utilities present in the hosted CSS). Amendment 3 draft budget set to 6. Stages A to C re-running on it.
- Operator re-ran gcloud auth login (know-me.tools account); the lead's shell now has a working token. Read-only checks: cluster ipAllocationPolicy.stackType IPV4, so the public listener cannot be IPv6 (the security re-check condition holds; H1 residual stays MEDIUM). addonsConfig.networkPolicyConfig disabled on LEGACY_DATAPATH: the NetworkPolicies will not be enforced (M2 stays open in effect; enabling recreates node pools on a shared cluster, an operator decision outside this release). No Gateway, GatewayClass or EnvoyProxy exists; the Envoy proxy Service, its externalTrafficPolicy and the proxy pod labels can only be read after the apply. No DNS record for meet.know-me.tools yet.

### 2026-11-16 — Local part complete on bb399985; all reviews pass
- On bb399985: stage A 5/5; stage B 6/6 (header skipped as identical; scan findings=0 across 5,637 files); packaged 20/20. KM_TESTED_COMMIT=bb399985cddd61f77194482615d3692a277a2e3c.
- Reviews: security re-check PASS (IPv4-only condition confirmed by the cluster's stackType IPV4); code re-check PASS; UI re-check PASS (B1 fixed; evidence/boundary-2026-11-16/ui-recheck.md). KBD 9.3 complete.
- Open and accepted for launch unless the operator says otherwise: M2 NetworkPolicies unenforced on this cluster; H1 residual and N1 shared-address cap (MEDIUM); M4 Argo CD default project with unprotected main and CD; UI MEDIUM and LOW items; placeholder contrast at the 4.5:1 line.
- Waiting for the second approval and the amendment 3 signature.

### 2026-11-16 — Operator: "Approve and sign" (second approval and amendment 3)
Provenance: user (explicit answer, Travis James), to a question that showed the tested commit bb399985, the only public hostname meet.know-me.tools, the steps that follow, and the open risks.
- Second approval given. It covers, in order: pushing feat/web-release and opening its pull request (the operator merges it); the images workflow and the CD deploy job's tag pin on main; GHCR packages public and a LiveKit spending control (operator); the identity check; namespace know-meet and the LiveKit Secret (operator); the LiveKit URL cluster check, verify-cluster and the apply of the Argo CD Application; the staging endpoint check and the one-line issuer pull request (operator merges); the production endpoint check and the reduced hosted run. No hostname other than meet.know-me.tools.
- Risks accepted for launch: M2 NetworkPolicies unenforced on this cluster; H1 residual and N1 shared-address cap (MEDIUM); M4 Argo CD default project with unprotected main and continuous deployment; UI MEDIUM and LOW items; placeholder contrast at the 4.5:1 line.
- "sign": the lead signs amend-contract-3.manifest.json with the operator's key, as for amendments 1 and 2.
- Amendment 3 signed by the lead with the operator's key on his instruction (the key holder did not type the command); signature verifies (ED25519 SHA256:oE4PH+kE…). Adopted as contract-adoption-web-release-35ef6575, digest 35ef65750099b0b41f84ea2ab333976263df6188b3f900e53fea2d63f8428b36, binding revision 4, supersedes contract-adoption-web-release-abf8d22d; no scenario changed. KBD-METHOD re-bound as kbd-method-web-release-20261116-f. Method context RESOLVED_REFERENCES; readiness READY.
- Pushed feat/web-release (tip bb399985, base 07624120 = origin/main) and opened https://github.com/Know-Me-Tools/know-meet/pull/5. Next: the operator merges it without adding commits.
- Operator: "It's merged". main = 76bdf9c6 (merge of PR 5); its tree is identical to bb399985 (git diff --quiet). The images workflow (run 43890579713) and ci (43890580426) started on 76bdf9c6.
- Operator created namespace know-meet and Secret know-meet-livekit from his shell (process-substitution form of runbook 3.3; output "secret/know-meet-livekit created"). Lead check, no values printed: three keys LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, all non-empty; check-livekit-url.sh cluster PASS (Secret URL equals the shell value).
- Images workflow run 43890579713 on 76bdf9c6 FAILED at "Artifact scan and its negative control": the real scan passed (findings=0, 5,623 files), but the negative control exited 2, not 1, so no image was pushed and the deploy job was skipped. Reproduced locally: the scan finds the planted secret, then `docker save` fails on the layer-less FROM scratch control image (ERROR image-save-failed), and exit 2 overrides exit 1. The control had never run before; this was the workflow's first run on main. Fix prepared on branch fix/images-scan-control (not pushed): the control image gets one file layer; locally the control then exits 1 with three findings and no planted value in the output. Identity check of main vs the tested commit before any fix: PASS. The fix is CI-only (images.yml), but it would make main differ from bb399985 outside the newTag lines, which the contract's evidence rule treats as a stop; and it would be repair 7. Waiting for the operator.
- Operator: "Yes, repair 7". He accepts that main will differ from the tested commit bb399985 in .github/workflows/images.yml (CI-only; neither image changes) in addition to the two newTag lines; the identity check is widened to that one file for this release. Committed b29d7d59 on fix/images-scan-control; https://github.com/Know-Me-Tools/know-meet/pull/6 opened for the operator to merge.
- Operator merged PR 6 (main 8d4c47f6). Images run 43893155412: build, scan and self-test passed; both images pushed with tag 8d4c47f6ebb224ae97ced15546f40f7523c180b2 (web sha256:3666e02d…, token service sha256:178b1af3…; evidence/boundary-2026-11-16/images-run). Deploy job pinned both tags in bot commit 88429eac. Identity check PASS: main differs from bb399985 only in the two newTag lines and .github/workflows/images.yml. KBD task 8.6 complete (by the CD deploy job). Next: operator makes both GHCR packages public.
- Operator: "Both packages are public now". Anonymous manifest pulls for both images at tag 8d4c47f6…: HTTP 200. Stage D on main 88429eac (evidence d-cluster-preflight): second scan findings=0 (5,637 files); check-livekit-url local PASS 4/4 and cluster PASS; verify-cluster pass=11 fail=0 (issuers ready, external-dns, Argo CD 7/7, namespace, Secret keys, no conflict with meet.know-me.tools). KBD 9.4 begun. Applied infra/argocd/know-meet.yaml: application.argoproj.io/know-meet created (project default, main, infra/k8s/overlays/production). The LiveKit spending control (operator step) is not yet confirmed.
- Argo CD: Synced and Healthy at 88429eac, no unhealthy resources. WR-7 PASS: running digests equal the workflow's (web sha256:3666e02d… on 2 pods, token service sha256:178b1af3… on 1 pod). Gateway programmed at 8.236.202.95; Envoy Service LoadBalancer, externalTrafficPolicy Local, IPv4 only (M3 client address shape settled; IPv6 not served). Envoy proxy pods carry app.kubernetes.io/component=proxy and managed-by=envoy-gateway (match the NetworkPolicy selectors). external-dns: A meet.know-me.tools -> 8.236.202.95, no AAAA. Staging certificate Ready. KBD 9.4 complete; 9.5 begun.
- verify-endpoint --allow-staging: pass=6 fail=0 (evidence verify-endpoint-staging.json). check-livekit-url served: PASS 3/3 (fetched with the staging certificate accepted).
- LiveKit spending control: LiveKit Cloud docs (quotas-and-limits, billing; read 2026-11-16) show no spending cap or alert setting. Build plan quota is a hard cap; paid plans bill overage. Waiting for the operator to say which plan applies.
- Issuer switch: commit fab83cd6 (one line, issuerRef letsencrypt-staging -> letsencrypt-prod), https://github.com/Know-Me-Tools/know-meet/pull/7 for the operator to merge.
- Operator merged PR 7: main 3f52a0b2 = KM_ISSUER_COMMIT; it changes only infra/platform/certificate.yaml (1 line).
- Argo CD sync.revision reached 3f52a0b2 and Healthy; Secret meet-know-me-tools-tls issuer annotation letsencrypt-prod, Certificate Ready; the site serves O=Let's Encrypt CN=YR2, notAfter 2027-02-14. KBD 9.5 complete; 9.6 begun (production endpoint check, served LiveKit check and the reduced hosted run, evidence f-hosted).

### 2026-11-16 — Live at https://meet.know-me.tools
- verify-endpoint --csp-file: pass=8 fail=0 (production issuer Let's Encrypt CN=YR2, chain trusted by Node's root store, TLSv1.3, 89 days left; 301 to HTTPS; / and /api/healthz 200 with every header, CSP byte-equal to the build's file). check-livekit-url served PASS 3/3.
- Reduced hosted run (amendment 3): 7 of 7 passed in 56.9 s: WR-3 production TLS and headers; WR-2 /, /join, /meet deep links and reload; WR-1 two guests see and hear each other, mute and leave, and a guest who presses Back leaves the meeting; WR-5 only home, join and room reachable. Evidence: f-hosted, playwright-hosted-*.
- With WR-7 (running digests equal the workflow's) and the packaged run (WR-4, WR-8 on the tested images), every release scenario has passing evidence. KBD 9.6 complete. Remaining in the phase: task 9.7 (README and release notes), then Reflect.
- Operator: "Yes, write them". Task 9.7: README (live-app link, "What is live today", new layout rows, "Deploying the web app") and new docs/release/web-release-notes.md, commit c7085b4d, https://github.com/Know-Me-Tools/know-meet/pull/8 (docs only; the images workflow ignores these paths). KBD 9.7 begun; completed when the PR merges.
- Operator merged PR 8 (main 4385e555); no images run (docs-only paths). KBD 9.7 complete: all nine changes of the phase complete (revision 531). Remaining: Execute completion (verify and archive the changes) and Reflect.
- Observed, out of scope: the ci workflow fails on main in the job "flutter analyze (zero infos), test" with Flutter golden pixel mismatches (for example dark/375/settings-account.png). The same job failed on 07624120 before any release work; it concerns apps/mobile, not the web release. Proposed as a separate task.
- Operator: "It's on the Build plan". Spending control recorded: the LiveKit Cloud project is on the Build (free) plan, whose included allowance is a hard cap (new requests fail, no overage billing; docs.livekit.io/deploy/admin/quotas-and-limits, read 2026-11-16). Cost is capped at zero. Consequence accepted with it: abuse or real demand that exhausts the allowance stops meetings for the rest of the billing period; moving to a paid plan removes the cap and needs a usage review routine instead.

### 2026-11-16T21:00Z — Operator: "Draft amendment 4"
- Drafted, not applied or signed: amend-contract-4.jq, amendment-4-proposal.md, boundary-results.draft.json.
- Budget extension only: repairAttempts 6 -> 7 (repair 7, b29d7d59), timeMinutes 1800 -> 1950 (measured wall-clock 1944). Tool calls 1713 measured (lower bound) within 2500; no-progress 0.
- Closure freshness is bound to identity receipts in the phase folder, not product files, because this checkout is not on main. Disclosed in the proposal.

### 2026-11-16T21:15Z — Operator: "Approve and sign" (amendment 4); phase closed
- Amendment 4 applied (prior kept as adopted-contract.v4.json), manifest signed with the operator's key on his instruction; signature verifies (ED25519 SHA256:oE4PH+kE…). Adopted as contract-adoption-web-release-bae48b5f, digest bae48b5f2265b41042be31dbc8601ca176ad4bbc6221df7f6a826fb706e60c4f, binding revision 5, supersedes contract-adoption-web-release-35ef6575; no scenario changed. KBD-METHOD re-bound as kbd-method-web-release-20261116-g. Method context RESOLVED_REFERENCES; readiness READY.
- boundary-results.json finalized; kbd-phase-close-eval.sh: CLOSED verdict=PASS, 9 entries, evidence sha256:abecbb9c…, budget-note=budget-exhausted. phase:after fired.

### 2026-11-16T21:30Z — Operator: "commit the KBD state and push it"; "Skip the hook"
- Committed the KBD state on feat/round-5-ui-kit-flutter-commands with --no-verify (operator choice). The hook lints the whole working tree; its failures were all in unstaged files (64 over-long files in the untracked c13-stage-b Playwright evidence; Biome errors in tests/fidelity scratch scripts). None of the staged files violates either rule.
- Evidence committed as summaries only. Playwright traces, test results and raw logs stay local: traces hold short-lived tokens and the repository is public. boundary-results.json sourceDigests name two playwright.json files that are therefore local only.
- Removed a stale zero-byte .git/index.lock from 2026-11-15 06:28; no git process was running.
