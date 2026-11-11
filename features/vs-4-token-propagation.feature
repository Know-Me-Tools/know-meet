# Contract VS-4. Owner tasks: c04/4.2-4.4, c13/13.4.
# Oracle: changing one colour in a scratch copy of tokens.json changes the corresponding CSS
# variable, Tailwind theme value and Dart constant; nothing else changes.
# Negative control: an invalid colour or a missing output dir makes the generator exit non-zero.
@VS-4 @value-critical @cli @tokens @boundary-only
Feature: VS-4 One token edit propagates to web, desktop and Flutter outputs
  As the Know Meet design lead
  I need one edit in tokens.json to reach every shell
  So that the design can change without hand-editing three codebases

  Background:
    Given a scratch copy of "docs/design/tokens.json"
    And the generator outputs for the unmodified scratch copy are recorded in a scratch directory

  @smoke
  Scenario: Changing one dark-theme colour changes exactly its three outputs
    When the dark theme token "ember" is changed to "#123456" in the scratch copy
    And the generator runs with "pnpm --filter @know-meet/design-tokens generate" on the scratch copy
    Then the command exits 0
    And the web CSS variable "--ember" for the dark theme is "#123456"
    And the Tailwind theme value for "ember" in the dark theme is "#123456"
    And the Dart dark-theme constant for "ember" is the colour 0xFF123456
    And no other output line differs from the recorded outputs

  @negative-control
  Scenario: An invalid colour stops the generator
    When the dark theme token "ember" is changed to "not-a-colour" in the scratch copy
    And the generator runs on the scratch copy
    Then the command exits non-zero
    And its error output names the token "ember"

  @negative-control
  Scenario: A missing output directory stops the generator
    When the generator runs on the scratch copy with an output directory that does not exist
    Then the command exits non-zero
    And no output file is written
