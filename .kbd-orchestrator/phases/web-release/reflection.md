# Phase Reflection: web-release

Date: 2026-11-16. Method: VLBV. Contract: amendment 3, sha256 `35ef6575…`,
decision `contract-adoption-web-release-35ef6575`.

## Delta

Planned: 9 OpenSpec changes, 39 tasks, 6 rounds, one boundary run, then the
operator opens a tag-pin pull request (step 8.6) and Argo CD deploys it.
Repair budget 3. Hosted run of the full release suite at the public URL.

Delivered: all 9 changes, live at https://meet.know-me.tools. Five things
differ from the plan:

1. **Continuous deployment was added mid-phase.** The `deploy` job in
   `.github/workflows/images.yml` pins the image tags in a bot commit and Argo
   CD syncs `main`. It replaced operator step 8.6 (amendment 3). It was not in
   the assessed scope.
2. **Repairs: 7 used against an original budget of 3.** The signed budget was
   raised to 6 by amendment 3. Repair 7 (CI negative-control image) was
   approved in chat and never signed into the contract. **The closure
   evaluator therefore cannot close this phase as it stands** (see Closure).
3. **Three signed amendments after adoption** (amendment 1 was before
   execution; 2 and 3 during it).
4. **The hosted run was reduced** to WR-1, WR-2, WR-3 and WR-5, with negative
   controls excluded, to stay within production rate limits (amendment 3).
   WR-4, WR-6, WR-8 and WR-9 were proven on the packaged stack only; WR-7 on
   the cluster.
5. **`main` is not byte-identical to the tested commit `bb399985`.** It differs
   in the two `newTag` lines and in `images.yml` (repair 7, CI-only; neither
   image changed). The operator widened the identity check to that file.

## Root Cause

- **Tooling written in this phase had never run before the boundary.** Under
  VLBV no generated code runs before the boundary, so the boundary was the
  first run of the lint rules, the artifact scan's YAML reader and the CI
  negative control. Repairs 1, 3, 5 and 7 were all defects in our own release
  tooling, not in the product. Each surfaced one at a time, because each
  stopped the run before the next could show.
- **The contract encoded environment facts nobody had checked.** Host ports
  8080 and 8081 were already held on the operator's machine. The hosted suite
  as written would have exceeded the production meeting limits. The compose
  path and the namespace/Secret order were wrong (amendment 2).
- **Reviews caught three defects that scenarios passed.**
  - Security H1: one client could fill the meeting-code store. WR-4 tested the
    rate limit, but not exhaustion of the store.
  - Code C1: leaving the page did not leave the room.
  - UI B1: text fields had no padding, and placeholder contrast was about
    2:1. WR-8 passed because Tailwind never scanned `packages/ui/src/lib`, so
    the utilities were missing. The scenario checked the rendered state it
    was given and did not compare it with the design.
- **The repair budget was set for product defects only.** It did not allow for
  release tooling, reviews or CI, so every review finding cost a repair.

## Corrective Actions

1. **Close the budget gap.** The operator signs an amendment that raises
   `repairAttempts` to 7 and records repair 7. Then the closure evaluator runs.
   It also needs measured time and tool-call figures, which this phase did not
   record (see Closure).
2. **Run release tooling against fixtures before the boundary.** A
   tooling-only pre-check (the scan reader, lint config, CI controls in a
   throwaway workflow run) is not generated product code. Write it into the
   next contract as an allowed pre-boundary check.
3. **Verify environment facts in assess.** Ports, quota and limits, paths,
   and the order of namespace and Secret. Record each as a checked fact with
   its command, not as an assumption.
4. **Add design-diff oracles to accessibility scenarios.** Compare computed
   field padding and placeholder contrast with the tokens, not only axe
   results.
5. **Budget for reviews.** Give review corrections their own bucket, separate
   from product repairs.
6. **Meter the budget during the run.** Record minutes and tool calls per
   stage, so the closure evaluator gets measured values.

## Recalled Lessons

- Recurred: the assess summary noted "cluster facts are from memory only".
  The read-only cluster check confirmed most of them, but two facts were new:
  NetworkPolicies are not enforced, and the cluster is IPv4-only. Both became
  accepted risk or review conditions late in the phase.
- Recurred: the worktree had no `node_modules`, so roles wrote against docs
  (gotchas, 2026-11-15). This contributed to the lint and type repairs 1 and 2.
- Applied: the plan's rule that the run stops before the cluster if the
  packaged run fails. No cluster change happened until the packaged run passed
  20/20 and the second approval was signed.

## Goals

| Goal | Status |
|---|---|
| Ship the web-only release at https://meet.know-me.tools | MET |
| Desktop and mobile out of scope | MET |
| Extract the cluster setup from Surreal Memory, configure to match, record sources | MET (`cluster-context.md`, `cluster-check.md`) |
| Plan build, package, deploy and verify at the public URL | MET |
| Secrets server-side; clients get short-lived tokens | MET (WR-6 scan 0 findings; operator-created Secret) |
| Full KBD process with OpenSpec changes | MET: all stages ran, 9 changes archived, phase CLOSED (PASS) after amendment 4 |

6 of 6 goals met.

## Delivered Changes

All are archived under `openspec/changes/archive/2026-11-16-*`. Each passed
`kbd-apply verify`. All were built by Claude Code with native team subagents.

- `wr01-release-scenarios`: WR-1 to WR-9 as Playwright scenarios, packaged
  and hosted projects.
- `wr02-meeting-domain-and-ports`: meeting domain, RealtimeRoom and
  TokenIssuer ports.
- `wr03-token-service`: Rust token service. It has:
  - meeting codes, with a cap of 5 live codes per address;
  - unused codes that expire after 15 minutes;
  - short-lived LiveKit tokens.
- `wr04-realtime-adapter`: livekit-client adapter behind the RealtimeRoom port.
- `wr05-guest-meeting-flow`: home, lobby and meeting room; leaving the page
  leaves the meeting.
- `wr06-hosted-release-surface`: hosted build that reaches only home, join and
  the meeting room; hosted CSP without Tauri origins.
- `wr07-container-images`: web and token-service images on GHCR, plus the
  artifact scan.
- `wr08-cluster-manifests`: the cluster setup.
  - Kustomize base and production overlay; HTTPRoute.
  - Security headers generated from the CSP builder.
  - NetworkPolicies and the Argo CD Application.
- `wr09-release-boundary`: the boundary run, the go-live, and the CD deploy
  job.

Evidence: `evidence/boundary-2026-11-16/`.

| Run | Result |
|---|---|
| Packaged | 20/20 |
| Hosted | 7/7 |
| WR-7 | Running digests equal the workflow's |
| Endpoint | 8/8; Let's Encrypt production certificate valid to 2027-02-14 |
| Scan | 0 findings |

## Artifact Quality Summary

No artifact-refiner run. Independent reviews were run by role subagents:

| Review | First verdict | Re-check |
|---|---|---|
| Security | BLOCK: 1 HIGH, 4 MEDIUM | PASS, conditional on the listener being IPv4-only (confirmed) |
| Code | BLOCK: 1 CRITICAL, 2 HIGH, 4 MEDIUM, 4 LOW | PASS |
| UI | BLOCK: 1 BLOCK, 2 MEDIUM, 3 LOW | PASS after repair 6 |

The reviewers ran in a separate context, not on a separate model. Model
independence is unverified.

## Technical Debt

- `infra/k8s/base/network-policies.yaml`: the policies are in place but not
  enforced. The cluster's network-policy add-on is off (accepted risk, M2).
- `main` has no branch protection, and every push to `main` is a public
  deploy. The Argo CD Application uses the `default` project (accepted risk,
  M4). A follow-up session is open: "Harden continuous deployment".
- Token service: a large pool of addresses can still exhaust meeting creation
  (H1 residual), and users behind one shared address share a single cap (N1).
- Placeholder contrast sits exactly at 4.5:1. The UI MEDIUM and LOW items
  remain open.
- There is no "Enable audio" prompt when the browser blocks autoplay.
- `.github/workflows/images.yml` deploys by tag, not by digest.
- The Flutter golden CI job on `main` was already failing before this phase
  (also fails on `07624120`). A follow-up session is open.

## Architecture Integrity

- AGENTS.md violations:
  - Pre-commit hook skipped once with `--no-verify`, operator-approved, for the
    VLBV conflict.
  - The lead made the C1 and M1 UI edits directly when the ui-engineer role
    failed to start (disclosed at the time).
- Constraint violations:
  - Repair budget exceeded by 1 without a signed amendment.
  - Tested-commit identity widened to `images.yml` by operator decision.
- Never-do rules:
  - No LIVEKIT values committed or printed.
  - No unguarded Tauri calls in the hosted build.
  - No `any`.
  - No writes to the read-only reference repo.

## Cross-Tool Coordination Notes

- Progress tracking: RELIABLE for tasks, through kbd-apply. GAPS FOUND:
  - Repair 7 is missing from `attempts.tsv`.
  - The worktree's copy of `.kbd-orchestrator/phases/web-release/` is a
    stale, untracked snapshot. The main checkout is authoritative.
- Handoff quality: CLEAR. Every operator decision is quoted in
  `decision-log.md` with its commit.

## Contract Accuracy

| Metric | Value |
|---|---|
| Contract amendments after adoption | 2 during execution (2 and 3); 3 in total including the pre-execution amendment 1 |
| BLOCKED caused by the contract | 2: compose host ports already in use; hosted suite exceeded production limits |
| NOT_EXERCISED scenarios | 0 (WR-4, 6, 8 and 9 were exercised on the packaged stack only, by amendment) |
| Repair attempts used / allowed | 7 / 6 (signed); 3 at adoption |
| Escapes past scenarios, caught by review before go-live | 3: H1, C1, B1 |
| Post-go-live escapes | 1: CI negative control failed on its first run on `main` (repair 7) |
| Review findings at the boundary (critical or blocking / high) | 3 / 2, all fixed and re-checked |

Also written to `accuracy.json`.

## Closure

CLOSED, verdict PASS, 2026-11-16, after amendment 4 (sha256 `bae48b5f…`,
decision `contract-adoption-web-release-bae48b5f`). Amendment 4 is
operator-signed and extends the budget only: repairs 6 to 7, time 1800 to
1950 minutes.

The evaluator checked:

- 9 of 9 scenarios with PASS evidence;
- sha256 of the evidence `abecbb9c…`;
- the budget at the bound ceilings, with the note `budget-exhausted`, because
  repairs are exactly at 7.

**Freshness** is bound to the identity receipts in the phase folder: the
tested commit `bb399985`, the image digests, the cluster and endpoint checks,
and the Playwright results. It is not bound to the product files, which are
not in this checkout.

**Budget figures:**

| Dimension | Used | Measured how |
|---|---|---|
| Time | 1944 minutes | Wall-clock |
| Tool calls | 1713 | Counted from transcripts; a lower bound |
| Repairs | 7 | Counted |
| Rounds with no progress | 0 | Counted |

## Lessons Learned

- VLBV makes the boundary the first run of every tool written in the phase.
  Budget repairs for release tooling separately from product repairs, or allow
  tooling-only fixture checks before the boundary.
- Verify host ports, production limits, paths, and the order of namespace and
  Secret during assess. Run the command and record the observed value.
- Accessibility scenarios need a design-diff oracle. axe passes on fields that
  lost their padding and placeholder styling, because missing utilities still
  render something.
- A verbal "yes, repair N" beyond the signed budget leaves the phase
  unclosable. Sign the budget extension at the moment of approval.
- [GLOBAL] Meter time and tool calls per stage during a KBD boundary run. The
  terminal closure evaluator refuses unmeasured budgets, and the figures cannot
  be reconstructed honestly afterwards.
- [GLOBAL] A CI negative-control step must itself run once on a branch before
  merge. A layer-less `FROM scratch` image makes `docker save` fail, so the
  control returns 2 instead of 1.

## Next Phase Seed

These are proposals only; none of them starts a successor.

- Harden continuous deployment:
  - branch protection on `main` with a bypass for the deploy bot;
  - a dedicated AppProject;
  - deploy by digest.
  A follow-up session is open.
- Fix the Flutter golden failures in CI. A follow-up session is open.
- Decide whether to turn on NetworkPolicy enforcement for the node pool.
- Add an "Enable audio" prompt.
- Plan the next product slice: sign-in, then the Concierge.

## Codify as Skill?

Candidate: a "release-tooling pre-flight" step for VLBV phases. It would run
the scan reader, lint config and CI controls against fixtures before the value
boundary. Not codified; it needs operator agreement that tooling fixtures are
not generated-code verification.
