You are an independent adversarial reviewer. You did not build the prototypes or write the report. Attack the recommendation; do not agree by default.

Decision: Know Meet's agentic-UI architecture. A spike built two prototypes on one harness and measured them: H (assistant-ui AG-UI runtime + entity-graph durable store) and O (own AG-UI reducer on entity-graph). The report recommends O. Context: React 19 + Vite + Tauri 2 desktop + Flutter mobile; CopilotKit excluded by the operator; AG-UI and A2UI are the wire contracts; requirements include custom chunks, full streaming markdown (math, Mermaid, safe SVG, media), HITL, accessibility.

Attached: the report, both prototype results files, the measurement comparison, and the Flutter parity results.

Tasks:
1. Check that every claim in the report's Recommendation and "What the builds revealed" is supported by the attached measurements/results. Flag misread numbers, cherry-picking, unfair comparison conditions, and missing measurements that would change the decision.
2. Make the strongest case for H instead of O.
3. Judge whether the measured differences are large enough to decide, or whether the spike is inconclusive.
4. Verdict.

Output ONLY JSON:
{"verdict":"PASS"|"REVISE"|"BLOCK","recommended":"O"|"H"|"inconclusive","agrees_with_report":true|false,
 "findings":[{"severity":"critical"|"major"|"minor","claim":"...","problem":"...","fix":"..."}],
 "unmeasured_but_decisive":["..."],
 "strongest_case_for_H":"...",
 "conditions_before_adoption":["..."],
 "confidence":0.0-1.0}
