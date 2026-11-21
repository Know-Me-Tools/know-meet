# B5 rerun r10 — repair 10 (test-only), amendment 5

- Candidate: `fe60f63b` (test files only; product code identical to `8f6297ef`). Images identical to r9 (`image-digests.txt`), stack healthy (`healthz 200`).
- Scope (amendment 5): the WC-4 software-path test and the WC-13 keyboard test, once.
- Result: 2 of 2 passed (`02-packaged.log`, `packaged/playwright.json`).

| Test | Result | Evidence |
| --- | --- | --- |
| WC-4 software graphics: effects reported not available, meeting stays responsive | PASS | note shown with the product wording, no effect choices, no processor; mute changed state 83 ms after the click (limit 2000 ms) — `wc-4-software-mute.json` |
| WC-13 every new control reachable and operable by keyboard, focus shown by fill | PASS | `wc-13-keyboard.json`: problems `[]` |

With r9 (WC-4 GPU path PASS; WC-13 surface audits, reduced motion and negative control PASS), every WC-4 and WC-13 test now passes at product code `8f6297ef`.

Not covered: keyboard operation of the effect radios. The packaged run uses software graphics, where the radios are not offered; the r9 GPU run did not tour them by keyboard.
