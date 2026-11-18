# Contract amendment 3: proposal

Drafted by the lead on 2026-11-16 from three operator instructions in the decision log:
"Use other ports", "continue, and add the CD job in this release" and "Yes, fix and re-run".
**Status: draft, not signed, not adopted.** The amended text is produced by
`amend-contract-3.jq`; it was applied to a scratch copy only. It is meant to be signed together
with the second approval, before any push, merge or cluster command.

## What changes

| # | Contract says | Change |
|---|---|---|
| 1 | Task 8.6: the lead prepares a tag-pin pull request; the operator merges it | The deploy job in `.github/workflows/images.yml` pins both `newTag` lines to each main build's commit SHA and pushes one bot commit; Argo CD syncs main. Supersedes decision `web-release-promotion-by-pr`. |
| 2 | `budgets.repairAttempts` 3 | 4: the correction round the operator authorized after both reviews returned BLOCK |
| 3 | Compose publishes 8080 and 8081 | The boundary run adds `compose.ports-override.yaml` (18080, 18081); those ports are held by other services on this machine |
| 4 | Nothing compares the LiveKit URL across sources | `check-livekit-url.sh local`, `cluster` and `served` compare the repository variable, build CSP, Gateway header, cluster Secret and served page with the shell value, without printing it |

Scope, exclusions, required safety checks, scenarios and the release claim do not change.

## What the CD job does

After the images job builds, scans and pushes both images for a push to main, the deploy job
checks out the latest main, sets the two `newTag` lines to that commit SHA, verifies the diff is
exactly those two lines, and pushes as the Actions bot. It does nothing if main already pins that
commit or a later one, retries a rejected push three times on the latest main, and alone holds
`contents: write`. Its commit touches `infra/**`, which the images trigger ignores, and a push made
with the workflow token starts no workflow, so it cannot loop. Checked locally with GNU sed in a
scratch repository; `actionlint` passes. It has not run on GitHub yet.

## The uncomfortable part

From the first merge on, every change to application code on main reaches the public site with no
human step. There is no branch protection, no required review and no CODEOWNERS on `main` or
`infra/**` today (checked with the GitHub API: "Branch not protected", no rulesets), and the Argo
CD Application uses the `default` project (security review M4). A bad merge is live within
minutes, and the only gate is the images workflow's build and secret scan. The release's
WR scenarios run only in this boundary run, not on every main push. Branch protection and a
dedicated Argo CD project are the recommended follow-ups; they are not in this amendment.

## To adopt

1. Operator answers. 2. The lead applies the script, keeps the current contract as
`adopted-contract.v3.json`, and generates `amend-contract-3.manifest.json`.
3. The operator signs, or instructs the lead to. Until then the phase stays READY on amendment 2,
and the CD job is in the tree but no deployment depends on it.
