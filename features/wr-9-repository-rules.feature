# Contract WR-9 (classification: delivery). Owner tasks: wr01-release-scenarios/1.1,
# wr02-meeting-domain-and-ports/2.3, wr07-container-images/7.4, wr09-release-boundary/9.1.
# Oracle: all commands exit 0. New Dockerfiles, YAML and shell files are covered by the naming and
# 500-line checks.
# Negative control: a scratch 501-line YAML manifest must make the line check exit non-zero.
# Fixtures: scratch file outside the committed tree.
# Not a Playwright scenario. Production entry:
#   pnpm run lint && pnpm run typecheck && pnpm run test && cargo check --workspace
@WR-9 @value-critical @release @boundary-only @command
Feature: WR-9 Repository rules hold and the other shells still build
  As a maintainer of the web, desktop and mobile shells
  I need the release work to keep every repository rule and every existing build green
  So that shipping the web release does not break the other shells

  Scenario: The static gates pass on the release tree
    When "pnpm run lint", "pnpm run typecheck", "pnpm run test" and "cargo check --workspace" run in order
    Then each command exits 0
    And the argv and exit code of each command are recorded as evidence

  Scenario: New release file types are covered by the naming and line checks
    Given the release tree contains Dockerfiles, YAML manifests and shell files added in this phase
    When the naming check and the 500-line check list the files they inspect
    Then every added Dockerfile, YAML file and shell file is inspected by both checks

  @negative-control
  Scenario: A 501-line YAML manifest fails the line check
    Given a scratch YAML manifest of 501 lines outside the committed tree
    When the 500-line check runs over it
    Then it exits non-zero and names the offending path
