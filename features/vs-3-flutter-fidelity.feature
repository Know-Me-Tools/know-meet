# Contract VS-3. Owner tasks: c07/7.2, c12/12.1-12.3, c13/13.3.
# Oracle: golden images for the in-scope phone layouts in dark and light match reviewed goldens;
# ThemeData values equal the generated tokens. Golden provenance:
# tests/fidelity/oracle/flutter-golden-provenance.json (design-lead approves the initial goldens
# against the c03 prototype baselines at 375 before they become the oracle).
# Negative control: running with stock ThemeData.dark() must FAIL the goldens.
@VS-3 @value-critical @cli @mobile @boundary-only
Feature: VS-3 Flutter shell matches the tokens and the in-scope screens in both themes
  As a Know Meet user on a phone
  I need the mobile app to look like the approved design in dark and light
  So that every client is recognisably the same product

  Background:
    Given the Flutter golden provenance rule "tests/fidelity/oracle/flutter-golden-provenance.json"

  Scenario: Every golden in use was approved by design-lead against the prototype
    Then every golden under "apps/mobile/test/goldens" has an approval by design-lead in its approvals record
    And each approval's golden digest, prototype baseline digest and tokens.json digest are current

  @smoke
  Scenario: The phone layouts match the approved goldens
    When the golden suite runs with "flutter test --tags golden" in "apps/mobile"
    Then the command exits 0
    And the run compared a golden for each approved state in both themes

  Scenario: The generated Dart tokens carry the token values
    When the generated Dart tokens are compared with "docs/design/tokens.json"
    Then every hex colour token of each theme appears as its Dart ARGB literal
    And every pixel size token appears as its numeric value

  @negative-control
  Scenario: Stock Material dark theme fails the goldens
    Given the golden suite is configured to build the app with stock ThemeData.dark()
    When the golden suite runs with that configuration
    Then the command exits non-zero with at least one golden mismatch

  @negative-control
  Scenario: An unapproved golden is not accepted as oracle
    Given a scratch goldens directory containing one golden absent from the approvals record
    When the provenance check runs on the scratch directory
    Then it fails and names the unapproved golden
