## ADDED Requirements

### Requirement: Mobile screens match the design

Goldens approved against prototype screenshots pass in both themes and interactive widgets have semantics.

#### Scenario: Goldens

- **WHEN** flutter test --tags golden runs
- **THEN** all goldens pass

#### Scenario: Stock theme fails

- **WHEN** stock ThemeData.dark() is substituted
- **THEN** goldens fail

