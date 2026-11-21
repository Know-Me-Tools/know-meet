# WC-4 first-blur CPU profiles (2026-11-20)

Operator: "Yes, profile it". CDP sampling profiler (0.5 ms) on A's page for the 12 s after the first Blur click, one run per graphics mode, packaged stack at `b7249a4f`. Script `wc4-profile.ts`; profiles `*/first-blur.cpuprofile`; summary tool `prof-sum.mjs` (in the session scratchpad). The production bundle has no source maps; library frames are named by the shipped `@livekit/track-processors` 0.8.3 and `@mediapipe/tasks-vision` 0.10.14 code.

## GPU (headed, ANGLE Metal, M1 Max)

This run: longest stall 0.49 s (earlier measurement run: 6.5 s). The stall is the first processed frame:
`transform` (track-processors) → `finishProcessing` → `Module._waitUntilIdle` (tasks-vision WASM) → `glUseProgram`, which takes 335 ms of the 493 ms. `useProgram` blocks until the GPU process has compiled and linked MediaPipe's shader programs, which the GPU delegate builds lazily on the first segmentation. With the GPU shader cache warm it costs about 0.5 s; the 6.5 s in the earlier run fits a cold cache (that run was the first on this machine to compile these shaders). Every later frame was cheap: the page was idle 91 % of the window.

## Software graphics (headless, SwiftShader)

Longest stall 5.96 s; 8.7 s of the 12 s window is self time in track-processors' `transform`. Per frame it draws the composite into a WebGL canvas and then calls `new VideoFrame(this.canvas)`, which forces a synchronous read-back of the WebGL canvas on the main thread. On software graphics each read-back blocks for hundreds of milliseconds, frame after frame, so the page stays saturated for as long as an effect is on.

## Cause and where it lives

Both stalls are inside the library's main-thread pipeline (GPU-delegate MediaPipe plus a canvas-to-VideoFrame copy per frame); our adapter code is not on the hot path. track-processors 0.8.3 has no worker or OffscreenCanvas mode.

## Product fix options (operator decision)

1. **Refuse effects on software graphics.** When WebGL reports a software renderer (SwiftShader, llvmpipe, "Software"), report `backgroundEffects: "unsupported"` with the existing explanation path. Removes the continuous saturation for no-GPU users. Small and contained (conferencing support detection). Consequence: WC-4's positive path must run on a GPU-backed browser, which is a runner change in the contract.
2. **Move the first-frame compile off the click.** Warm the processor up before the person asks for an effect (for example when Settings opens), and show "Preparing background…" until the first processed frame. The 0.5–6.5 s stall still happens, but at a moment the person isn't waiting on, with honest feedback. Medium.
3. **Off-main-thread processing.** Run segmentation and compositing in a worker with OffscreenCanvas (fork or replace track-processors). Removes both stalls; large, a new phase.
