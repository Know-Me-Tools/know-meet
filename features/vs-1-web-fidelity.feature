# Contract VS-1 (adopted-contract.json, digest 768c585b...). Owner tasks: c03/3.2, c10, c11, c13/13.1.
# Oracle: per-route/state screenshots at 375/768/1024/1440 in dark and light are within the frozen
# threshold (tests/fidelity/oracle/thresholds.json) of the prototype baselines (reference revision v2:
# route-inventory.json v2.0.0, 71 states; hamburger states frame.nav-collapsed/frame.nav-open retired,
# adaptive nav states frame.nav-bar/rail/inline exist only in their width class, other cells not applicable).
# Negative control: the same comparison against a build with pre-reconciliation tokens must FAIL.
# Runs once, at the c13 boundary only (VLBV). Status until then: NOT_EXERCISED.
@VS-1 @value-critical @ui @web @boundary-only
Feature: VS-1 Web shell matches the prototype on every in-scope route and state in both themes
  As a Know Meet user on the web
  I need every screen to look exactly like the approved design in dark and light
  So that the product I use is the product that was designed

  Background:
    Given the frozen fidelity oracle "tests/fidelity/oracle/thresholds.json"
    And the prototype baselines recorded in "tests/fidelity/baselines/manifest.json"
    And the production web build is served by Vite preview

  @smoke
  Scenario: The baseline set covers every in-scope state of the c02 inventory
    Then every in-scope inventory state has a baseline for each theme and viewport or a recorded not-applicable reason
    And every baseline image matches the sha256 recorded in the manifest
    And the states listed in this feature are exactly the in-scope inventory states

  Scenario Outline: State <state> matches its prototype baseline in both themes at all four viewports
    When the web app renders state "<state>" in each theme at each viewport
    Then every capture of "<state>" is within its frozen threshold of the prototype baseline

    Examples:
      | state                                                |
      | index.default                                        |
      | auth.sign-in                                         |
      | auth.sign-up                                         |
      | auth.check-email                                     |
      | auth.sign-in-error                                   |
      | auth.magic-link-sent                                 |
      | join.invite                                          |
      | join.waiting                                         |
      | join.expired                                         |
      | join.wrong-code                                      |
      | meet.room                                            |
      | meet.room-guest                                      |
      | dashboard.upcoming                                   |
      | dashboard.schedule                                   |
      | dashboard.meeting.partner-onboarding                 |
      | dashboard.meeting.cohort-kickoff                     |
      | dashboard.meeting.product-sync                       |
      | dashboard.meeting.pricing-review                     |
      | dashboard.invites                                    |
      | dashboard.empty                                      |
      | agents.registry                                      |
      | agents.register.1                                    |
      | agents.register.2                                    |
      | agents.register.3                                    |
      | agents.register.4                                    |
      | agents.register-error                                |
      | agents.detail.scribe                                 |
      | agents.detail.researcher                             |
      | agents.detail.facilitator                            |
      | agents.detail.translator                             |
      | agents.concierge                                     |
      | agents.dots                                          |
      | agents.dot.iris                                      |
      | recordings.library                                   |
      | recordings.detail.partner-onboarding-1014            |
      | recordings.detail.partner-onboarding-1014.transcript |
      | recordings.detail.partner-onboarding-1014.summary    |
      | recordings.detail.partner-onboarding-1014.delivery   |
      | recordings.detail.partner-onboarding-1014.storage    |
      | recordings.detail.design-crit-1009                   |
      | recordings.detail.vendor-call-1002                   |
      | recordings.processing.partner-onboarding-1014        |
      | recordings.empty                                     |
      | settings.account                                     |
      | settings.livekit                                     |
      | settings.telnyx-sms                                  |
      | settings.telnyx-voice                                |
      | settings.calendars                                   |
      | settings.calendar-connect.google                     |
      | settings.calendar-connect.outlook                    |
      | settings.calendar-connect.caldav                     |
      | settings.storage                                     |
      | settings.storage-s3                                  |
      | settings.storage-ipfs                                |
      | settings.storage-test-failed                         |
      | settings.recording                                   |
      | settings.delivery                                    |
      | settings.templates                                   |
      | settings.notifications                               |
      | dashboard.gate-signed-out                            |
      | agents.gate-signed-out                               |
      | recordings.gate-signed-out                           |
      | settings.gate-signed-out                             |
      | frame.appbar-signed-out                              |
      | frame.appbar-signed-in                               |
      | frame.account-menu-open                              |
      | frame.nav-bar                                        |
      | frame.nav-rail                                       |
      | frame.nav-inline                                     |
      | frame.skip-link-focused                              |
      | frame.theme-toggle                                   |

  @negative-control
  Scenario: A build with the pre-reconciliation tokens is rejected
    Given a scratch web build whose tokens.json is the pre-reconciliation version from commit "956d9a2"
    When that build renders states "index.default", "dashboard.upcoming" and "settings.account" in each theme at each viewport
    Then at least one capture exceeds its frozen threshold

  @negative-control
  Scenario: The comparison is sensitive to a theme swap
    When the dark baseline of "index.default" at 1440 is compared with its light baseline under the frozen threshold
    Then the comparison fails
