## ADDED Requirements

### Requirement: All generator surfaces are present and owned

Every generated surface is imported, owned by a team role, and compliant with naming and line rules.

#### Scenario: Import completes

- **WHEN** generation output is imported
- **THEN** Rust crates, BFF, UAR, PEM, React and Flutter surfaces exist in the workspace, each path has an owner, and the line checker passes

