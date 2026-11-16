# Contract WR-8. Owner tasks: wr01-release-scenarios/1.3, wr05-guest-meeting-flow/5.1,
# wr05-guest-meeting-flow/5.2, wr05-guest-meeting-flow/5.3, wr05-guest-meeting-flow/5.4,
# wr09-release-boundary/9.3.
# Oracle: home, join lobby and meeting room in dark and light at 375, 768, 1024 and 1440 have zero axe
# violations at WCAG 2.2 AA, every control is reachable and operable by keyboard with focus shown by
# fill, motion stops under prefers-reduced-motion, and the independent UI review records no CRITICAL
# finding against DESIGN.md and the prototype room.
# Negative control: a scratch build with one control's fill contrast lowered below 3:1 must make the
# axe run FAIL.
# Note: axe-core does not test non-text contrast (SC 1.4.11), so the automated run pairs axe with a
# control fill-contrast probe (>= 3:1 against the adjacent surface, the Flat 2.0 rule). The negative
# control lowers one control's fill in the rendered page; design-lead (task 1.3) owns the final form.
# Automated part executed by tests/release/accessibility.spec.ts in the packaged project. The UI
# review is a separate, independent step in wr09 task 9.3.
@WR-8 @value-critical @a11y @release @boundary-only @packaged
Feature: WR-8 The three shipped screens are accessible and match the Know Meet design
  As a visitor who relies on a keyboard, a screen reader or reduced motion
  I need the home, join lobby and meeting room screens to meet WCAG 2.2 AA in both themes
  So that I can hold a meeting as well as anyone else

  Scenario Outline: The <screen> screen passes axe and the fill-contrast probe in both themes at all four widths
    When the <screen> screen is rendered in each theme at 375, 768, 1024 and 1440
    Then axe reports no WCAG 2.2 A or AA violation in any cell
    And every filled control contrasts at least 3:1 with its adjacent surface in every cell
    And the axe results and a screenshot of every cell are recorded as evidence

    Examples:
      | screen       |
      | home         |
      | join lobby   |
      | meeting room |

  Scenario: The guest flow is reachable and operable by keyboard with focus shown by fill
    When a guest starts a meeting, joins from the lobby, mutes and unmutes the microphone and leaves using only the keyboard
    Then every step completes
    And every focus stop has an accessible name
    And focus is shown by a fill change of at least 3:1 with no outline or box-shadow ring

  Scenario: Motion stops under prefers-reduced-motion
    When the three screens are rendered with prefers-reduced-motion set to reduce
    Then no running animation or transition is longer than 1 ms on any of them

  @independent-review
  Scenario: The independent UI review records no CRITICAL finding
    Given screenshots of the three screens in both themes at all four widths
    When the independent UI reviewer compares them with DESIGN.md and the prototype room
    Then the review file records no CRITICAL finding

  @negative-control
  Scenario: A control fill lowered below 3:1 fails the run
    Given the home screen is rendered in the dark theme at 1440
    When the start-meeting control's fill is set to the colour of its adjacent surface
    Then the accessibility audit of that cell fails
