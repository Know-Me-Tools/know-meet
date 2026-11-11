## ADDED Requirements

### Requirement: Fidelity has a frozen oracle

Every in-scope route/state has a baseline at 375/768/1024/1440 in both themes with a frozen threshold before generation starts.

#### Scenario: Baselines exist

- **WHEN** the inventory from c02 is enumerated
- **THEN** each state ID has two-theme, four-viewport baselines with source path and digest recorded

