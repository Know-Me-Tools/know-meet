# Amendment 2 proposal: the gate is what a user can do

Status: DRAFT. Not applied, not signed, not adopted.
Bound contract: sha256 `7062a5d7…` (amendment 1). Patch: `amend-contract-2.jq`.
Applied to a scratch copy, it changes only `boundaryPacket`, `budgets.extensions`
and `adoptionSource`.

## Why

AGENTS.md and CLAUDE.md say: "Unit, mock-only, filtered-function and per-edit
tests are not completion evidence", and the phase ends with one integration gate
through the real production path. The plan's boundary broke that rule: lint,
typecheck and unit tests each blocked the run before any user scenario ran.
Repairs 1–4 went to those failures and to test-harness logic. No user scenario
has yet reached its feature. The plan's author (the lead) wrote that boundary.

## What it changes

| Field | Now | After |
|---|---|---|
| Verdict | every command must pass, in order | only the gate scenarios decide it |
| Gate | (all steps) | WC-1 to WC-9, WC-11 notes, WC-12, WC-13 (accessibility and design of the new controls) |
| Signals | (none, everything gates) | lint, typecheck, unit tests, header check, WC-10 header checks, WC-11 pins, WC-14 repo rules, WR-4 token abuse, detector controls: recorded, never block |
| Packaged run | runs after the static gates pass | runs to completion; the verdict comes from the gate scenarios |
| Test environment | values in the shell | `tooling/release/release-test.env`, committed, read by compose and the runner |
| Repairs | any failure costs one | only gate-scenario failures cost one, batched |
| Budget | 5 repairs (4 used), 2100 min | 7 repairs, 2700 min; the last extension |

Required safety checks are unchanged. How each one is shown is in `gateEvidence`.
Consent, private delivery and local-only data are shown by WC-2, WC-3 and WC-7 to
WC-9. Secrets are covered by the security review. Desktop CSP byte-identity becomes
a signal, because desktop is out of scope.

## The run after adoption

- **Repair 5, one commit:**
  - adds `release-test.env`;
  - makes the WC-12 helper join without a user gesture (it uses `fill()` today,
    which counts as one);
  - makes the run compute its verdict from the gate scenarios.
- **The packaged run:** one run to completion against the r4 images. The repair
  touches no image input.
- **If a gate scenario fails:** one batched repair (6), and if needed one more (7).

## The uncomfortable part

- **Signals no longer block.** A lint or unit-test regression can now ship if no
  user scenario touches it. CI still runs those checks on the PR.
- **This is the last extension.** If a gate scenario still fails after repair 7, the
  phase closes unmet with its evidence.
- **The local limits are raised, not tested.** The test environment raises the
  token service's per-address limits because the suite plays about 30 people from
  one machine. The production limits are unchanged and are not tested by the gate.
