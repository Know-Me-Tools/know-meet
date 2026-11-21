# Contract amendment 4 for web-conferencing-features.
# Apply with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-4.jq adopted-contract.json
# Purpose: one more batched repair (repair 9) for the WC-4 freeze found in run r8 and
# located by measurement and profiling (evidence/wc4-measure-2026-11-20/findings.md,
# evidence/wc4-profile-2026-11-20/findings.md). Both stalls are inside
# @livekit/track-processors 0.8.3: on a GPU, a one-time shader compile on the first
# processed frame (0.5 s warm, 6.5 s cold); on software graphics, a blocking per-frame
# canvas read-back that saturates the page for as long as an effect is on.
# Repair 9 carries operator-chosen options 1 and 2 ("Yes, do as you recommend"):
#   1. Background effects are reported unavailable when the browser renders WebGL in
#      software (SwiftShader, llvmpipe, "Software"); the meeting stays usable.
#   2. The effect engine is prepared when the effects section is shown, with a
#      "Preparing background…" state, so the one-time compile happens before a choice.
# plus the WC-13 test fix (move the pointer off the playback button before measuring).
# Changes: WC-4 productionEntry, oracle, negativeControl, fixtures and evidence (the
# positive path runs in a GPU-backed Chromium; the software path checks the unavailable
# state and that the meeting stays responsive); budgets.extensions; adoptionSource.
# Unchanged: scope, every other scenario, exclusions, required safety checks, gate rule,
# release claim.

(.scenarioMatrix |= map(
  if .id == "WC-4" then
    .productionEntry = "wc-4-background-effects.spec.ts, packaged then hosted. Positive path: headed Chromium on the operator's Mac, whose WebGL renderer is hardware (ANGLE Metal); the run records the renderer string and fails BLOCKED if it reports a software renderer. Software path: headless Chromium as the rest of the suite runs it (SwiftShader)."
    | .oracle = "GPU path: after the effects section is shown and reports ready, choosing blur makes A's published track report an active processor and B's rendered frame differ from the pre-effect frame; after image, the same; after off, no processor and B still renders frames. After each choice, A's page answers a main-thread probe within 2 s (no unexplained freeze after the person chooses). No request leaves the origin for .wasm or .tflite files and no CSP violation is reported. Software path: the effects section states that background effects are not available on this device, the blur and image choices cannot be selected, A's track reports no processor, and A's mute control changes state within 2 s of a click."
    | .negativeControl = "With effects off, A's track reports no processor. On the software path, no processor is ever attached."
    | .fixtures = "Fake camera from a fixed y4m file; one fixture background image; a headed Chromium with hardware WebGL for the GPU path."
    | .evidence = "Report, WebGL renderer string per path, frame screenshots (visual quality labelled judgement), main-thread probe timings, network log, CSP violation log, screenshot of the unavailable state."
  else . end))

| .budgets.extensions += [{
    id: "ext-4-wc4-repair",
    repairAttempts: 1,
    timeMinutes: 600,
    toolCalls: 0,
    resultingCeilings: { timeMinutes: 3900, toolCalls: 2500, repairAttempts: 9, noProgressLimit: 3 },
    reason: "Run r8 at b7249a4f passed every gate scenario except WC-4 (and a WC-13 test-side hover cell). Measurement and profiling showed a real user-facing defect inside @livekit/track-processors: a one-time freeze on the first processed frame with a GPU and a continuous freeze without one. Repair 9 is one batched commit for options 1 and 2 plus the WC-13 test fix; WC-4 (both paths) and WC-13 rerun once. Wall-clock since dispatch (2026-11-18T23:51:55Z) was about 2925 minutes at 2026-11-21T00:37Z against 3300. If a gate scenario still fails after repair 9, the phase closes unmet.",
    operatorAnswer: $answer,
    date: $date
  }]

| .adoptionSource += " Amendment 4: operator answer \"" + $answer + "\" on " + $date
    + ": one more batched repair (repair 9) for the WC-4 freeze; effects reported unavailable on software WebGL and the engine prepared before a choice; WC-4 positive path runs in a GPU-backed Chromium; repairAttempts 8 to 9 and timeMinutes 3300 to 3900."
