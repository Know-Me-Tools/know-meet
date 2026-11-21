# Contract WC-2. Owner tasks: wc01-conferencing-scenarios/1.1, wc02-conferencing-ports/2.1,
# wc02-conferencing-ports/2.2, wc03-realtime-adapter-features/3.3, wc04-share-and-chat-ui/4.2,
# wc11-conferencing-boundary/11.2, wc11-conferencing-boundary/11.5.
# Oracle: with three participants, a message sent by A appears in B's and C's chat panels with text
# equal to the sent text and the audience label "Everyone".
# Negative control: a message never sent does not appear anywhere (the run also sends one real
# message, so the listeners are known to be live).
# Executed by tests/release/wc-2-chat-everyone.spec.ts, packaged then hosted; Chromium, Firefox and
# WebKit (@cross-engine; Firefox and WebKit join with devices off).
@WC-2 @value-critical @release @smoke @boundary-only @packaged @hosted @cross-engine
Feature: WC-2 A message to everyone reaches every participant
  As a participant in a meeting
  I need to send a chat message to everyone
  So that all of them read it, labelled as sent to everyone

  Background:
    Given guests A, B and C are in the same meeting

  Scenario: A's message to Everyone appears for B and C
    When A sends a message with unique text to "Everyone"
    Then B's chat panel shows one message with exactly that text labelled "Everyone"
    And C's chat panel shows one message with exactly that text labelled "Everyone"
    And A's own panel shows it labelled "Everyone"
    And screenshots of all three panels are recorded

  @negative-control
  Scenario: A message that was never sent does not appear anywhere
    Given A sends one real message to "Everyone" and B and C show it
    When ten seconds pass
    Then no panel shows a message with the never-sent text
    And no browser's data channel delivered the never-sent text
