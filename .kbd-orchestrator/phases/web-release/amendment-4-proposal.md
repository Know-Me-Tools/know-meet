# Amendment 4 proposal: budget accounting for closure

Status: DRAFT. Not applied, not signed, not adopted. The bound contract is
still amendment 3 (sha256 `35ef6575…`).

## Why

The terminal closure evaluator (`kbd-phase-close-eval.sh`) closes the phase
only when every scenario has PASS evidence and the measured budget is within
the bound ceilings. Two of the ceilings are exceeded:

| Dimension | Ceiling (amendment 3) | Consumed | Class | Source |
|---|---|---|---|---|
| repairAttempts | 6 | **7** | measured | `attempts.tsv` (repairs 1–6) + decision-log 2026-11-16 "Yes, repair 7" (b29d7d59) |
| timeMinutes | 1800 | **1944** | measured (wall-clock) | dispatch `2026-11-15T12:15:00Z` (`execute-dispatch.json`) to execute complete `2026-11-16T20:39:30Z` |
| toolCalls | 2500 | 1713 | measured, lower bound | `tool_use` entries in this project's session and subagent transcripts in that window |
| noProgress | 3 | 0 | measured | every attempt in `attempts.tsv` changed the failure |

Active time by transcript gaps of 15 minutes or less is about 431 minutes. The
contract does not define `timeMinutes`, so this proposal uses wall-clock: the
measure that does not flatter the result.

## What it changes

Only `budgets.extensions` (one entry) and `adoptionSource`, in
`amend-contract-4.jq`:

- `repairAttempts` 6 → 7, for repair 7 (CI-only change to `images.yml`; neither
  image changed).
- `timeMinutes` 1800 → 1950, to cover the measured 1944.
- `toolCalls` and `noProgressLimit` unchanged.

There are no changes to scope, scenarios, exclusions, safety checks, boundary
commands or the release claim.

## Closure evidence prepared with it

`boundary-results.draft.json` holds PASS entries for WR-1 to WR-9, each with
the command, the observed result and the evidence path, plus the budget
consumption above. After adoption, the lead fills in `contractDigest` with the
new bound digest, renames the file to `boundary-results.json`, and runs the
evaluator once.

**The uncomfortable part: source freshness.** The evaluator recomputes the
sha256 of every file named in `sourceDigests` under this checkout. The release
source is not in this checkout: it is on `main`, and this checkout is on
`feat/round-5-ui-kit-flutter-commands`. The draft therefore binds freshness to
the identity receipts in the phase folder:

- `tested-commit.txt`, which pins `bb399985` and issuer commit `3f52a0b2`;
- the image digest file;
- `verify-cluster.json` and `verify-endpoint.json`.

This proves the receipts were not changed after the run. It does not prove
that the product files in this checkout match `bb399985`. The commit SHA and
the image digests are what bind the product. If you want product-file
freshness, the evaluator has to run from a checkout of `main` instead.

## What happens after you approve

1. Apply the jq with your words and the date, keeping
   `adopted-contract.v4-prior.json`.
2. Generate the amend-contract manifest, sign it with your key (namespace
   `prometheus-kbd-scope-amendment`), and verify against the allowed signers.
3. Adopt with `kbd-contract-adopt.sh --supersedes contract-adoption-web-release-35ef6575`,
   re-bind KBD-METHOD, and refresh the method context.
4. Finalize `boundary-results.json` and run `kbd-phase-close-eval.sh --phase web-release`.
   On PASS the runtime closes the phase. Then `phase:after` fires.
