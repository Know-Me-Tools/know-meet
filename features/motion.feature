# Plan c03/3.3 and c09 (motion respects prefers-reduced-motion); constraint accessibility-basics.
# Oracle: representative transitions use the tokenized durations and easing from
# docs/design/tokens.json (body theme transition: dur + ease-standard; mobile nav open: dur +
# ease-out); under prefers-reduced-motion: reduce, durations drop to dur-reduced-motion and the
# dot (orb) animations stop.
# Negative controls: the reduced-motion assertion must fail without the media emulation, and an
# injected off-token duration must fail the token check.
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

  Scenario: The mobile navigation opens with the tokenized duration and easing
    When the home route is opened at 375 with no motion preference
    And the navigation menu button is pressed
    Then the open navigation animates over token "dur" with easing token "ease-out"

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
