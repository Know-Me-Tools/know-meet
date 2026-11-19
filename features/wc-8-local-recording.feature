# Contract WC-8. Owner tasks: wc01-conferencing-scenarios/1.1, wc01-conferencing-scenarios/1.2,
# wc01-conferencing-scenarios/1.6, wc02-conferencing-ports/2.4, wc03-realtime-adapter-features/3.3,
# wc10-local-recording/10.1 to 10.5, wc11-conferencing-boundary/11.2, wc11-conferencing-boundary/11.5.
# Oracle: A asks to record; B is prompted; after B agrees, both show the recording indicator; after
# 20 s A stops; A's library lists one recording with duration within 20 +/- 3 s and size greater
# than zero; it starts playing (currentTime advances); no network request carries recording bytes.
# Independent witnesses: MediaRecorder starts and stops counted by a page tap, and files listed from
# the browser's origin private file system, so the oracle does not rest on the app's own state.
# Negative control: before B answers, no recording file exists and no indicator shows (observed for
# five seconds on both pages: indicator, MediaRecorder starts, new files).
# On-device privacy control (task 1.2): the recording-egress detector is challenged by a deliberate
# WebM-signature upload to a stubbed host, which it must flag.
# Route and navigation (operator, batch 2): the library is the hosted route /recordings (detail,
# with the player, at /recordings#recording:<id>), reached through the shared adaptive navigation,
# which is never shown on /meet: after leaving, A goes home from the meeting-ended view first.
# Executed by tests/release/wc-8-local-recording.spec.ts (Chromium), packaged then hosted.
@WC-8 @value-critical @release @smoke @boundary-only @packaged @hosted @privacy @consent
Feature: WC-8 A consented recording runs, saves locally and plays back
  As a participant who wants a record of the meeting
  I need the others to agree first, and the recording to stay on my device
  So that nobody is recorded without consent and nothing is uploaded

  Scenario: Consent first, indicator for everyone, saved locally, playable, never uploaded
    Given guests A and B are in the same meeting
    When A asks to record
    Then B is prompted
    And for five seconds nothing records: no indicator, no MediaRecorder start, no new file on either device
    When B agrees
    Then both A and B show the recording indicator
    And the indicator stays on both for twenty seconds
    When A stops recording
    Then B's indicator goes
    And A's MediaRecorder started once and stopped and produced data
    And exactly one new file with bytes exists in A's browser storage
    When A leaves and opens Recordings from the navigation
    Then the library lists one recording with a duration within 20 plus or minus 3 seconds and a size greater than zero
    When A opens it and plays it
    Then the player reads a blob URL and its current time advances
    And no request, frame or page-level upload from A or B carries recording bytes
    And no CSP violation was reported

  @negative-control
  Scenario: The recording-egress detector flags a deliberate upload
    Given a guest page with the network recorder attached
    When the page posts a WebM-signed video blob to a stubbed off-origin host
    Then the detector reports recording egress
