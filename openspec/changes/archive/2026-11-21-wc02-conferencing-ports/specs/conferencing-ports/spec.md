## ADDED Requirements

### Requirement: Conferencing operations are expressed through ports

The system SHALL satisfy the following. Share, chat, device, playback, processor and consent operations are defined in `packages/domain` and `packages/application` with no framework, Tauri or LiveKit import.

#### Scenario: Case 1

- **WHEN** the boundary lint runs
- **THEN** an import of livekit-client from domain or application code fails the check

#### Scenario: Case 2

- **WHEN** a chat message is constructed without an audience
- **THEN** the type system rejects it

#### Scenario: Case 3

- **WHEN** a recording start is requested before every present participant consented
- **THEN** the use case refuses to start
