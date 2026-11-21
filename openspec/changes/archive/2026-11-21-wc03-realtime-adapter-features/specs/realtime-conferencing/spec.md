## ADDED Requirements

### Requirement: The LiveKit adapter implements the conferencing port

The system SHALL satisfy the following. `packages/realtime` implements every new `RealtimeRoom` operation over livekit-client 2.24.1 without deprecated chat APIs.

#### Scenario: Case 1

- **WHEN** a private message is sent
- **THEN** the adapter sends it with destinationIdentities set to the one recipient

#### Scenario: Case 2

- **WHEN** the browser lacks setSinkId
- **THEN** output selection reports unsupported instead of throwing

#### Scenario: Case 3

- **WHEN** the camera device changes while an effect is on
- **THEN** the processor is applied to the new track
