# Contract WC-10. Owner tasks: wc01-conferencing-scenarios/1.1, wc06-web-csp/6.1 to 6.4,
# wc07-background-effects/7.1, wc11-conferencing-boundary/11.1, wc11-conferencing-boundary/11.3,
# wc11-conferencing-boundary/11.4, wc11-conferencing-boundary/11.5.
# Oracle: the hosted HTML and worker .js responses carry a CSP equal to the generated hosted value,
# which differs from the previous one only by the adopted sources (script-src 'wasm-unsafe-eval',
# worker-src, media-src blob:, img-src blob:); .wasm is served as application/wasm; the
# tauri.conf.json csp equals the default policy byte for byte; WC-4, WC-7 and WC-8 report no CSP
# violation.
# Negative control: the default (non-hosted) build's meta CSP has none of the new sources. The diff
# check is also challenged with a widened connect-src and an added unsafe-eval source, which it must
# flag.
# Run inputs: KM_RELEASE_CSP_FILE (build:hosted artifact), KM_RELEASE_PREVIOUS_CSP_FILE (the value
# main served before this phase), KM_RELEASE_DEFAULT_BUILD_URL. A missing input is BLOCKED.
# The desktop identity unit test runs in "pnpm test"; this feature reads the committed file.
# Executed by tests/release/wc-10-web-csp.spec.ts, packaged then hosted (negative control and
# desktop identity: packaged).
@WC-10 @value-critical @release @smoke @boundary-only @packaged @hosted
Feature: WC-10 The hosted page serves the new web CSP and nothing else is widened
  As the operator of the public site
  I need the policy widened for the new features and for nothing else
  So that WASM, workers and blob playback work without opening the page to more than agreed

  Scenario: The generated policy is served on HTML, workers and wasm and differs only by the adopted sources
    Given the generated hosted policy and the previous release's policy
    Then the only differences are the adopted sources
    And the script-src 'wasm-unsafe-eval' source is present
    When the client requests "/"
    Then the response carries the generated policy
    And the meta policy, if present, equals the generated policy
    When the client requests the worker scripts and wasm files found in the built output
    Then each is served with the generated policy
    And each wasm file is served as "application/wasm"
    And each script is served as JavaScript

  @packaged-only
  Scenario: The desktop policy is byte-identical to the base commit's
    When tauri.conf.json is read
    Then app.security.csp equals the committed default policy exactly

  @negative-control @packaged-only
  Scenario: The default build's meta policy has none of the new sources
    When the default build is requested
    Then its meta Content-Security-Policy contains no 'wasm-unsafe-eval' and no blob: source

  @negative-control
  Scenario: The diff check flags a widened policy
    Given a policy with connect-src widened or unsafe-eval added
    Then the unadopted-changes check reports them
