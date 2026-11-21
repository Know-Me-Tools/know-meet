# Reflection: wc-boundary-defect-scope

## Delta

Planned: measure every defect blocking the parent's static boundary gates in one
pass, classify them, and recommend a repair strategy.

Delivered:
- The diagnostic sweep and the static seam scan measured nine items:
  - D1–D5 need code;
  - D6–D9 are run inputs, two of them (D8, D9) found only by the sweep.
- Amendment 1 was drafted, signed by the operator and adopted (contract `7062a5d7`).
- Repair 4 (`aea6d789`) fixed D1–D5 in one commit.
- Parent boundary run r4 then passed all six static steps on the first run, at
  `aea6d789` (`evidence/boundary-2026-11-19-r4/`).

Two things differ from the plan:
1. The first build attempt hung for 81 minutes on the shared sccache. It was
   stopped and rerun without the cache. That cost time, not correctness.
2. The sweep's typecheck step passed `--continue` to the trailing `tsc`, a
   lead error. It was caught by reading the log, and r4 used the corrected form.

## Root cause confirmed

Repairs 1–3 each found one defect because each run stopped at its first
failure. Once every gate ran to completion, the whole static set came out in a
single sweep, and one batched repair cleared it.

## What this child did not cover

None of the WC behaviour scenarios has executed. That is the parent's packaged
run, which this measurement could not predict.

## Lessons

- [GLOBAL] Under VLBV, run boundary static gates to completion (Turbo `--continue`,
  a runner that records every failure) before spending any repair. A
  stop-at-first-failure runner turns one defect into one repair.
- A failed or hung step is measurement, not a defect, until its log is read:
  the `--continue` flag landing on `tsc`, and the sccache hang.
