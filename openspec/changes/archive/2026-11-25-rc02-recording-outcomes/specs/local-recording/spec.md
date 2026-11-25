## ADDED Requirements

### Requirement: The library reports usable and incomplete recordings honestly

Known failures SHALL remain visible through Stop and while saving. Unusable
output SHALL show failure and have no playable entry, even without an encoder
or writer error. Playable partials SHALL be Incomplete. Complete output,
including short clips, SHALL contain usable media for the expected tracks
through the captured interval. Still images and silence can be valid content.
Storage quota SHALL stop capture and retain written bytes.

#### Scenario: RC-4 Short success, empty output and partial recovery

- **WHEN** a recorder opens results from a deliberately short clip that meets the per-track Complete rule, an empty or header-only attempt without a reported encoder error, an interrupted attempt with playable output, and a clip with intact audio over frozen video
- **THEN** the short Complete clip succeeds, the empty or header-only attempt shows failure without a playable entry, and the playable partial appears as Incomplete
- **AND** intact audio over frozen video cannot satisfy Complete when independent fixture markers show the expected video advanced during capture

#### Scenario: RC-4 Failure and Stop race during saving

- **WHEN** a recording stalls after valid media, or storage fails, with writer completion held and Stop exercised on each side of failure detection
- **THEN** the failure stays visible independently of saving and bytes already written are retained under quota exhaustion

### Requirement: Supported recording stays on the device and reports unavailable starts

The supported Chromium workflow SHALL require affirmative initial consent, keep
recording bytes on the recorder's device, and play usable output from local
storage without an upload. A known unavailable recording capability SHALL be
visible before capture. A runtime start failure SHALL end the attempt promptly
and report failure without a false playable result.

#### Scenario: RC-5 Consent, local save and playback

- **WHEN** a guest records a consented meeting and plays the saved clip in the local library, exercising the consented positive counterpart after a separate declined request
- **THEN** the expected marked media plays from local storage and no recording data uploads
- **AND** a separate initial-decline attempt starts no recording

#### Scenario: RC-5 Existing late-answer regressions under affirmative admission

- **WHEN** a late joiner answers after being initially excluded from a running recording
- **THEN** a current agreement admits the joiner while the original recording continues and a current decline in a separate run ends that recording

#### Scenario: RC-5 Known unavailable capability

- **WHEN** the app can establish before capture that recording is unavailable
- **THEN** it shows unavailable, capture stays inactive, and no playable recording appears

#### Scenario: RC-5 Runtime start failure

- **WHEN** a start attempt reaches MediaRecorder and fails
- **THEN** it reports the failure, clears recording status, ends capture, and shows no false playable recording
