# Goals — web-conferencing-features› wc-boundary-defect-scope

- Measure every defect blocking the static boundary gates (lint, typecheck, test, build, build:hosted) in one pass, without changing code
- Classify each defect by root cause and size the repair
- Recommend the repair strategy (batched repair, runner change, method deviation) and the amendment it needs
