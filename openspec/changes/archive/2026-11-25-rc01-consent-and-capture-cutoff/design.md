# Design

## Scope

Domain owns consent eligibility and termination rules. Application owns request
and admission identity plus cutoff and session transitions. The browser adapter
owns recording media inputs and the composition root owns Leave and rejoin.
Keep existing interfaces where they carry these invariants. Mark broader wire,
platform or dependency changes for owner review.

## Decisions

- Compute eligibility from affirmative consent for the current request and
  admission before binding any recording source or tile. Bind camera, mic,
  share video and share audio under the same rule. A reused participant identity
  cannot inherit an earlier admission's answer.
- Separate input detach and cancellation from file completion. Guard late
  acquisition and old finalizer callbacks by their owning session. Keep room
  audio and recorder-only audio ownership distinct.
- Reuse cand-001 and cand-002. MediaRecorder changes recording state separately
  from delivering final data. The installed LiveKit client supplies room/track
  operations. Keep consent and cutoff in Know Meet.
- Apply the predecessor lesson that a negative privacy check needs a positive
  trigger. Require pre-cutoff samples for each active case and hold completion
  independently so a fast stop cannot conceal queued capture.

## Acceptance and implementation order

`1.1` owns RC-1, `1.2` owns RC-2, and `1.3` owns RC-3. Exercise the shipped
Room controls with actual LiveKit transport, browser compositor and storage.
Use the frozen calibration and boundary recipe in the phase directory.
Transport delay and held callbacks prove the specified ordering only. Keep all
executable scenarios and verification at the parent phase boundary.
