## ADDED Requirements

### Requirement: Conferencing scenarios exist before production code

The system SHALL satisfy the following. Every adopted scenario WC-1 to WC-14 has a Gherkin feature and a Playwright spec skeleton before any production change of this phase begins.

#### Scenario: Case 1

- **WHEN** the boundary run starts
- **THEN** every WC scenario has a feature file and a spec in tests/release

#### Scenario: Case 2

- **WHEN** a spec's required input is missing
- **THEN** the spec fails with a BLOCKED message and does not skip
