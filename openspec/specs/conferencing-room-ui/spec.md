# conferencing-room-ui Specification

## Purpose
TBD - created by archiving change wc04-share-and-chat-ui. Update Purpose after archive.

## Requirements

### Requirement: Room UI exposes share, chat and audio start

The system SHALL satisfy the following. The meeting room offers share, chat with an explicit audience and an Enable audio prompt, accessible under WCAG 2.2 AA and Flat 2.0.

#### Scenario: Case 1

- **WHEN** a participant opens the chat composer
- **THEN** the audience is shown and defaults to Everyone

#### Scenario: Case 2

- **WHEN** playback is blocked
- **THEN** an Enable audio control is shown and one activation starts remote audio
