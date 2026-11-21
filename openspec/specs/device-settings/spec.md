# device-settings Specification

## Purpose
TBD - created by archiving change wc05-device-settings. Update Purpose after archive.

## Requirements

### Requirement: Participants choose their devices

The system SHALL satisfy the following. A participant chooses microphone and camera in the lobby and in the room, and the speaker where the browser supports it.

#### Scenario: Case 1

- **WHEN** a device is chosen in the lobby
- **THEN** the meeting starts with that device active

#### Scenario: Case 2

- **WHEN** the browser cannot change the output device
- **THEN** the speaker control is replaced by an explanation
