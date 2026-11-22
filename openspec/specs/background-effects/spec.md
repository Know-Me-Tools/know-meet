# background-effects Specification

## Purpose
Define how participants blur or replace their camera background and how the
settings communicate preparation, loading, and compatibility.

## Requirements

### Requirement: Participants blur or replace their background

The system SHALL satisfy the following. A participant turns on blur or an image background and turns it off; all model and WASM files load from the app's origin.

#### Scenario: Case 1

- **WHEN** an effect is turned on
- **THEN** no request leaves the origin for WASM or model files

#### Scenario: Case 2

- **WHEN** the browser lacks the required APIs
- **THEN** the effects control explains that effects are unavailable

### Requirement: Background effects states say what is really happening

The system SHALL satisfy the following. Preparation runs on join and when the camera turns on, not when the pane opens, and choosing None never starts one; 'Preparing' shows only while preparation runs past 400 ms and never with an effect applied; the group is busy only while a chosen effect loads; the unsupported note names its cause and, for software graphics, a fix.

#### Scenario: Case 1

- **WHEN** an effect is applied and the camera turns on again
- **THEN** no 'Preparing' status appears

#### Scenario: Case 2

- **WHEN** graphics are software-only
- **THEN** the note says to turn on hardware acceleration and reload

#### Scenario: Case 3

- **WHEN** None is chosen while an effect is applied
- **THEN** no preparation starts and no 'Preparing' status appears
