# Contract amendment 2: proposal

Drafted by the lead on 2026-11-16 at the operator's request ("Draft amendment 2").
**Status: approved by the operator on 2026-11-16 ("Approve as drafted"), applied,
not yet signed or adopted.** `adopted-contract.json` holds the amended text
(digest `abf8d22d…`); the bound version is kept as `adopted-contract.v2.json`
(sha256 `ce831689…`, bound digest `772bfa1f…`). The phase is not READY until
`amend-contract-2.manifest.json` is signed and adopted. The text below is the
proposal as approved.

The amended text is produced by `amend-contract-2.jq` in this folder. It was
applied to a scratch copy only, to confirm it parses. Four top-level fields
change: `boundaryPacket`, `evidenceInvalidation`, `adoptionSource`, and one
scenario's `productionEntry` (WR-7). Scope, exclusions, required safety checks,
budgets and the release claim do not change.

Nothing in the worktree has been built, run, applied or committed.

## Why an amendment is needed

The boundary packet in the contract cannot run as written. The lead drafted
that packet, before the manifests, runbook and tools existed. Round 5 wrote
them, and they do not line up with it. Eight points follow: the five reported
after round 5 and three more found while drafting.

| # | Contract says | What exists | Change in the draft |
|---|---|---|---|
| 1 | Compose file `infra/local/compose.yaml` | `tooling/release/compose.yaml` | Path corrected in both commands |
| 2 | `verify-cluster` confirms the Secret before the apply; Argo CD creates the namespace | A Secret needs its namespace first | Operator creates namespace `know-meet`, then the Secret; Argo CD takes the namespace over |
| 3 | `argocd app wait`, and WR-7 reads `argocd app get` | Argo CD is ClusterIP only; the CLI needs a port-forward, a login and a password | Waits and WR-7 read the Application object with `kubectl` |
| 4 | Merges after the packaged run | Runbook and plan put merges before the run | Packaged run first; push, merge and task 8.6 after the second approval (decision D1) |
| 5 | Cleanup removes "the staging certificate Secret" | Staging and production share `meet-know-me-tools-tls` | Cleanup says do not delete it |
| 6 | Two `docker build` commands with no build argument | The web image needs `KM_LIVEKIT_URL` | One `docker compose … build`, which passes the argument and produces the same two tags |
| 7 | No step renders the CSP into the Gateway headers | Git holds a placeholder CSP that fails closed | Render and commit the one generated file inside the run, then `--check` |
| 8 | One endpoint check, then the hosted run | Staging is issued first and browsers reject it | Staging check with `--allow-staging`, issuer merge, wait, production check, hosted run |

Point 7 could not be solved before the run: rendering needs `build:hosted`,
and VLBV allows no build of generated code before the boundary.

## The run as drafted

1. **Before the run.** The work is committed on `feat/web-release` at your
   request. Nothing is pushed.
2. **Local part (first approval).** Install, lint, typecheck, test,
   `cargo check`, hosted build, header render and its one-file commit, header
   check, image build, artifact scan, compose up, default build and preview,
   packaged Playwright run, compose down. Then the accessibility, UI and
   security reviews.
3. **Second approval.** You are shown every line that names a host, and the
   packaged verdicts.
4. **Publish.** Branch pushed, pull request merged by you, images workflow,
   packages public, spending control, tag-pin pull request (task 8.6) merged
   by you.
5. **Identity check.** `git diff` proves `main` equals the tested commit
   except for the two `newTag` lines. The scan runs again on the final render.
6. **Cluster.** You create the namespace and the Secret. Then `verify-cluster`,
   the apply, and the two waits.
7. **Certificate.** Staging endpoint check, issuer pull request merged by you,
   wait for the new revision, production endpoint check.
8. **Hosted run** at `https://meet.know-me.tools`.

The command list grows from 19 to 28. Nine operator steps are listed in a new
field, `boundaryPacket.operatorSteps`.

## Decisions for the operator

**D1. Packaged run before any push or merge (drafted), or merge first.**

- *Drafted.* No generated code is built anywhere, including CI, before the
  local part passes. A failed packaged run leaves `main` and the registry
  untouched. Cost: task 8.6 runs inside the boundary after the second approval,
  not before `wr09` as `plan.md` says, and evidence is tied to the deployed
  commit by a tree comparison.
- *Merge first (the runbook as written).* Simpler identity: everything runs on
  the pinned commit on `main`. Cost: unbuilt, untested code is merged; the
  pull-request checks and the images workflow build it before the boundary,
  which VLBV does not allow without a new exception from you; every repair is
  another merge to `main`.

Recommendation: the drafted order.

**D2. Read Argo CD state with `kubectl` (drafted), or use the Argo CD CLI.**
The drafted form needs no port-forward, no login and no password. The CLI form
keeps the contract's original commands and adds two operator steps: the
port-forward and `argocd login` with the password typed at its prompt.
Recommendation: `kubectl`.

**D3. Creating the namespace by hand.** This is a cluster-changing command the
contract did not list. It is the only order in which `verify-cluster` can find
the Secret before the apply. Consequence: once Argo CD owns the namespace, a
cascading delete of the Application deletes the namespace and the Secret.

## Kept as the tools were written

- `verify-endpoint` compares the CSP byte for byte, which is stricter than the
  WR-3 test. A whitespace-only difference would fail the tool while the test
  passes. The draft keeps `--csp-file` on the production check.
- `verify-cluster` fails unless Envoy Gateway is exactly v1.10.0. The draft
  writes that into the expected effects, because `cluster-context.md` records
  that version.

## Edits that follow adoption (not made)

- `docs/release/web-release-runbook.md`: section 1 order (1.3, 1.4, 1.6 move
  after section 2), 3.2 note, 4.1 (login only if the CLI is chosen), 4.3
  commands, open points.
- `docs/release/web-release-operations.md` section 6.3, and the "Ordering"
  paragraph in `tooling/release/README.md`.
- `plan.md`: the sentence that the packet runs after wr01 to wr08 are complete.
- `tasks.md` of `wr08` and `wr09` still cite contract `9ccc9805…`.

## Not verified

- Whether `kbd-apply` lets `wr09` tasks 9.1 to 9.3 begin while task 8.6 is
  open. Not tried, because beginning a task changes runtime state.
- That `.status.sync.revision` holds the full commit SHA, and that the
  Application's health waits for the Certificate, on Argo CD v3.6.1.
- That `--allow-staging` also relaxes the chain-trust check.
- That `docker compose up --wait` returns promptly with no health checks
  defined in the compose file.
- Which workflows run when the pull request opens.
- The `kubectl wait --for=jsonpath` form was read from local `kubectl wait
  --help`. It was not run against the cluster.

## What this draft does not fix

- **The packaged run does not test the deployed images.** It tests images built
  on this machine. The cluster runs images the workflow builds from the same
  tree, with different digests. WR-8 (accessibility) is proven only on the
  local images. The draft states this in `evidenceInvalidation`; it does not
  close it.
- **The single run now spans three merges by the operator** and two CI waits.
  A run that long can stall on a person or on GitHub, and each stall spends the
  1,800-minute budget.
- **The first release has no rollback.** There is no earlier tag to return to;
  the fallback is teardown.
- `tooling/release/` is still outside the root typecheck and CI.
- The earlier open items are unchanged: port gaps, control colours, manual
  image builds from any ref, the `ui-engineer` definition, `versions.toml`
  entries, and the possible `protoc` gap in the token service image.

## To adopt

1. Answer D1 to D3. If D1 or D2 changes, the lead edits `amend-contract-2.jq`.
2. The lead applies the script with your answer and the date, keeps the
   current contract as `adopted-contract.v2.json`, and generates
   `amend-contract-2.manifest.json` (previous digest `772bfa1f…`).
3. You sign the manifest with your SSH key, or instruct the lead to as you did
   for amendment 1. Until it is signed the phase is not READY.
