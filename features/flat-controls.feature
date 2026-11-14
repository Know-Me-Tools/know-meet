# Operator decision D-6 (2026-11-11, DESIGN.md "Flat 2.0 controls"): no borders, outlines or rings
# anywhere, including focus; boundaries and focus are fills with >= 3:1 contrast (WCAG 2.2 AA).
# The v2 prototype renders this rule (discrepancy-log.md F, RV-02); this is a computed-style check, not a pixel cell.
# Oracle: getComputedStyle of every visible interactive control in every in-scope state, both themes,
# four viewports: border widths and outline width are 0 at rest and under :focus-visible (no zero-blur
# spread ring either), and the focused control's fill differs from its unfocused fill and from the surface
# by >= 3:1 (tests/fidelity/src/a11y/flat-controls-probe.ts).
# Negative control: injected 1px borders and a 2px focus outline must be reported by the same audit.
# Fills are alpha-composited over their backdrop before contrast is computed, and each control's unfocused
# fill is read before focusing (the state's initial focus blurred first) and again after focus leaves it;
# the lower contrast counts. Negative controls: a translucent focus fill that composites to < 3:1, and a
# skip link that is focused when the state renders and whose focus fill equals its rest fill, must both be
# reported (probe corrections requested in discrepancy-log.md F5, RV-24/RV-26/RV-27).
# accessibility.feature's focus scenario uses the same fill rule (reference revision v2, operator approval 2026-11-11).
@a11y @flat2 @value-critical @ui @web @boundary-only
Feature: Flat 2.0 controls carry no strokes and focus is a fill change
  As a Know Meet user
  I need controls whose boundaries and focus are shown by fill, never by lines
  So that the product keeps its flat look and still meets WCAG 2.2 AA

  Background:
    Given the production web build is served by Vite preview

  Scenario Outline: Every <page> control is stroke-free and focus is a fill change
    When every interactive control of page "<page>" is audited in each theme at each viewport
    Then no control has a non-zero border or outline width
    And keyboard focus changes the control fill by at least 3:1 against its unfocused fill and the surface
    And the flat-control results are recorded as evidence

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

  @negative-control
  Scenario: The audit detects injected strokes
    Given the home route is rendered in the dark theme at 1440 for the flat-control audit
    When a 1px border on buttons and a 2px outline on focused controls are injected
    Then the flat-control audit reports a border and an outline

  @negative-control
  Scenario: The audit composites a translucent focus fill before measuring it
    Given the home route is rendered in the dark theme at 1440 for the flat-control audit
    When every focused control takes a white fill at 6% opacity
    Then the flat-control audit reports every focus stop below 3:1

  @negative-control
  Scenario: The audit reads a focused-at-render skip link's true rest fill
    Given the home route is rendered in the dark theme at 1440 for the flat-control audit
    When the skip link is focused and its focus fill is pinned to its rest fill
    Then the flat-control audit reports the skip link fill as unchanged
