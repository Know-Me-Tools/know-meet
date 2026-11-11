# Plan c03/3.3 and c09 (motion respects prefers-reduced-motion); constraint accessibility-basics.
# Oracle: representative transitions use the tokenized durations and easing from
# docs/design/tokens.json (body theme transition: dur + ease-standard; mobile nav open: dur +
# ease-out); under prefers-reduced-motion: reduce, durations drop to dur-reduced-motion and the
# dot (orb) animations stop.
# Resize transition (DESIGN.md "Resize motion", operator decision D-8): crossing 1024 or 600 morphs the nav over
# dur-nav-morph (280 ms) with ease-layout using transform/opacity only (document.getAnimations(), including
# ::view-transition pseudo-elements); resizing inside a class never animates; under prefers-reduced-motion the
# class changes with no animation. Negative controls: the reduced-motion assertion must fail without the media
# emulation, the instant check must fail when motion is not reduced, and an injected off-token duration must
# fail the token check.
@motion @ui @web @boundary-only
Feature: Motion uses the design tokens and honours reduced motion
  As a Know Meet user
  I need motion that matches the brand and stops when I ask for less motion
  So that the product feels deliberate and never makes me uncomfortable

  Background:
    Given the production web build is served by Vite preview
    And the motion tokens are read from "docs/design/tokens.json"

  @smoke
  Scenario: The theme switch transition uses the tokenized duration and easing
    When the home route is opened with no motion preference
    Then the page body transitions background-color and color over token "dur" with easing token "ease-standard"

  # Retired 2026-11-11 (operator decision 4, ADJ-2): the hamburger "mobile navigation opens" scenario.
  # Replaced by the resize-transition scenarios below (DESIGN.md "Resize motion").
  Scenario Outline: Crossing a width class morphs the navigation with the nav tokens
    When the home route is opened at <from> with no motion preference
    And the viewport is resized to <to>
    Then the crossing animates over token "dur-nav-morph" with easing token "ease-layout" into the "<class>" navigation using only transform and opacity

    Examples:
      | from | to   | class  |
      | 1440 | 1000 | rail   |
      | 1024 | 1023 | rail   |
      | 1000 | 500  | bar    |
      | 600  | 599  | bar    |

  Scenario: Resizing inside one width class does not animate the navigation
    When the home route is opened at 1440 with no motion preference
    And the viewport is resized to 1100
    Then the "inline" navigation is shown with no animation

  Scenario: Reduced motion makes the navigation morph instant
    When the home route is opened at 1440 with prefers-reduced-motion set to reduce
    And the viewport is resized to 500
    Then the "bar" navigation is shown with no animation

  Scenario: Reduced motion removes transitions and stops the dot animations
    When the home route is opened with prefers-reduced-motion set to reduce
    Then every transition and animation duration on the page is at most token "dur-reduced-motion"
    And no dot animation is running

  @negative-control
  Scenario: The reduced-motion check fails when the preference is not set
    When the home route is opened with no motion preference
    Then the reduced-motion duration check fails for the page body

  @negative-control
  Scenario: The token check fails on an off-token duration
    When the home route is opened with no motion preference
    And a style giving the page body a 300ms transition is injected
    Then the tokenized-duration check fails for the page body

  @negative-control
  Scenario: The instant-morph check fails when motion is not reduced
    When the home route is opened at 1440 with no motion preference
    And the viewport is resized to 500
    Then the instant-morph check fails for the "bar" navigation

  @negative-control
  Scenario: The nav-token check fails on an off-token morph duration
    When the home route is opened at 1440 with no motion preference
    And a style giving the navigation morph a 500ms duration is injected
    And the viewport is resized to 1000
    Then the nav-token check fails for the "rail" navigation
