# release-verification Specification

## Purpose
TBD - created by archiving change wr09-release-boundary. Update Purpose after archive.

## Requirements

### Requirement: The boundary packet runs once, in order, and stops safely

The system SHALL satisfy the following. The packet and its stop conditions are those of the adopted contract.

#### Scenario: Packaged failure

- **WHEN** the packaged run fails
- **THEN** no cluster command is run

#### Scenario: Second approval

- **WHEN** the packaged run and reviews pass
- **THEN** the lead shows the reviewed HTTPRoute hostname and waits for explicit operator approval before any cluster-changing command

#### Scenario: Hosted proof

- **WHEN** the hosted run completes
- **THEN** WR-1 to WR-5 have a recorded verdict from the four-value vocabulary with evidence

### Requirement: Published claims match what shipped

The system SHALL satisfy the following. The README states that the release is guest video meetings and lists what is not included.

#### Scenario: README truth

- **WHEN** the release is live
- **THEN** the README no longer describes recording, agents or delivery as working features of the hosted site
