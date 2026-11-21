# web-content-security-policy Specification

## Purpose
TBD - created by archiving change wc06-web-csp. Update Purpose after archive.

## Requirements

### Requirement: Hosted CSP allows the adopted sources only

The system SHALL satisfy the following. The hosted policy adds exactly the adopted sources; the default build and the desktop policy are unchanged byte for byte.

#### Scenario: Case 1

- **WHEN** the hosted header is rendered
- **THEN** it differs from the previous header only by the adopted sources

#### Scenario: Case 2

- **WHEN** the desktop policy is built
- **THEN** it equals the csp in tauri.conf.json
