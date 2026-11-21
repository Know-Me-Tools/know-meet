# local-recording Specification

## Purpose
TBD - created by archiving change wc10-local-recording. Update Purpose after archive.

## Requirements

### Requirement: Recording requires consent and stays on the device

The system SHALL satisfy the following. A recording starts only after every present participant agrees, shows an indicator to everyone, and is stored only in the recorder's browser.

#### Scenario: Case 1

- **WHEN** a participant declines
- **THEN** no recording starts

#### Scenario: Case 2

- **WHEN** storage quota is reached
- **THEN** the recording stops and keeps what was written

#### Scenario: Case 3

- **WHEN** a recording is played
- **THEN** it plays from local storage with no upload
