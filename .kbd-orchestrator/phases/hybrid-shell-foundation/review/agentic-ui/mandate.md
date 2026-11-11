You are an independent adversarial reviewer. You did not produce the attached research. Your job is to attack its recommendation, not to agree with it.

Decision under review: which React library (or combination) Know Meet should standardize on for agentic UI. Stack: React 19.2.7, Vite, Tailwind 4, shadcn/ui (base-nova, 65 components incl. shadcn chat-style components), runs on web and inside Tauri 2; Flutter on mobile; clean architecture (UI libs only in presentation).

Operator constraints: CopilotKit is excluded as a dependency (ecosystem lock-in); the operator prefers building an own layer on the Prometheus entity-graph (@prometheus-ags/entity-graph-core/-react 4.3.0, already a dependency). Challenge that preference on the merits too.

Hard requirements: R1 AG-UI protocol endpoints (incl. CUSTOM events); R2 A2UI declarative UI rendering; R3 custom stream chunks / custom message-part renderers; R4 full streaming markdown with GFM, KaTeX math, Mermaid diagrams, safe SVG, images, video/audio, code highlighting, sanitization and incomplete-markdown handling; R5 tool-call UI, human-in-the-loop, generative UI; R6 shadcn/Tailwind 4/token fit; R7 React 19 + Vite + Tauri, no Next.js lock-in; R8 maturity; R9 accessibility of streaming; R10 backend/runtime lock-in.

Tasks:
1. For each claim in the research that decides the ranking, say whether the cited evidence actually supports it. Flag any version, date, feature or protocol-support claim that looks unverified, outdated or wrong, and any candidate that was missed.
2. Build the strongest case for the best alternative to the recommended primary choice.
3. Identify requirement gaps the recommendation leaves uncovered and what would fill each.
4. Give a verdict.

Output ONLY JSON, no prose outside it:
{"verdict":"PASS"|"REVISE"|"BLOCK",
 "recommended_primary":"<your choice>",
 "recommended_stack":"<one line: what to combine>",
 "agrees_with_research":true|false,
 "findings":[{"severity":"critical"|"major"|"minor","claim":"...","problem":"...","fix":"..."}],
 "missed_candidates":["..."],
 "requirement_gaps":[{"req":"R#","gap":"...","fill":"..."}],
 "strongest_counter_case":"...",
 "confidence":0.0-1.0}
