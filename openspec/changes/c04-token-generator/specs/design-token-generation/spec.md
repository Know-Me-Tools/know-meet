## ADDED Requirements

### Requirement: One token edit propagates everywhere

Generating from tokens.json updates web CSS, Tailwind theme and Dart outputs consistently and fails loudly on invalid input.

#### Scenario: A colour changes

- **WHEN** one colour is changed in a scratch tokens.json
- **THEN** only the matching CSS variable, Tailwind value and Dart constant change

#### Scenario: Input is invalid

- **WHEN** a colour is malformed or an output directory is missing
- **THEN** the generator exits non-zero

