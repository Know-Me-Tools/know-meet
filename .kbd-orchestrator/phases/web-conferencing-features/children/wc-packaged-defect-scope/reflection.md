# Reflection: wc-packaged-defect-scope

## Delta

Planned: run the packaged Playwright suite once to completion as a diagnostic,
classify every failure, and recommend one batched repair.

Delivered: no run. The operator stopped this work on 2026-11-19 because the
boundary itself was wrong: lint, typecheck and unit tests gated the run, against
AGENTS.md and CLAUDE.md ("Unit, mock-only, filtered-function and per-edit tests
are not completion evidence"). Amendment 2 to the parent contract replaces this
child's purpose: the parent's next packaged run goes to completion and only
user-task scenarios decide its verdict. The operator approved amendment 2
("Approve and sign") on 2026-11-19.

## What this child did not cover

Nothing was executed here. The r4 packaged-run findings (meeting-creation 429s
from one source IP, and the WC-12 helper's `fill()` granting user activation)
were already measured in the parent and move into repair 5.

## Lessons

- [GLOBAL] Before opening a diagnostic child, check the boundary against the
  project's verification rules. A diagnostic of a wrongly built gate measures
  the gate, not the product.
