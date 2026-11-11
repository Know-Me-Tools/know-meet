## ADDED Requirements

### Requirement: Agentic-UI choice is decided by measured prototypes
The project SHALL select its agentic-UI architecture only after both prototypes run the same harness.

#### Scenario: Both prototypes measured on one harness
- **WHEN** prototypes H and O are built
- **THEN** each runs the same AG-UI corpus, A2UI surfaces, hostile markdown corpus and a11y checks in a Vite production build inside Tauri
- **AND** the comparison report records conformance, latency, render count, memory and bundle size for both

#### Scenario: No product dependency before the decision
- **WHEN** the spike is in progress
- **THEN** no agentic-UI package is added to `apps/**` or `packages/**`
