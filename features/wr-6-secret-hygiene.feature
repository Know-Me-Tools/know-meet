# Contract WR-6 (classification: safety). Owner tasks: wr01-release-scenarios/1.2,
# wr03-token-service/3.1, wr07-container-images/7.2, wr08-cluster-manifests/8.4,
# wr09-release-boundary/9.1.
# Oracle: the scan finds no LiveKit API secret, no token-shaped string and no value of any LIVEKIT_
# variable in tracked files, the web bundle, either image's layers and environment, or the rendered
# manifests. The manifests refer to the Secret by name only.
# Negative control: a scratch image built with a dummy secret baked into an environment variable must
# make the scan exit non-zero.
# Fixtures: scratch image with a dummy value, built outside the committed tree.
# Not a Playwright scenario. Production entry:
#   pnpm run lint:secrets && node tooling/release/src/scan-artifacts.ts
# The scanner's behaviour is specified in tests/release/scan-contract.md (implemented in wr07 7.2).
@WR-6 @value-critical @safety @security @release @boundary-only @command
Feature: WR-6 No secret in the repo, the bundle, the images or the manifests
  As the operator who holds the LiveKit API secret
  I need proof that the secret and any token never leave the token service's runtime environment
  So that publishing the repository, the images and the site does not publish the credential

  Background:
    Given the LIVEKIT_ variables are present in the scanning environment and are never printed

  Scenario: The repository rules find no secret in tracked files
    When "pnpm run lint:secrets" runs
    Then it exits 0

  Scenario: The artifact scan finds no secret in any shipped artifact
    Given the hosted web bundle, the static web image, the token service image and the rendered production manifests
    When "node tooling/release/src/scan-artifacts.ts" scans tracked files, the bundle, both images' layers and environment, and the manifests
    Then no value of any LIVEKIT_ variable is found in any of them
    And no LiveKit-API-secret-shaped string and no JWT-shaped string is found
    And the manifests reference the LiveKit Secret by name and carry no Secret data values
    And the scan exits 0
    And the scan output names scanned inputs and pattern classes but never a matched value

  @negative-control
  Scenario: A scratch image with a dummy secret in its environment fails the scan
    Given a scratch image built outside the committed tree with a dummy LIVEKIT_API_SECRET in an environment variable
    And the scanning environment holds the same dummy value
    When the artifact scan runs with that scratch image as one of its images
    Then it exits non-zero
    And it reports the image reference and the pattern class without printing the dummy value
