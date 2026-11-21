# Contract WR-3. Owner tasks: wr01-release-scenarios/1.1, wr01-release-scenarios/1.6,
# wr06-hosted-release-surface/6.3, wr08-cluster-manifests/8.2, wr08-cluster-manifests/8.3,
# wr09-release-boundary/9.5, wr09-release-boundary/9.6.
# Oracle: the certificate for meet.know-me.tools is issued by Let's Encrypt production and is valid.
# HTTP redirects to HTTPS. Responses for / and /api/healthz carry Strict-Transport-Security,
# Content-Security-Policy equal to the generated policy, X-Content-Type-Options nosniff, a
# frame-denying policy, Referrer-Policy, and a Permissions-Policy that allows camera and microphone
# for this origin only.
# Negative control: the same header assertions run against the packaged static image alone, without
# the Gateway filter, must FAIL for Strict-Transport-Security.
# Web CSP (phase web-conferencing-features, wc06-web-csp/6.3, WC-10): the generated policy now also
# carries script-src 'wasm-unsafe-eval', worker-src 'self' blob:, media-src blob: and img-src blob:;
# connect-src is exactly the previous release's and no 'unsafe-eval' is added. The desktop policy
# in tauri.conf.json is unchanged.
# Executed by tests/release/headers.spec.ts: the positive scenario in the hosted project only; the
# desktop-policy and negative-control scenarios in the packaged project only. The expected CSP is the
# build:hosted artifact (wr06 task 6.3) and the previous release's value is saved before the build;
# both are passed to the run by path (KM_RELEASE_CSP_FILE, KM_RELEASE_PREVIOUS_CSP_FILE; a missing
# input is BLOCKED).
@WR-3 @value-critical @release @boundary-only
Feature: WR-3 Valid TLS and security headers at the public URL
  As a visitor opening the meeting site
  I need a valid certificate and protective response headers
  So that the page cannot be downgraded, framed or given wider device access than it needs

  @hosted
  Scenario: The public URL has a production certificate, an HTTPS redirect and the security headers
    Given the generated Content-Security-Policy value recorded by the hosted build
    When a TLS connection is opened to meet.know-me.tools on port 443
    Then the certificate chain is trusted, its issuer organisation is "Let's Encrypt" and it is in its validity period
    And the certificate names meet.know-me.tools
    When the client requests "http://meet.know-me.tools/" without following redirects
    Then the response redirects to "https://meet.know-me.tools/"
    When the client requests "/" and "/api/healthz" over HTTPS
    Then each response carries Strict-Transport-Security with a positive max-age
    And each response carries a Content-Security-Policy equal to the generated value
    And each response carries X-Content-Type-Options "nosniff"
    And each response denies framing by X-Frame-Options DENY or frame-ancestors 'none'
    And each response carries a Referrer-Policy
    And each response carries a Permissions-Policy allowing camera and microphone for this origin only
    And each Content-Security-Policy lists script-src 'wasm-unsafe-eval'
    And each Content-Security-Policy lists worker-src 'self' and blob:
    And each Content-Security-Policy lists media-src blob: and img-src blob:
    And each Content-Security-Policy keeps connect-src exactly as the previous release served it
    And no Content-Security-Policy adds 'unsafe-eval'
    And the certificate issuer, its expiry and the header dump are recorded as evidence

  @packaged
  Scenario: The desktop policy is unchanged by the web policy
    When tauri.conf.json is read
    Then app.security.csp equals the committed desktop policy exactly
    And it is not the hosted policy

  @packaged @negative-control
  Scenario: The same header assertions fail for HSTS on the bare static image
    When the client requests "/" from the packaged static image without the Gateway
    Then the response carries no Strict-Transport-Security header
    And the same header assertions report a Strict-Transport-Security failure
