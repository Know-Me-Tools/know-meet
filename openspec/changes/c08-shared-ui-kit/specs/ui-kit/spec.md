## ADDED Requirements

### Requirement: Components come from one themed kit

Every in-scope screen uses packages/ui components whose colours come only from generated tokens.

#### Scenario: Themed kit

- **WHEN** a component renders in both themes
- **THEN** its colours resolve to generated CSS variables and match the prototype component

