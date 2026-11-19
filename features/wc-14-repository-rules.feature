# Contract WC-14 (classification: delivery). Owner tasks: wc01-conferencing-scenarios/1.1,
# wc03-realtime-adapter-features/3.1, wc08-entity-graph-5-0-1/8.5, wc11-conferencing-boundary/11.1.
# Oracle: all four commands exit 0; no file over 500 lines; names kebab-case; boundary lint passes;
# desktop and mobile builds succeed as in web-release WR-9.
# Negative control: the line checker fails on a 501-line fixture.
# Fixtures: scratch file outside the committed tree.
# Not a Playwright scenario. Production entry:
#   pnpm lint, pnpm typecheck, pnpm test, pnpm build
@WC-14 @value-critical @release @boundary-only @command
Feature: WC-14 Repository rules hold and the other shells still build
  As a maintainer of the web, desktop and mobile shells
  I need the conferencing work to keep every repository rule and every existing build green
  So that shipping it on the web does not break the other shells

  Scenario: The static gates pass on the conferencing tree
    When "pnpm lint", "pnpm typecheck", "pnpm test" and "pnpm build" run in order
    Then each command exits 0
    And no file in the tree exceeds 500 lines
    And every added file name is kebab-case, apart from the documented toolchain exceptions
    And the boundary lint passes: domain and application import no UI, Tauri, Flutter, LiveKit or vendor SDK
    And the argv and exit code of each command are recorded as evidence

  Scenario: The desktop and mobile shells still build
    When the desktop and mobile builds run as in web-release WR-9
    Then each succeeds

  @negative-control
  Scenario: A 501-line fixture fails the line check
    Given a scratch file of 501 lines outside the committed tree
    When the 500-line check runs over it
    Then it exits non-zero and names the offending path
