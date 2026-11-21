## MODIFIED Requirements

### Requirement: The hosted build exposes only working screens

The system SHALL satisfy the following. The default build is unchanged for desktop and local development. Operator batch 2 (2026-11-18) added the on-device history and recordings screens to the hosted build, reached through the shared adaptive navigation (Home, History, Recordings).

#### Scenario: Excluded route

- **WHEN** a visitor opens /dashboard, /agents, /settings, /notes or /auth on the hosted build
- **THEN** the not-found state is shown

#### Scenario: On-device screens

- **WHEN** a visitor opens /history or /recordings on the hosted build
- **THEN** the on-device history or recordings library screen is shown, and the navigation offers exactly Home, History and Recordings

#### Scenario: Stub sign-in

- **WHEN** localStorage km-auth is set on the hosted build
- **THEN** nothing visible changes

#### Scenario: Default build

- **WHEN** the default build is opened
- **THEN** the excluded routes still render as before
