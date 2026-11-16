# Contract WR-1. Owner tasks: wr01-release-scenarios/1.1, wr02-meeting-domain-and-ports/2.1,
# wr02-meeting-domain-and-ports/2.2, wr03-token-service/3.1, wr03-token-service/3.2,
# wr04-realtime-adapter/4.1, wr04-realtime-adapter/4.2, wr05-guest-meeting-flow/5.1,
# wr05-guest-meeting-flow/5.2, wr05-guest-meeting-flow/5.3, wr09-release-boundary/9.2,
# wr09-release-boundary/9.6.
# Oracle: context A starts a meeting and receives a room code. Context B joins with that code. Each
# context reports one remote participant with a subscribed video track whose rendered dimensions are
# greater than zero and a subscribed audio track. Muting A's microphone is observed as muted in B.
# After A leaves, B reports zero remote participants.
# Negative control: context B joining with a well-formed code that was never issued must be refused
# with the user-facing "meeting not found" state and must not connect.
# Executed by tests/release/meeting.spec.ts (Playwright, Chromium with fake media devices), first in
# the packaged project against the built images, then in the hosted project at the public URL.
@WR-1 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WR-1 Two guests hold a real meeting at the public URL
  As a visitor with a browser and nothing else
  I need to start a meeting, share its code and meet a second visitor
  So that we can see and hear each other without an account

  Background:
    Given the token service and the static web image are reachable at the release base URL
    And each browser context has a fake camera and microphone with media permissions granted

  Scenario: Two guests see and hear each other, mute, and leave
    Given guest A opens the home screen in browser context A
    When guest A starts a meeting and enters a display name in the join lobby
    Then guest A is in the meeting room and the room code the service issued is shown
    When guest B opens the home screen in browser context B
    And guest B enters that room code, then a display name in the join lobby, and joins
    Then context A shows one remote participant with a subscribed video track rendered larger than zero
    And context A shows a subscribed live audio track for that participant
    And context B shows one remote participant with a subscribed video track rendered larger than zero
    And context B shows a subscribed live audio track for that participant
    When guest A mutes the microphone
    Then context B shows guest A as muted
    When guest A unmutes the microphone
    Then context B no longer shows guest A as muted
    When guest A leaves the meeting
    Then context B shows zero remote participants
    And the room code, screenshots of both contexts, the trace and the image digests are recorded

  Scenario: A guest who presses browser Back is no longer shown in the meeting
    Given guest A has started a meeting and guest B has joined it with the issued room code
    And context B shows one remote participant with a subscribed video track
    When guest A presses the browser Back button
    Then context B shows zero remote participants

  @negative-control
  Scenario: A well-formed code that was never issued is refused
    Given a well-formed room code that the service never issued
    When guest B opens the home screen, enters that code, then a display name in the join lobby, and joins
    Then the token endpoint answers 404 for that code
    And context B shows the meeting-not-found state
    And context B opens no connection to the LiveKit signalling server
