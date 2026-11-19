# Contract WC-9. Owner tasks: wc01-conferencing-scenarios/1.1, wc01-conferencing-scenarios/1.2,
# wc02-conferencing-ports/2.4, wc10-local-recording/10.3, wc10-local-recording/10.4,
# wc11-conferencing-boundary/11.2.
# Oracle: A asks; B declines; A is told the request was declined; no indicator appears for anyone and
# A's library stays empty after 20 s. A late joiner C declining during a running recording stops it
# for everyone (decision D2) and what was written is kept.
# Negative control: WC-8's behaviour is the positive counterpart in the same run (A asks again, B
# agrees, a recording starts), so the 20-second absence cannot be a fixture that cannot record. A
# late joiner who agrees leaves the recording running, so "a join stops it" cannot pass the late
# decline scenario.
# Witnesses for "no recording": indicator, MediaRecorder starts (page tap), new files in the origin
# private file system. The library is read after leaving the room.
# Executed by tests/release/wc-9-consent-declined.spec.ts (Chromium), packaged.
@WC-9 @value-critical @release @smoke @boundary-only @packaged @consent
Feature: WC-9 A declined consent means no recording
  As a participant who does not want to be recorded
  I need my refusal to stop the recording, now and when I join late
  So that nothing records me against my answer

  Scenario: B declines, nothing records for twenty seconds, a consented request then does
    Given guests A and B are in the same meeting
    When A asks to record and B declines
    Then A is told the request was declined
    And for twenty seconds no indicator shows, no MediaRecorder starts and no new file is written on either device
    When A asks again and B agrees
    Then both show the indicator and a recording starts
    When A stops and leaves
    Then the library holds exactly the one consented recording

  @late-joiner
  Scenario: A late joiner who declines stops the running recording for everyone
    Given A records with B's consent
    When guest C joins the running meeting
    Then C sees the recording indicator and a consent prompt
    When C declines
    Then no indicator shows for A, B or C
    And A's MediaRecorder stopped and no new recorder starts
    And after A leaves the library holds one recording with bytes

  @negative-control @late-joiner
  Scenario: A late joiner who agrees leaves the recording running
    Given A records with B's consent
    When guest C joins and agrees
    Then A, B and C show the indicator for ten seconds and A's MediaRecorder has not stopped
