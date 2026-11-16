# Contract WR-5. Owner tasks: wr01-release-scenarios/1.1, wr06-hosted-release-surface/6.1,
# wr06-hosted-release-surface/6.2, wr09-release-boundary/9.2, wr09-release-boundary/9.6.
# Oracle: navigation shows only home, join and the meeting room. Visiting /dashboard, /agents,
# /recordings, /settings, /notes and /auth renders the not-found state. Setting localStorage km-auth
# changes nothing visible.
# Negative control: the same spec against the default (non-hosted) web build must FAIL because
# /dashboard renders.
# Fixtures: hosted build and default build of the same commit. The default build is served at
# KM_RELEASE_DEFAULT_BUILD_URL for the negative control.
# Executed by tests/release/surface.spec.ts: the positive scenario in the packaged and hosted
# projects; the negative control in the packaged project only.
@WR-5 @value-critical @release @boundary-only
Feature: WR-5 Screens on sample data are not reachable in the hosted build
  As a visitor to the public site
  I need to see only the screens that work
  So that the release does not present sample data as a working product

  @packaged @hosted
  Scenario: Only home, join and the meeting room are reachable
    When a browser opens the home, join and meeting-room screens of the hosted build
    Then every same-origin link on those screens points to "/", "/join" or "/meet"
    When the browser visits "/dashboard", "/agents", "/recordings", "/settings", "/notes" and "/auth"
    Then each renders the not-found state
    When localStorage "km-auth" holds a signed-in user before the page loads
    Then the home screen's visible text and accessibility tree are unchanged
    And "/dashboard" still renders the not-found state

  @packaged @negative-control
  Scenario: The same checks fail on the default build because /dashboard renders
    Given the default web build of the same commit is served
    When the same surface checks run against the default build
    Then they report that "/dashboard" does not render the not-found state
