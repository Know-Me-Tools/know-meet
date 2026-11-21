# r9 triage (B5 rerun after repair 9, candidate 8f6297ef)

Scope (amendment 4): WC-4 GPU and software paths, WC-13. 6 passed, 2 failed.

| Test | Result | Cause |
|---|---|---|
| WC-4 GPU path (headed, ANGLE Metal, Apple M1 Max) | PASS | Blur, image and off seen on B; longest main-thread gap after each choice 51 / 51 / 46 ms (limit 2000); no off-origin wasm/model, no CSP violation. The r8 freeze (19 s) is gone. |
| WC-4 software path (headless, SwiftShader) | FAIL (test text) | The product showed the unavailable note, no choices and no processor. The test expected the substring "not available on this device"; the copy says "aren't available on this device". Defect in the repair 9 test edit, not in the product. Mute step not reached. |
| WC-4 negative control | PASS | |
| WC-13 axe/stroke/fill, dark and light | PASS | The r8 hover cell is gone (pointer parked). Unavailable note audited. |
| WC-13 keyboard | FAIL (test not updated) | `wc-13-accessibility.spec.ts:251-258` focuses the effect radios (`km-effect-off`), which do not exist on software graphics since repair 9. Repair 9 updated the surface tour but missed the keyboard tour. |
| WC-13 reduced motion | PASS | |
| WC-13 negative control | PASS | |

Both failures are in test code written in repair 9; neither is a user-facing defect. Repair budget 9 of 9 is used.
