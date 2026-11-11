## 15. Agentic-UI spike (hybrid vs own)

- [x] 15.1 Build the shared harness: mock AG-UI SSE endpoint with a golden event corpus (all event types incl. CUSTOM, tool calls, HITL approve/reject/expire, cancel, reconnect/replay), A2UI golden surfaces, hostile markdown/media corpus, streaming a11y checks and a measurement script
- [x] 15.2 Build prototype H (assistant-ui AG-UI runtime behind a presentation port, entity-graph checkpoints/journal, Streamdown, shadcn AI Elements patterns)
- [x] 15.3 Build prototype O (own AG-UI reducer on entity-graph, Streamdown, shadcn AI Elements patterns)
- [x] 15.4 Run the A2UI golden surfaces through @a2ui/react and a2ui_flutter and record parity
- [x] 15.5 Run both prototypes against the harness in a Vite production build and inside Tauri (WebKit), recording conformance, latency, renders, memory, bundle size, hostile-corpus and a11y results
- [x] 15.6 Write the comparison report, run the cross-model adversarial review and record the operator decision
