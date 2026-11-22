# conferencing-hardening-acceptance Specification

## Purpose
Define the executable acceptance scenarios for web conferencing hardening and
the environments in which they run.

## Requirements

### Requirement: Hardening scenarios are executable before the fixes

The system SHALL satisfy the following. Each adopted hardening scenario has an executable test with its oracle and negative control, run only at the boundary.

#### Scenario: Case 1

- **WHEN** the boundary packet runs
- **THEN** HD-1, HD-2, HD-4 and HD-5 execute in their adopted environments

#### Scenario: Case 2

- **WHEN** the boundary packet runs
- **THEN** WC-8 runs in Chromium with its test unchanged from main, and no test wipes an origin's storage
