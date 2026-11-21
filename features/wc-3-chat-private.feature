# Contract WC-3. Owner tasks: wc01-conferencing-scenarios/1.1, wc02-conferencing-ports/2.1,
# wc03-realtime-adapter-features/3.3, wc04-share-and-chat-ui/4.2, wc11-conferencing-boundary/11.2,
# wc11-conferencing-boundary/11.5.
# Oracle: A sends privately to B. B shows the text labelled private to B; A shows it labelled private
# to B; C's panel and C's received text-stream log never contain it after 10 s.
# The received log is the browser's own: every message C's RTCDataChannels delivered, recorded by a
# page tap installed before application code, so a client that received the text and merely hid it
# still fails.
# Negative control: the same run sends one Everyone message, which C does receive, proving C's
# listener was live (panel and data channel).
# Executed by tests/release/wc-3-chat-private.spec.ts, packaged then hosted; Chromium, Firefox and
# WebKit (@cross-engine).
@WC-3 @value-critical @release @smoke @boundary-only @packaged @hosted @cross-engine
Feature: WC-3 A private message reaches only its recipient
  As a participant in a meeting
  I need to send a message to one person only
  So that nobody else receives it

  Background:
    Given guests A, B and C are in the same meeting

  Scenario: A to B privately, C never receives it
    When A sends a message with unique text privately to "Guest B"
    Then B's panel shows it labelled private to B
    And A's panel shows it labelled private to B
    When A then sends a control message to "Everyone"
    Then C's panel shows the control message
    And C's data channel delivered the control message
    And for ten seconds C's panel never shows the private text
    And for ten seconds no message C's data channels received contains the private text
    And C's received-stream log and screenshots of all three panels are recorded
