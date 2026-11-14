# Contract requiredSafetyChecks ("WCAG 2.2 AA contrast for text in both themes") and plan c13/13.10.
# Oracle: axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) reports zero violations on every
# in-scope state in both themes at all four viewports; every interactive control has an accessible
# name, and keyboard focus is a fill change (DESIGN.md D-6 Flat 2.0, same rule as flat-controls.feature):
# no outline and no box-shadow ring, focused fill >= 3:1 against its unfocused fill and the surface.
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
  Scenario: Keyboard focus is shown by fill on the app frame controls
    When the home route is tabbed through from the top in each theme
    Then the skip link is the first focus stop
    And every focused control has an accessible name
    And focus is shown by a fill change of at least 3:1 with no outline or box-shadow ring

  # RV-21 (discrepancy-log F5): a .table-wrap that overflows horizontally is a scroll region. The
  # prototype's markScrollRegions makes it tabindex=0, role=region and named "<caption>, scrollable".
  # Oracle: computed DOM state and keyboard focus per overflowing region, uncapped tab walk; the focus
  # fill rule is the same 3:1 rule as above. At least one region must overflow across the page's
  # cells, so a page that silently stops scrolling cannot pass by having nothing to check.
  Scenario Outline: Scrollable table regions on <page> are named, focusable and show focus by fill
    When the scrollable table regions of page "<page>" are audited in each theme at each viewport
    Then every overflowing table region is a named, focusable region reachable by Tab
    And table region focus is a fill change with no outline or box-shadow ring
    And the scroll-region results are recorded as evidence

    Examples:
      | page       |
      | index      |
      | dashboard  |
      | agents     |
      | recordings |
      | settings   |

  @negative-control
  Scenario: The gate detects injected violations
    Given the home route is rendered in the light theme at 1440
    When a button without an accessible name and text with contrast below 4.5:1 are injected
    Then axe reports a "button-name" violation and a "color-contrast" violation
