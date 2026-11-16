# Contract WR-4. Owner tasks: wr01-release-scenarios/1.1, wr03-token-service/3.2,
# wr03-token-service/3.3, wr09-release-boundary/9.2, wr09-release-boundary/9.6.
# Oracle: a token is issued only for a room code the service generated. The decoded token grants join
# to that one room, expires within the configured short lifetime, and carries no admin or
# room-create grant. Requests above the configured per-client rate receive 429. A request with a
# foreign Origin is refused.
# Negative control: a request naming an arbitrary client-chosen room must be refused with 404; a
# burst below the limit must succeed.
# Fixtures: the rate limit and token lifetime are read from the deployed configuration and passed to
# the run (KM_RELEASE_TOKEN_TTL_SECONDS, KM_RELEASE_RATE_LIMIT_BURST,
# KM_RELEASE_RATE_LIMIT_REFILL_SECONDS); they are recorded with the evidence.
# Executed by tests/release/token-abuse.spec.ts in the packaged and hosted projects.
@WR-4 @value-critical @security @release @boundary-only @packaged @hosted
Feature: WR-4 The public token endpoint bounds abuse
  As the operator paying for LiveKit usage
  I need the public token endpoint to issue only narrow, short-lived tokens at a bounded rate
  So that anyone on the internet cannot open rooms, join arbitrary rooms or run up the bill

  Background:
    Given the deployed token lifetime and per-client rate limit are known and recorded

  Scenario: A token is issued only for a generated code and is narrowly scoped
    Given the client creates a meeting from the site origin and receives a room code
    When the client requests a token for that code and a display name from the site origin
    Then the response status is 200
    And the decoded token grants roomJoin to exactly that room
    And the token expires no later than the configured lifetime from now
    And the token carries no roomAdmin, ingressAdmin or roomCreate grant
    And the decoded claims, with the signature removed, are recorded as evidence

  Scenario: A foreign Origin is refused
    When the client creates a meeting with the Origin "https://attacker.example"
    Then the response status is 403
    When the client requests a token for a generated code with the Origin "https://attacker.example"
    Then the response status is 403 and no token is returned

  Scenario: Requests above the per-client rate receive 429
    Given the client's rate-limit bucket has refilled
    When the client sends more token requests back to back than the configured burst
    Then at least one response has status 429
    And every request beyond the burst has status 429

  @negative-control
  Scenario: An arbitrary client-chosen room is refused with 404
    When the client requests a token for the well-formed room code it chose itself
    Then the response status is 404 and no token is returned
    When the client requests a token for the room name "standup"
    Then the response status is 404 and no token is returned

  @negative-control
  Scenario: A burst below the limit succeeds
    Given the client's rate-limit bucket has refilled
    When the client sends one fewer request than the configured burst back to back
    Then every response succeeds
