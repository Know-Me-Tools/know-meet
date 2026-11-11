# Contract VS-8 (classification: delivery). Owner tasks: c01/1.3, c01/1.4, c13/13.6.
# Oracle: lint and typecheck exit 0 with the adopted exception globs.
# Negative control: a scratch 501-line .ts file and a PascalCase .tsx file each make the check
# exit non-zero. Scratch files live in a scratch repository outside the committed tree.
@VS-8 @cli @repo-rules @boundary-only
Feature: VS-8 Repository rules hold: kebab-case names, 500-line limit, lint and typecheck
  As a Know Meet maintainer
  I need the naming, size and type rules enforced by the tools
  So that the codebase stays readable as it grows

  @smoke
  Scenario: Lint and typecheck pass on the committed tree
    When "pnpm run lint" runs at the repository root
    Then the command exits 0
    When "pnpm run typecheck" runs at the repository root
    Then the command exits 0

  @negative-control
  Scenario: A 501-line TypeScript file fails the line check
    Given a scratch repository containing "src/too-long.ts" with 501 lines
    When the line checker runs against the scratch repository
    Then the command exits non-zero
    And its output names "src/too-long.ts"

  @negative-control
  Scenario: A PascalCase TSX file fails the naming check
    Given a scratch repository containing "src/MeetingTile.tsx"
    When the naming check runs against the scratch repository with the repository's ls-lint config
    Then the command exits non-zero
    And its output names "MeetingTile.tsx"
