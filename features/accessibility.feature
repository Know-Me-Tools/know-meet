# Contract requiredSafetyChecks ("WCAG 2.2 AA contrast for text in both themes") and plan c13/13.10.
# Oracle: axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) reports zero violations on every
# in-scope state in both themes at all four viewports; every interactive control has an accessible
# name and a visible focus indicator.
# Negative control: a nameless button and low-contrast text injected into a rendered page must be
# reported by the same check.
@a11y @value-critical @ui @web @boundary-only
Feature: Accessibility gate for the web shell
  As a Know Meet user who relies on a keyboard or assistive technology
  I need every in-scope screen to meet WCAG 2.2 AA in both themes
  So that I can use the product as well as anyone else

  Background:
    Given the production web build is served by Vite preview

  Scenario Outline: Every <page> state passes axe in both themes at all four viewports
    When axe analyses every in-scope inventory state of page "<page>" in each theme at each viewport
    Then no WCAG 2.2 A or AA violation is reported
    And the axe results are recorded as evidence

    Examples:
      | page       |
      | frame      |
      | index      |
      | auth       |
      | join       |
      | dashboard  |
      | agents     |
      | recordings |
      | settings   |
      | meet       |

  @smoke
  Scenario: Keyboard focus is visible on the app frame controls
    When the home route is tabbed through from the top in each theme
    Then the skip link is the first focus stop
    And every focused control has an accessible name and a visible focus indicator

  @negative-control
  Scenario: The gate detects injected violations
    Given the home route is rendered in the light theme at 1440
    When a button without an accessible name and text with contrast below 4.5:1 are injected
    Then axe reports a "button-name" violation and a "color-contrast" violation
