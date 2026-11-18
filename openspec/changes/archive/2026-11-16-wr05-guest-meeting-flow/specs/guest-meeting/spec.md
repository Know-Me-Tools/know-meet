## ADDED Requirements

### Requirement: A guest can start, join and leave a meeting

The system SHALL satisfy the following. The flow needs a display name and nothing else.

#### Scenario: Start

- **WHEN** a guest enters a name and starts a meeting
- **THEN** a room code is shown and the guest is in the room

#### Scenario: Join

- **WHEN** a second guest enters the code and a name
- **THEN** both guests see each other's tile with live video and hear each other

#### Scenario: Mute

- **WHEN** a guest mutes the microphone
- **THEN** the other guest's view shows that participant as muted

#### Scenario: Leave

- **WHEN** a guest leaves
- **THEN** the remaining guest's view removes that tile

#### Scenario: Unknown code

- **WHEN** a guest enters a code that was never issued
- **THEN** the meeting-not-found state is shown

### Requirement: The three screens meet WCAG 2.2 AA and the Know Meet design

The system SHALL satisfy the following. Flat 2.0: no borders or outlines; focus shown by fill; tokens only.

#### Scenario: Keyboard

- **WHEN** a user operates the flow by keyboard only
- **THEN** every control is reachable and operable and focus is visible by fill

#### Scenario: Reduced motion

- **WHEN** prefers-reduced-motion is set
- **THEN** non-essential motion stops
