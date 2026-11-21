# Amendment 1 proposal: one batched repair, a reserve, and run-to-completion gates

Status: DRAFT. Not applied, not signed, not adopted.
Bound contract: sha256 `24260182…` (decision
`contract-adoption-web-conferencing-features-24260182`).
Patch: `amend-contract-1.jq`. It was applied to a scratch copy, and only the
five fields below differ. The digest rule (`jq -S -c 'del(.identity.contractDigest) | del(.identity.planRevision)'`)
reproduces the current `24260182…`, so the new digest is computed the same way
at signing.

## Why

All three repairs are used. Each one fixed a single defect, because every run
stopped at its first failure: first the runner, then Turbo.

The child phase `wc-boundary-defect-scope` then measured the whole static set
in one pass, without changing code: `children/wc-boundary-defect-scope/assessment.md`.

| Gate at `440156e2` | Result |
|---|---|
| lint | PASS |
| typecheck (8 packages) | PASS |
| unit tests (119 in 7 packages) | 1 FAIL (D1) |
| `pnpm build` (web, Rust, Flutter, iOS, Android) | PASS, after running without sccache |
| `build:hosted` | PASS, once `KM_LIVEKIT_URL` is supplied |

The register has seven defects (D1–D7) plus two run-time facts (D8, D9).
Five need code, about 25 lines in tests and harness only:

- D1: the stale unit test.
- D2 and D3: the WC-11 pin and lockfile checks.
- D4: the WC-10 tag.
- D5: the compose ports.

D6 and D7 are run inputs. D8 is the missing `KM_LIVEKIT_URL` input. D9 is the
sccache hang. No defect is in a product feature.

## What it changes

| Field | Now | After |
|---|---|---|
| `budgets` repairAttempts | 3 (all used) | 5: repair 4 = one batched commit for D1–D5; repair 5 = reserve |
| `budgets` timeMinutes | 1500 (1237 used by wall-clock at 20:29Z) | 2100 |
| `boundaryPacket.repairPolicy` | none | A repair fixes every defect known at that moment, after a full static sweep |
| `boundaryPacket.staticGateMode` | runner stops at the first failure | static steps run to completion and record every failure; stop before images if any failed |
| `boundaryPacket.runInputs` | 6 entries | +5: `KM_LIVEKIT_URL`, port remap (and the 3 URLs that move with it), default-build preview server, previous CSP file, `RUSTC_WRAPPER` unset |

Unchanged: scope, the scenario matrix, exclusions, required safety checks, stop
conditions, the release claim, `noProgressLimit` and `toolCalls`.

## The uncomfortable part

This budget covers what static measurement can see. The packaged Playwright run
has never executed. Screen share, chat, effects, devices, history and recording
are all unproven. If more than one behaviour failure appears there, the reserve
will not cover it, and the honest outcome is to close the phase unmet with the
evidence, rather than another extension.

I set the original budget of 3 knowing the web-release reflection recorded the
same one-defect-per-run pattern. This amendment corrects that sizing. Its
staticGateMode removes the pattern for the rest of this phase. Whether VLBV
should allow static checks during generation in future phases is a separate
KBD-METHOD question, and this amendment does not decide it.

## What happens after you approve

1. Apply the patch with your words and the date, and keep the current file as
   `adopted-contract.v1-prior.json`.
2. Generate the amend-contract manifest and sign it with your key (namespace
   `prometheus-kbd-scope-amendment`). Verify it against the allowed signers.
3. Adopt with `kbd-contract-adopt.sh --supersedes contract-adoption-web-conferencing-features-24260182`,
   then refresh the method context and confirm readiness is READY on the new digest.
4. Repair 4: one commit fixing D1–D5, then run boundary r4 from step 1 in
   run-to-completion mode. Then the header, images, compose on remapped ports,
   the packaged run and the reviews, then stop for your push approval.
