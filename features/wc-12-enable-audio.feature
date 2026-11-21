# Contract WC-12. Owner tasks: wc01-conferencing-scenarios/1.1, wc02-conferencing-ports/2.2,
# wc03-realtime-adapter-features/3.4, wc04-share-and-chat-ui/4.3, wc11-conferencing-boundary/11.2,
# wc11-conferencing-boundary/11.5.
# Oracle: with autoplay blocked, B shows "Enable audio"; one click makes canPlaybackAudio true and
# the prompt disappears. Independent witness: B's remote audio element is not playing before the
# click and is playing after it.
# Precondition (BLOCKED if it cannot be established): B has had no user activation, so B joins with
# synthetic clicks; a trusted click on "Join meeting" would unlock playback by itself.
# Negative control: with autoplay allowed, no prompt is shown.
# Fixtures: two Chromium launches with --autoplay-policy=document-user-activation-required and
# --autoplay-policy=no-user-gesture-required.
# Executed by tests/release/wc-12-enable-audio.spec.ts, packaged then hosted.
@WC-12 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WC-12 Enable audio appears when autoplay is blocked and starts audio
  As a participant whose browser blocks audio until I interact
  I need a visible way to start the meeting's audio
  So that I am not silently deaf

  Scenario: Autoplay blocked, one click on Enable audio starts the audio
    Given the browser blocks autoplay and guest B has had no user activation
    And guest A is in the meeting publishing audio
    When guest B joins the meeting
    Then B shows a button named "Enable audio"
    And B's meeting reports that audio playback is not allowed
    And B's remote audio is not playing
    When B clicks "Enable audio" once
    Then the prompt disappears
    And B's meeting reports that audio playback is allowed
    And B's remote audio is playing

  @negative-control
  Scenario: Autoplay allowed, no prompt is shown
    Given the browser allows autoplay
    When guest B joins a meeting where A publishes audio
    Then B's remote audio plays without a click
    And no "Enable audio" button is shown for five seconds
