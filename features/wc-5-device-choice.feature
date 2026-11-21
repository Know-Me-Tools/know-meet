# Contract WC-5. Owner tasks: wc01-conferencing-scenarios/1.1, wc02-conferencing-ports/2.2,
# wc02-conferencing-ports/2.3, wc03-realtime-adapter-features/3.4, wc05-device-settings/5.1,
# wc05-device-settings/5.2, wc11-conferencing-boundary/11.2, wc11-conferencing-boundary/11.5.
# Oracle: the lobby lists the devices and shows a moving level and a preview; the device chosen in
# the lobby is the active device after join; switching in the room changes the active device id and
# B keeps receiving. The active device is the deviceId of the newest live getUserMedia track, read by
# a page tap, not from the select the app renders.
# Negative control: without a choice, the default device is active.
# Fixtures: Chromium fake devices, three per kind (device-count=3); ids recorded per run.
# The lobby offers microphone and camera only (speaker choice is room-only, WC-6); the room selects
# are in the room Settings sheet, "Audio and video" pane. The lobby meter is a role=meter whose
# aria-valuenow runs 0 to 100.
# Executed by tests/release/wc-5-device-choice.spec.ts (Chromium), packaged then hosted.
@WC-5 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WC-5 Chosen microphone and camera are the ones used
  As a participant with more than one microphone or camera
  I need to choose which ones the meeting uses, before and during the meeting
  So that the meeting uses the devices I picked

  Scenario: Lobby choices are active after joining, and switching in the room switches the device
    Given the browser offers three microphones and three cameras
    When guest A opens the lobby for a new meeting
    Then the lobby preview renders a picture
    And the lobby level meter takes more than one value and rises above silence
    When A chooses a microphone and a camera that are not the defaults and joins with guest B
    Then the active microphone is the chosen microphone
    And the active camera is the chosen camera
    When A opens the room settings and switches the microphone
    Then the active microphone is the newly chosen one
    And B still receives A's audio and video

  @negative-control
  Scenario: Without a choice, the default device is active
    When guest A joins without choosing a microphone or a camera
    Then the active microphone belongs to the browser's default microphone
    And the active camera belongs to the browser's default camera
