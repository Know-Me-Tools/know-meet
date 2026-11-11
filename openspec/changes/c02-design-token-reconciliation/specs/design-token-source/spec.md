## ADDED Requirements

### Requirement: Tokens are the single design source

Every colour, type, spacing, radius and motion value the prototype renders exists in `docs/design/tokens.json` for dark and light.

#### Scenario: Prototype values are covered

- **WHEN** the km.css custom properties are compared with tokens.json
- **THEN** every property has a matching token with an equal value, or a logged, approved discrepancy

