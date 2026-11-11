## ADDED Requirements

### Requirement: Product agentic UI builds on O only after its gates pass
Product code SHALL NOT build agentic UI on the own core until gates 16.1–16.5 have recorded evidence.

#### Scenario: Gates pass
- **WHEN** gates 16.1–16.5 have passing evidence under spikes/agentic-ui/
- **THEN** c08 task 8.3 may add the own core to packages/ui and apps/web

#### Scenario: A gate fails within budget
- **WHEN** a gate cannot pass within the normalised budget from 16.6
- **THEN** the operator is asked whether to reopen H
