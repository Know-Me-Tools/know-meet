# Design

## Scope

Own encoder and writer outcome arbitration, local recording index disposition,
room failure notices and library rendering, and the consolidated packaged suite.
The cutoff and session path from the first change provides the authoritative
capture end. This change owns terminal result selection and how it is presented.

## Decisions

- Preserve the first known failure across manual Stop and asynchronous cleanup.
  Determine whether intended media exists before classifying a clip as Complete.
  A useful partial stays accessible. Unusable bytes kept for quota retention
  cannot appear as a playable success.
- Reuse cand-001 and cand-003. Browser recording and local storage remain the
  production path. Check playback against independent content and time markers.
  Native playback can report advancement with frozen video, so require advancing
  per-track content. Cand-004 remains a research reference. This phase adds no
  runtime dependency.
- Keep the predecessor distinction between static gate results and behavioral
  evidence. Run the frozen packaged packet once after the complete phase is
  implemented and separately authorized. Preserve WC-8 and all three WC-9
  consent outcomes with the new opt-in precondition.

## Acceptance and implementation order

`2.1` owns RC-4 and `2.2` owns RC-5. `2.3` owns fixture implementation and
boundary evidence for both changes. Run the actual room and Recordings views
against the packaged stack. Faults and the capability hold are fixtures and
cannot establish failure prevalence or compatibility in another browser.
See the frozen contract and boundary recipe in the phase directory.
