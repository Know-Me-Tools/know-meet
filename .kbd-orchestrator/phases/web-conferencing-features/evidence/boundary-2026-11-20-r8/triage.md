# B5 rerun r8 — candidate b7249a4f (2026-11-20)

Full packaged suite, 54 tests: 50 passed, 4 failed. Gate verdict: FAIL (WC-4 only). Images rebuilt from b7249a4f; compose healthy (healthz 200).

| Scenario | Outcome | Finding |
| --- | --- | --- |
| WC-1–3, WC-5–9, WC-11, WC-12 | PASS | Includes both late-joiner WC-9 cases. |
| WC-4 | FAIL | Not a product miss on the evidence so far: A's tile reports `background-blur` 0.8 s after the click (trace snapshot at the 3rd read, right after MediaPipe "Graph successfully started running"). The next read then waits 15 s for `km-local-tile`, an element the same snapshot shows present, so the page stopped answering Playwright. The poll ran out on an earlier "none" read. B's frame witness never ran. Root cause of the unresponsive page not proven (CPU or GPU starvation of headless Chrome while MediaPipe starts is the leading reading). WC-4 passed in r5, r6 and r7, and repair 8 touched no effects code. |
| WC-13 | FAIL (1 cell per theme) | Only `recordings-playback` at 1440: `km-recording-play` fill 1.05:1 (light) / 1.23:1 (dark). It is a ghost icon button with no resting fill; the measured fill is its hover state, because the pointer is still over it after the tour's click at that width (the other ghost buttons in the same row are not flagged). WCAG sets no contrast requirement for hover; the icon itself contrasts. Every other surface, width and theme passed, including the room layout check, the inert dialogs and the playback screens (reached for the first time). |
| WR-4 | FAIL (signal, non-gating) | Same as r7: not every request beyond the burst returned 429. |

Repair budget: 8 of 8 used. Any further repair or rerun needs a signed amendment.

## WC-4 diagnosis (2026-11-20, from the r8 trace only; nothing re-run)

Timeline (trace clock, ms; page A = `1-trace`, page B = `3-trace`):
- 1300759 A clicks Blur. 1301101 and 1301260: tile reads `none` (applying).
- 1301446 MediaPipe logs "Graph successfully started running".
- 1301584 the tile's snapshot shows `data-video-processor="background-blur"`: the adapter reached `active` about 0.8 s after the click.
- That same read then waits 15.4 s and throws; `expect.poll` gives up at 1319982 on the earlier `none`.
- A's screencast frames at +1.3 s and +11 s are identical: the meeting clock reads 00:04 in both and neither A's tile nor the Settings preview is blurred. The failure screenshot at about 1321 s shows the clock at 00:26 and the blur drawn. A's main thread (React, timers, Playwright's injected script) was frozen from about 1301.5 s to about 1320 s, roughly 19 s.
- Paint rate fell from about 12–25 frames/s to about 3.5 frames/s on both pages at the same moment, though B runs no effect. Both pages share one headless Chromium and its GPU process.

Reading: the first background effect starts MediaPipe's segmenter on the GPU delegate. Headless Chromium here has no GPU, so WebGL runs on SwiftShader (software) in a GPU process shared by both pages; A's main thread blocks on synchronous GL work against that saturated process until the pipeline warms up. The product state was right (active in 0.8 s), but for about 19 s the page did not respond and showed no blur.

Why r5–r7 passed: same mechanism, shorter or later-landing stall. WC-4 took 20.0 s, 14.2 s and 28.7 s there (42.7 s in r8), so the stall length varies with host load; the test's 15 s read timeout is what turns a long stall into a FAIL.

What is and is not established:
- Established: a first-use main-thread freeze of about 19 s on software GL, with correct effect state.
- Not established: whether a real user with a GPU sees any comparable freeze. That decides whether this is a product defect (first-use jank when blur is turned on) or a test-environment artefact. It needs one measured run on GPU-backed Chrome (a headed run here, or the hosted run on a real browser).
