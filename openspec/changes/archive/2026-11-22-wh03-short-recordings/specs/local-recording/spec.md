## ADDED Requirements

### Requirement: A stopped recording always holds real frames and plays

The system SHALL satisfy the following. However soon Stop follows Start, the recording keeps encoding until at least 0.5 s after the encoder started, so the library never keeps an empty or unplayable recording and no item stays in progress.

#### Scenario: Case 1

- **WHEN** Stop is clicked as soon as it is enabled
- **THEN** the library item plays

#### Scenario: Case 2

- **WHEN** a recording runs for 5 s
- **THEN** it is kept and plays
