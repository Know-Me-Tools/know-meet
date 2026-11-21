## ADDED Requirements

### Requirement: Participants blur or replace their background

The system SHALL satisfy the following. A participant turns on blur or an image background and turns it off; all model and WASM files load from the app's origin.

#### Scenario: Case 1

- **WHEN** an effect is turned on
- **THEN** no request leaves the origin for WASM or model files

#### Scenario: Case 2

- **WHEN** the browser lacks the required APIs
- **THEN** the effects control explains that effects are unavailable
