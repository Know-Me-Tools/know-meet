## ADDED Requirements

### Requirement: The repository rejects rule violations

Lint fails on a non-kebab-case file name, a file over 500 lines outside the adopted exceptions, an `any`, a hex colour outside token sources, a LiveKit key assignment, or an outward import from domain/application.

#### Scenario: A rule is broken

- **WHEN** a scratch fixture violates any one rule
- **THEN** `pnpm run lint` exits non-zero and names the offending path

#### Scenario: Rules hold

- **WHEN** the committed tree is linted
- **THEN** `pnpm run lint` exits 0

