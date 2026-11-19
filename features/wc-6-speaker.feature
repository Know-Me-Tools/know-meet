# Contract WC-6. Owner tasks: wc01-conferencing-scenarios/1.1, wc03-realtime-adapter-features/3.4,
# wc05-device-settings/5.2, wc11-conferencing-boundary/11.2.
# Oracle: where setSinkId exists, choosing an output changes the active audiooutput device (the
# sinkId of the remote audio element); where it is absent (forced by an init script removing it),
# the control is not offered and an explanation is visible and announced.
# Negative control: with setSinkId present, no explanation is shown.
# Speaker choice is room-only (approved shape, device settings): the select and the explanation are
# in the room Settings sheet; the lobby offers microphone and camera only.
# Executed by tests/release/wc-6-speaker.spec.ts, packaged. Chromium for selection (three fake
# devices); Chromium, Firefox and WebKit (@cross-engine) for the explanation path.
@WC-6 @value-critical @release @boundary-only @packaged @cross-engine
Feature: WC-6 Speaker choice works where supported and is explained where not
  As a participant who wants to hear the meeting on a particular speaker
  I need to choose the output where the browser allows it
  And to be told why not where it does not

  Scenario: Where setSinkId exists, the chosen output carries the meeting's audio
    Given the browser supports setSinkId and offers more than one audio output
    When guest B chooses an output other than the current one in the room settings
    Then the remote audio element plays through the chosen output
    And no unsupported-speaker explanation is shown anywhere

  Scenario: Where setSinkId is absent, the control is not offered and the reason is announced
    Given an init script removes setSinkId before the page loads
    When a guest joins the meeting and opens the room settings
    Then no speaker select is offered in the room settings
    And an explanation is visible under the Speaker heading
    And the explanation has a status or alert role or a live region

  @negative-control
  Scenario: With setSinkId present, no explanation is shown
    Given the browser supports setSinkId
    When a guest joins the meeting and opens the room settings
    Then the speaker select is visible and the explanation is absent
