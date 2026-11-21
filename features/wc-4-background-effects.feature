# Contract WC-4. Owner tasks: wc01-conferencing-scenarios/1.1, wc01-conferencing-scenarios/1.6,
# wc02-conferencing-ports/2.2, wc03-realtime-adapter-features/3.5, wc07-background-effects/7.1,
# wc07-background-effects/7.2, wc07-background-effects/7.3, wc11-conferencing-boundary/11.2,
# wc11-conferencing-boundary/11.5.
# Oracle: after blur, A's published track reports an active processor and B's rendered frame differs
# from the pre-effect frame; after image, the same; after off, no processor and B still renders
# frames. No request leaves the origin for .wasm or .tflite files and no CSP violation is reported.
# Negative control: with effects off, A's track reports no processor.
# Fixtures: a fixed camera picture (generated y4m, src/y4m.ts); the first preset background image.
# Visual quality is a judgement from the attached frames, not measured.
# UI path (approved shape, background effects): the room Settings control opens the "Audio and
# video" pane; its Background section is a radiogroup of None, Blur and three image cards. There is
# no separate effects control in the room bar.
# Executed by tests/release/wc-4-background-effects.spec.ts (Chromium), packaged then hosted.
@WC-4 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WC-4 Blur and image backgrounds show remotely and turn off cleanly
  As a participant who does not want to show their surroundings
  I need to blur or replace my background and turn it off again
  So that the others see the effect and nothing else changes

  Background:
    Given guest A and guest B are in the same meeting
    And A's camera shows a fixed picture

  Scenario: Blur, image and off are visible on B with no off-origin files and no CSP violation
    Given A's track reports no processor and B captures the original frame
    When A opens the room settings and chooses the Blur background
    Then A's track reports the blur processor
    And B's frame differs from the original frame by more than the threshold
    And B's frame has lost fine detail
    When A chooses the first image background in the same section
    Then A's track reports the virtual background processor
    And B's frame differs from the original frame by more than the threshold
    When A turns the effect off
    Then A's track reports no processor
    And B's frame is back toward the original frame
    And B still renders A's video
    And no .wasm, .tflite or model file was requested from another origin
    And at least one .wasm and one model file were requested from this origin
    And no CSP violation was reported by A or B

  @negative-control
  Scenario: With effects never turned on, A's track reports no processor
    Given A never chooses a background in the room settings
    Then A's track reports no processor
    And two captures of B's frame of A differ by less than the effect threshold
