# Reflection for web-local-transcription

## Plan-to-delivery delta

1. The first packaged run never exercised the three acceptance scenarios. The pinned FP16 Whisper decoder failed during model preparation despite having loaded the model assets. Isolating the third-party failure led to the pinned Xenova Whisper Tiny.en FP32 encoder and Q4 decoder with cross-attention for bounded word timing.
2. The first repair passed the browser cases, but independent review found that invalid alignment disappeared without a gap, search bypassed the contract's PGlite collaborator, and the KMT-1 privacy and cutoff evidence was incomplete. The repair also added durable readback after a denied save.
3. The second and third repairs exposed two consent-fixture defects. The private-phrase helper assumed a single remote despite the late guest. The receiver tap depended on how a peer connection constructor was wrapped and missed the negotiated channel. The final test-only repair sits at the native RTC data-channel message-handler registration and retains the independent PCM witness.
4. The plan's old fourth implementation task was cancelled in the canonical ledger because evidence belongs at phase end. Three product tasks were completed. Reconciliation reported runtime 3/4 with one cancellation, projection 4/4, and OpenSpec 3/3. It found no artifact drift.

## Goal achievement

| Goal | Outcome | Evidence |
| --- | --- | --- |
| KMT-1 opt-in, exact consent, and requester privacy | MET | Final packaged run and control. Both remotes had live media. The requester found settled private text and neither peer could see or retain it. Eight PCM windows were observed and zero reached the worker at or after the recorded withdrawal receipt. |
| KMT-2 timed local search and honest degradation | MET | B5 attempt 2 with matching final application and packaged images. Live PGlite answered the timed phrase search. A real alignment gap was visible and terminating the speech worker preserved ordinary call media. |
| KMT-3 local retention and deletion | MET | B5 attempt 2 with matching final application and packaged images. Retained PGlite answered after reload. Denied save left the prior durable rows identical on reopen. Transcript deletion preserved the separate WebM bytes. |

All three adopted behavior scenarios and controls passed on headed desktop Chromium for the recorded English model, browser, Mac and synthetic input. Independent native review resolved four earlier findings. The exact reviewer model ID was unavailable. OpenSpec strictly verified and archived the one change and synced the accepted capability spec in both local checkouts. KBD is CLOSED. Git publication and production deployment have no authority in this closeout. Other browser configurations and same-profile multi-tab durability were outside the exercised conditions.

## Root causes and corrective actions

- The recalled conferencing lesson on pinned Wasm and browser policy applied to packaging. Matching asset bytes and successful downloads alone did not qualify a model export. Qualify the exact decoder and in-window timing behavior in the contract packet.
- The recalled recording lesson on capturing the actual cutoff applied again. Timestamp the real authority message at the browser boundary and observe PCM separately. Tie fixture hooks to the native events the production transport actually uses.
- A simple UI result concealed the wrong search path. Observe the required collaborator's return and the resulting UI behavior in the same case. When carrying evidence across a repair, compare application, image, browser, fixture and command identities as well as the unchanged test path.
- A denial status alone did not establish persistence behavior. Reopen the retained store and compare an independent fingerprint from before and after a rejected save.

## Contract accuracy

| Metric | Value |
| --- | --- |
| Signed amendments after initial adoption | 5 |
| Blocks caused by the acceptance contract itself | 0. Two later KMT-1 blocks came from test fixture implementation. |
| NOT_EXERCISED scenarios | 3 in the original B4 and 0 at closure |
| Repair attempts used / allowed | 4 / 4 |
| Post-closure escapes observed at reflection | 0 |
| Independent review findings | 3 critical and 1 warning initially, all resolved at closure |

## Next phase seed

Any delivery work should start from the frozen tested candidate and include only the intended source, synced spec, archive and sanitized closeout records. Keep raw traces, fixtures and candidate snapshots local. A distinct successor requires separate signed authority.
