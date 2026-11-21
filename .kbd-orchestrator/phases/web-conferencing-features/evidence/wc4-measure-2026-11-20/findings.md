# WC-4 first-blur measurement (2026-11-20)

Operator: "Yes, measure it". One run per graphics mode, the suite's topology (A and B in one browser), against the packaged stack built from `b7249a4f`. Script: `wc4-measure.ts`; raw results in `gpu-headed/result.json` and `software-headless/result.json`. A 20 ms heartbeat and a long-task observer run in A's page; the 30 s window starts at the Blur click.

| Measure | Headed, GPU (ANGLE Metal, Apple M1 Max) | Headless, software (SwiftShader) |
| --- | --- | --- |
| Click to tile reporting `background-blur` | 1.0 s | 0.3 s |
| Longest main-thread stall | **6.5 s**, starting 1.1 s after the click | 5.4 s, starting 0.5 s after the click |
| Long tasks in the 30 s after the click | 2, 7.2 s in total | 128, **26.3 s in total** (88 % of the window) |

Findings:
1. **Product defect, every browser:** the first time someone turns on a background effect, the meeting page freezes for seconds. On a fast GPU Mac it is one 6.5 s stall, about 1 s after the click, right after the effect reports active. Nothing on the page responds during it: controls, the clock, chat. This is the user-facing problem behind WC-4, and r8 only exposed it.
2. **Product defect, no-GPU browsers:** with software graphics, the effect keeps the main thread busy 88 % of the time for as long as it runs. The page is barely usable while blur is on. The r8 run (a 19 s stall under host load) is this case.
3. **Test consequence:** WC-4's oracle reads the tile through a 15 s action timeout, so any stall over 15 s fails it. r5–r7 passed because their stalls were shorter.

Not yet known: which call inside the first effect start holds the main thread for 6.5 s (MediaPipe WASM or model initialisation, or GPU pipeline warm-up). A fix needs that first.
