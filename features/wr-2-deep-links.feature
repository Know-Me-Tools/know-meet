# Contract WR-2. Owner tasks: wr01-release-scenarios/1.1, wr07-container-images/7.1,
# wr08-cluster-manifests/8.2, wr09-release-boundary/9.2, wr09-release-boundary/9.6.
# Oracle: GET / , /join, /meet, /history and /recordings each return status 200 with the app document, and a reload on each
# keeps the same route rendered.
# Negative control: GET /assets/does-not-exist.js must return 404, not the app document.
# Executed by tests/release/hosting.spec.ts in the packaged and hosted projects.
@WR-2 @value-critical @release @boundary-only @packaged @hosted
Feature: WR-2 Deep links and reloads return the app
  As a visitor who follows a shared link or reloads the page
  I need every app route to load the app
  So that a link to the join screen or the meeting room never dead-ends

  Scenario Outline: The <path> route returns the app document and survives a reload
    When the client requests "<path>"
    Then the response status is 200 with an HTML content type
    And the body is the app document served for "/"
    When a browser opens "<path>" and reloads it
    Then the same route's screen is rendered before and after the reload
    And status codes and content types are recorded as evidence

    Examples:
      | path  |
      | /     |
      | /join |
      | /meet |
      | /history |
      | /recordings |

  @negative-control
  Scenario: A missing asset is a 404, not the app document
    When the client requests "/assets/does-not-exist.js"
    Then the response status is 404
    And the body is not the app document
