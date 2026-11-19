# Contract WC-1. Owner tasks: wc01-conferencing-scenarios/1.1, wc02-conferencing-ports/2.2,
# wc03-realtime-adapter-features/3.2, wc04-share-and-chat-ui/4.1, wc11-conferencing-boundary/11.2,
# wc11-conferencing-boundary/11.5.
# Oracle: B reports a subscribed remote track with source ScreenShare whose rendered dimensions are
# greater than zero; after A stops, B reports no ScreenShare track within 10 s and A's share control
# returns to off.
# Negative control: without starting a share, B reports no ScreenShare track.
# Executed by tests/release/wc-1-screen-share.spec.ts (Playwright, Chromium with fake media and an
# auto-selected screen capture source), packaged then hosted.
@WC-1 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WC-1 Screen share reaches the other participant and stops cleanly
  As a participant in a meeting
  I need to share my screen and stop sharing
  So that the others see what I show and nothing after I stop

  Background:
    Given the token service and the web image are reachable at the release base URL
    And guest A and guest B are in the same meeting with their cameras and microphones on

  Scenario: B sees A's screen, and it is gone within 10 seconds of A stopping
    Given A's share control is off and B reports no screen share
    When A starts sharing the screen
    Then A's share control is on
    And B reports a subscribed ScreenShare track rendered larger than zero
    When A stops sharing
    Then A's share control returns to off
    And B reports no ScreenShare track within 10 seconds
    And B still receives A's camera
    And screenshots of both contexts, the trace and the observations are recorded

  @negative-control
  Scenario: Without starting a share, B reports no ScreenShare track
    Given B has a subscribed camera track from A
    When five seconds pass and A does not start sharing
    Then B reports no screen share tile throughout
    And A's share control stays off
