# local-history Specification

## Purpose
TBD - created by archiving change wc09-local-history. Update Purpose after archive.

## Requirements

### Requirement: Meetings and chats are kept on the device

The system SHALL satisfy the following. Meetings and the chat a device received are stored in PGlite in that browser and are never sent to a server.

#### Scenario: Case 1

- **WHEN** the page is reloaded after a meeting
- **THEN** the history lists the meeting and its chat

#### Scenario: Case 2

- **WHEN** the history is in use
- **THEN** no network request carries a history record

#### Scenario: Case 3

- **WHEN** the participant deletes an entry
- **THEN** it is gone after a reload
