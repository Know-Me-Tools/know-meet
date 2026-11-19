# Contract WC-7. Owner tasks: wc01-conferencing-scenarios/1.1, wc01-conferencing-scenarios/1.2,
# wc01-conferencing-scenarios/1.6, wc09-local-history/9.1, wc09-local-history/9.2,
# wc09-local-history/9.3, wc09-local-history/9.4, wc11-conferencing-boundary/11.2,
# wc11-conferencing-boundary/11.5.
# Oracle: after a meeting with two chat messages and a reload, the history screen lists the meeting
# with its date and both messages; the network log for the whole run contains no request body or URL
# containing either message text or the history ids; deleting the entry removes it after another
# reload.
# On-device privacy control (task 1.2): the leak detector is itself challenged in the same file. A
# deliberate upload of a unique text to a stubbed off-origin host must be flagged; if the detector
# cannot see that, the privacy claim is not credited. Scope: HTTP requests, signalling-socket frames
# and page-level egress; chat between participants travels on the LiveKit data channel, which
# Playwright's network events do not show.
# Negative control: a fresh browser profile shows an empty history.
# Route and navigation (operator, batch 2): history is the hosted route /history (detail at
# /history#meeting:<id>), reached through the shared adaptive navigation (Home, History,
# Recordings: bottom bar on phones, rail on medium widths, full navigation on desktop), which is
# never shown on /meet: after leaving, A goes home from the meeting-ended view first. The
# device-only notice is on the list; delete is in the detail.
# Executed by tests/release/wc-7-local-history.spec.ts, packaged then hosted; Chromium, Firefox and
# WebKit (@cross-engine, devices off).
@WC-7 @value-critical @release @smoke @boundary-only @packaged @hosted @cross-engine @privacy
Feature: WC-7 History survives a reload and never leaves the device
  As a participant
  I need my past meetings and their chat on this device after a reload
  And to know none of it was sent anywhere

  Scenario: The meeting and both messages survive a reload, nothing carrying them is sent, delete removes it
    Given guest A uses a persistent browser profile and guest B a separate browser
    And A and B are in the same meeting and each sends one message to "Everyone"
    When A leaves and opens History from the navigation
    Then the history lists one meeting with a local id that is not the room code
    When A reloads the history screen
    Then the history still lists the meeting with the same id and a date from the last minutes
    And the history list says the chat is kept on this device only
    And the opened entry shows both messages
    And no request URL, header, body, signalling frame or page-level upload of the whole run contains either message text or the history id
    And no CSP violation was reported
    When A deletes the entry from its detail, returns to History through the navigation and reloads
    Then the history is empty

  @negative-control
  Scenario: A fresh profile shows an empty history
    Given a new browser profile
    When the guest opens History from the navigation
    Then no entry is listed

  @negative-control
  Scenario: The leak detector flags a deliberate upload
    Given a guest page with the network recorder attached
    When the page posts a unique text to a stubbed off-origin host
    Then the detector reports a leak of that text
