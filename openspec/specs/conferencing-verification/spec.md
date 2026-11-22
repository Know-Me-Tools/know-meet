# conferencing-verification Specification

## Purpose
Define the packaged and hosted verification required for web conferencing
releases, including the evidence used to confirm the deployed behavior.

## Requirements

### Requirement: The phase is verified once at the boundary

The system SHALL satisfy the following. The boundary packet runs once; nothing is pushed unless the packaged run and reviews pass and the operator approves.

#### Scenario: Case 1

- **WHEN** the packaged run fails
- **THEN** nothing is pushed

#### Scenario: Case 2

- **WHEN** the live digest differs from the merged build
- **THEN** the run stops and reports FAIL

### Requirement: Hardening is proven once at the boundary and on the live site

The system SHALL satisfy the following. The adopted hardening and regression scenarios pass in one packaged boundary run, and WC-1, 4, 5, 8 and 12 pass on the live site on the merged build.

#### Scenario: Case 1

- **WHEN** the packaged boundary runs
- **THEN** every adopted scenario reports PASS, FAIL, BLOCKED or NOT_EXERCISED with evidence

#### Scenario: Case 2

- **WHEN** the merged build is live
- **THEN** the hosted rerun passes, paced to the production limit
