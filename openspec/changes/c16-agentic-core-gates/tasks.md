## 16. Agentic-core gates (O)

- [ ] 16.1 Replace sole reliance on requestAnimationFrame for publishing; pass focused, unfocused, occluded and minimised WKWebView window states with bounded p95 latency; Windows WebView2 run
- [ ] 16.2 entity-graph hardening upstream (atomic batched transactions without whole-graph copy, render-only live layer, lossless ordered AG-UI bridge, no devtools in production) and restart/hydration tests
- [ ] 16.3 Re-measure O and H interleaved with non-profiling production builds to render-complete (long tasks, CPU, dropped frames, input latency, long-session memory)
- [ ] 16.4 Run the full A2UI and a11y suites inside Tauri with trusted keyboard input and record a real VoiceOver pass
- [ ] 16.5 Streamdown origin and scheme allowlists in O and the apps/web CSP fix (img-src/media-src for allowed media origins, KaTeX font)
- [ ] 16.6 Produce one normalised work breakdown and first-year cost for O and H with identical scope
- [ ] 16.7 Write the end-to-end Flutter agentic-UI plan (AG-UI transport incl. evaluating community ag_ui, HITL, reconnect, markdown, A2UI)
