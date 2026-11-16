## ADDED Requirements

### Requirement: Meeting use cases depend only on ports

The system SHALL satisfy the following. Starting, joining, leaving and muting are expressed against `RealtimeRoom` and `TokenIssuer` with no framework, Tauri or LiveKit import.

#### Scenario: Join by code

- **WHEN** a guest joins with a valid room code
- **THEN** the use case asks the TokenIssuer for a token and connects through the RealtimeRoom port

#### Scenario: Unknown code

- **WHEN** a guest joins with a code the issuer rejects
- **THEN** the use case reports meeting-not-found and does not connect

#### Scenario: Boundary held

- **WHEN** the boundary lint runs
- **THEN** an import of livekit-client from domain or application code fails the check
