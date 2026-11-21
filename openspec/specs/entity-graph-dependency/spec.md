# entity-graph-dependency Specification

## Purpose
TBD - created by archiving change wc08-entity-graph-5-0-1. Update Purpose after archive.

## Requirements

### Requirement: Entity graph resolves to 5.0.1

The system SHALL satisfy the following. Every package that depends on the entity graph resolves core and react to 5.0.1 from npm.

#### Scenario: Case 1

- **WHEN** the pin lint runs
- **THEN** any 4.x or 5.0.0 entity graph pin fails it

#### Scenario: Case 2

- **WHEN** 5.0.1 is not the latest dist-tag
- **THEN** task 8.1 stops and reports BLOCKED
