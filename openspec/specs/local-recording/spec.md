# local-recording Specification

## Purpose
TBD - created by archiving change wc10-local-recording. Update Purpose after archive.

## Requirements

### Requirement: Recording requires consent and stays on the device

The system SHALL satisfy the following. A recording starts only after every present participant agrees, shows an indicator to everyone, and is stored only in the recorder's browser.

#### Scenario: Case 1

- **WHEN** a participant declines
- **THEN** no recording starts

#### Scenario: Case 2

- **WHEN** storage quota is reached
- **THEN** the recording stops and keeps what was written

#### Scenario: Case 3

- **WHEN** a recording is played
- **THEN** it plays from local storage with no upload

### Requirement: Late joiners opt in before capture

The recorder SHALL admit a late joiner's identity and media only after it receives
affirmative consent for the active recording and current room admission. This
includes the named tile, camera, microphone, shared screen and share audio.
The joiner can participate in the meeting and see its recording indicator while
deciding. Missing or undelivered consent leaves them excluded. A valid decline
ends capture for everyone and preserves material already written.

#### Scenario: RC-1 Late joiner without an answer

- **WHEN** a new participant joins an active recording and starts publishing with an answer separately held, missing, or undelivered
- **THEN** they can participate normally in the meeting and see the recording prompt and indicator
- **AND** independent decoding shows no named tile, camera, mic, screen or share-audio marker from them and shows consenting participants remain present in the recording

#### Scenario: RC-1 Agreement, decline and stale answers

- **WHEN** the recorder receives consent answers during the recording, including separate stale answers from a prior admission and a prior request
- **THEN** matching agreement admits the joiner's independently decoded identity and active media markers and matching decline ends capture while preserving previously written material
- **AND** a stale agreement cannot admit media and a stale decline cannot end the current recording

### Requirement: Accepted stop actions end capture

The recorder SHALL end permission for live capture at local Stop, recorder Leave,
or receipt of a valid decline for the active request. Pending startup SHALL be
invalidated and any late-acquired recording track SHALL be stopped without entering
capture. Encoder flush and file saving may finish using material captured before
the cutoff. Stop while staying in the room SHALL preserve the meeting microphone.

#### Scenario: RC-2 Cancel during startup

- **WHEN** the recorder presses Stop or Leave during pending startup and a held acquisition completes afterward
- **THEN** the encoder cannot start and any recording track that arrives late ends without entering capture

#### Scenario: RC-2 Cut active capture during a slow stop

- **WHEN** the recorder presses Stop or Leave, or receives a valid decline while live recording is active, exercising each action while encoder and writer completion are independently held
- **THEN** the recorder-owned microphone ends before either hold releases and each decoded clip contains detectable pre-cutoff markers and zero post-cutoff live markers
- **AND** the meeting microphone still reaches a remote participant after Stop when the recorder stays

### Requirement: Room presence and recording status are independent of saving

Local recording status and remote stop signaling SHALL follow capture end
independently of file completion. Recorder Leave SHALL permit disconnect and
rejoin during old finalization and keep the sessions isolated. Another participant's
departure removes their contribution while eligible capture continues. Tab exit
ends capture with best-effort recovery of an unfinished file.

#### Scenario: RC-3 Indicators during saving

- **WHEN** active capture ends on Stop or a valid decline and old file completion is held
- **THEN** local and remote clients that showed recording clear that status while saving is still held

#### Scenario: RC-3 Leave and immediate rejoin

- **WHEN** the recorder leaves and rejoins while an old recording is saving
- **THEN** the room disconnects and the new room is usable before the old save completes
- **AND** old completion preserves the new room and recording state and retains the prior file as applicable

#### Scenario: RC-3 Other participant departure

- **WHEN** another participant leaves during recording
- **THEN** their contribution ends and independently marked eligible capture continues

#### Scenario: RC-3 Recorder tab exit

- **WHEN** the recorder closes their tab during recording
- **THEN** recording capture ends and recovery of unfinished output is best effort

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
