## ADDED Requirements

### Requirement: The hosted build exposes only working screens

The system SHALL satisfy the following. The default build is unchanged for desktop and local development.

#### Scenario: Excluded route

- **WHEN** a visitor opens /dashboard, /agents, /recordings, /settings, /notes or /auth on the hosted build
- **THEN** the not-found state is shown

#### Scenario: Stub sign-in

- **WHEN** localStorage km-auth is set on the hosted build
- **THEN** nothing visible changes

#### Scenario: Default build

- **WHEN** the default build is opened
- **THEN** the excluded routes still render as before

### Requirement: The hosted build is web-only and emits its CSP header

The system SHALL satisfy the following. The header value comes from the existing CSP builder so the meta tag and the response header cannot drift.

#### Scenario: Web-only build

- **WHEN** build:hosted runs
- **THEN** no Tauri or Flutter build is invoked

#### Scenario: CSP artifact

- **WHEN** build:hosted completes
- **THEN** a file holds the header value produced by buildContentSecurityPolicyHeader for the configured LiveKit URL
