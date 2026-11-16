# release-acceptance Specification

## Purpose
TBD - created by archiving change wr01-release-scenarios. Update Purpose after archive.

## Requirements

### Requirement: Release acceptance is defined before production code

The system SHALL satisfy the following. Each adopted scenario WR-1 to WR-9 has a Gherkin scenario and a spec skeleton, and none is executed until the boundary run.

#### Scenario: Scenario set is complete

- **WHEN** the release scenarios are listed
- **THEN** WR-1 to WR-9 each have one feature scenario with the oracle and negative control from the adopted contract

#### Scenario: No early execution

- **WHEN** wr01 completes
- **THEN** no generated-code test, build or probe has been run

### Requirement: Cluster facts are observed before manifests are written

The system SHALL satisfy the following. Every fact the manifests depend on is checked on the live cluster with read-only commands.

#### Scenario: Observation recorded

- **WHEN** the read-only check runs with operator authentication
- **THEN** each fact in cluster-context.md is marked observed, differs or not found, with the command that showed it

#### Scenario: No writes

- **WHEN** the check runs
- **THEN** no cluster resource is created, changed or deleted
