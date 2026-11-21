# Plan tasks: web-conferencing-features

Part of [plan.md](plan.md), split out to keep each file under the 500-line project limit. This file holds the task list, the scenario list and the single Task model assignments table for the phase.

## Tasks

Backend task IDs are OpenSpec task ordinals. The full key is the phase path
`web-conferencing-features`, the change ID and the task ID.

| Change | Task | Title | Role | Scenarios |
|---|---|---|---|---|
| wc01 | 1.1 | Write conferencing value scenarios and spec skeletons | bdd-quality | WC-1 to WC-8, WC-10 to WC-12, WC-14 |
| wc01 | 1.2 | Define consent and on-device privacy negative controls | bdd-quality | WC-7, WC-8, WC-9 |
| wc01 | 1.3 | Shape the four new surfaces and define accessibility acceptance | design-lead | WC-4 to WC-8, WC-13 |
| wc01 | 1.4 | Create the phase worktree from main and install it | delivery-lead | none |
| wc01 | 1.5 | Collect pins and operator prerequisites | build-platform | WC-11 |
| wc01 | 1.6 | Add the adopted libraries to the web app and install them | client-shell | WC-4, WC-7, WC-8 |
| wc02 | 2.1 | Add conferencing domain types | architect | WC-2, WC-3, WC-5, WC-8 |
| wc02 | 2.2 | Extend the RealtimeRoom port and its fakes | architect | WC-1 to WC-6, WC-12 |
| wc02 | 2.3 | Carry lobby device choice through the join use case | architect | WC-5 |
| wc02 | 2.4 | Add recording consent use cases | architect | WC-8, WC-9 |
| wc03 | 3.1 | Split the LiveKit adapter into a feature directory | webrtc-engineer | WC-14 |
| wc03 | 3.2 | Implement screen share | webrtc-engineer | WC-1 |
| wc03 | 3.3 | Implement text streams for chat and consent | webrtc-engineer | WC-2, WC-3, WC-8, WC-9 |
| wc03 | 3.4 | Implement devices, output gating and audio start | webrtc-engineer | WC-5, WC-6, WC-12 |
| wc03 | 3.5 | Implement the video processor hook | webrtc-engineer | WC-4 |
| wc04 | 4.1 | Add the screen share control and tile | ui-engineer | WC-1, WC-13 |
| wc04 | 4.2 | Build the chat panel with explicit audience | ui-engineer | WC-2, WC-3, WC-13 |
| wc04 | 4.3 | Add the Enable audio prompt | ui-engineer | WC-12, WC-13 |
| wc05 | 5.1 | Add lobby device pickers, level meter and preview | ui-engineer | WC-5, WC-13 |
| wc05 | 5.2 | Add in-room device settings with speaker selection | ui-engineer | WC-5, WC-6, WC-13 |
| wc06 | 6.1 | Add the hosted-only directives and the desktop guard | client-shell | WC-10 |
| wc06 | 6.2 | Update the CSP unit and artifact tests | client-shell | WC-10 |
| wc06 | 6.3 | Update the TLS and headers feature | bdd-quality | WC-10 |
| wc06 | 6.4 | Regenerate the gateway security header | livekit-platform | WC-10 (runs inside boundary step 1) |
| wc07 | 7.1 | Self-host the segmentation assets | client-shell | WC-4, WC-10 |
| wc07 | 7.2 | Implement the background processor adapter | webrtc-engineer | WC-4 |
| wc07 | 7.3 | Build the background effects picker | ui-engineer | WC-4, WC-13 |
| wc08 | 8.1 | Confirm 5.0.1 is latest on npm and pin it | build-platform | WC-11 |
| wc08 | 8.2 | Bump the web app to 5.0.1 | client-shell | WC-11 |
| wc08 | 8.3 | Bump the own spike to 5.0.1 | architect | WC-11 |
| wc08 | 8.4 | Bump the hybrid spike to 5.0.1 | ui-engineer | WC-11 |
| wc08 | 8.5 | Refresh the lockfile with a clean install | build-platform | WC-11, WC-14 |
| wc09 | 9.1 | Add the HistoryRepository port and history entities | architect | WC-7 |
| wc09 | 9.2 | Add the PGlite leader worker, schema and repository adapter | client-shell | WC-7, WC-10 |
| wc09 | 9.3 | Register history transports and record meetings and chats | client-shell | WC-7 |
| wc09 | 9.4 | Build the history screen with delete | ui-engineer | WC-7, WC-13 |
| wc10 | 10.1 | Build the composite recorder | client-shell | WC-8 |
| wc10 | 10.2 | Add the OPFS writer worker with quota handling | client-shell | WC-8, WC-10 |
| wc10 | 10.3 | Wire consent use cases to the room and the recorder | client-shell | WC-8, WC-9 |
| wc10 | 10.4 | Add consent prompts and the recording indicator | ui-engineer | WC-8, WC-9, WC-13 |
| wc10 | 10.5 | Build the recordings library and playback | ui-engineer | WC-8, WC-10, WC-13 |
| wc11 | 11.1 | Run static gates and repository rules | bdd-quality | WC-10, WC-14 |
| wc11 | 11.2 | Run the packaged scenarios against the built web image | bdd-quality | WC-1 to WC-9, WC-11, WC-12 |
| wc11 | 11.3 | Run accessibility, UI review and security review | independent-reviewer | WC-13, WC-10 |
| wc11 | 11.4 | Publish through continuous deployment and confirm the digest | delivery-lead | WC-10 |
| wc11 | 11.5 | Run the hosted scenarios at the public URL | bdd-quality | WC-1 to WC-5, WC-7, WC-8, WC-10, WC-12 |
| wc11 | 11.6 | Update the README and release notes to match what shipped | delivery-lead | none |

Scenarios (draft contract). WC-1 to WC-11 come from the assessment; WC-11 is
restated for 5.0.1. WC-12 to WC-14 are proposed in this plan.

| ID | Scenario |
|---|---|
| WC-1 | A participant shares a tab; the other sees it; stopping ends it cleanly |
| WC-2 | A message to everyone reaches every participant, labelled "Everyone" |
| WC-3 | A private message reaches only its recipient, labelled private |
| WC-4 | Blur, then an image background, shows remotely; off restores the camera |
| WC-5 | Chosen microphone and camera from lobby and room are the ones used, with level and preview |
| WC-6 | Speaker choice works where supported and is explained where not |
| WC-7 | After a reload, history lists the meeting and its chat from PGlite; no request carries it |
| WC-8 | Consented recording runs with an indicator for everyone, saves locally, plays back |
| WC-9 | A declined consent means no recording starts |
| WC-10 | The hosted page serves the new web CSP; WASM, workers and blob playback work; desktop policy unchanged; nothing else widened |
| WC-11 | The web app and spikes resolve entity graph 5.0.1 from npm; notes still work |
| WC-12 | When autoplay is blocked, "Enable audio" appears and one click starts remote audio |
| WC-13 | Every new control meets WCAG 2.2 AA, flat 2.0, keyboard and reduced motion, and matches the approved shapes |
| WC-14 | Repository rules hold (500 lines, kebab-case, boundaries) and the desktop and mobile shells still build |

Every scenario has a defining task in wc01, at least one building task and a
verifying task in wc11. The contract's `ownerTask` fields hold the map.

## Task model assignments

All rows are dated 2026-11-18. This session's Agent tool lists the team roles
as subagent types and accepts the model overrides `sonnet`, `opus`, `haiku` and
`fable`. The same routes were exercised in `web-release` (2026-11-15 to 16).
For this phase they are **configured, not re-verified**. No benchmark on this
repo compares the models. Each row's rationale rests on what the task demands.
Reasoning effort stays at the harness default, because the Agent tool sets
effort only on explicit instruction.

Routes:
- **R-O:** a Claude Code native subagent of the named role, on
  `claude-opus-5-5`. Alternative: the same role on `claude-sonnet-5-5`.
- **R-S:** a Claude Code native subagent of the named role, on
  `claude-sonnet-5-5`. Alternative: the same role on `claude-opus-5-5`.
- **R-L:** the lead session (`claude-opus-5-5`) acting as delivery-lead, with
  no subagent.
- **R-J:** independent review through the liter-llm gateway
  (`$LITER_LLM_BASE_URL`, chat completions), judge `glm-5.3`. Verified for
  artifact review in this phase's assess and analyze stages. The review
  scripts and the curl call are the launcher. An inference response is not
  workspace execution.

Worker contract for R-O and R-S:
- **Scope:** the task's files, inside the role's own paths.
- **Working directory:** the phase worktree.
- **Skills:** those CLAUDE.md requires for the file types touched (impeccable
  and `prometheus-ui-ux` for UI; the Vercel React skills and
  `typescript-base-patterns` for TypeScript).
- **Result:** the changed files plus a report, returned to the lead. The lead
  owns task completion.

| Phase path | Change ID | Backend task ID | Requirements | Provider/model | Reasoning effort | Rationale and dated evidence | Harness and route | Worker launch and handoff | Native alternative | Availability and verification | Prerequisites |
|---|---|---|---|---|---|---|---|---|---|---|---|
| web-conferencing-features | wc01-conferencing-scenarios | 1.1 | Acceptance design, high ambiguity | Anthropic claude-opus-5-5 | default | Scenarios decide done | Claude Code, R-O | bdd-quality | sonnet | configured | none |
| web-conferencing-features | wc01-conferencing-scenarios | 1.2 | Negative controls must discriminate | Anthropic claude-opus-5-5 | default | Privacy claim needs a real oracle | Claude Code, R-O | bdd-quality | sonnet | configured | none |
| web-conferencing-features | wc01-conferencing-scenarios | 1.3 | Design judgement, images | Anthropic claude-opus-5-5 | default | Impeccable shape, prototype reading | Claude Code, R-O | design-lead | sonnet | configured | impeccable context |
| web-conferencing-features | wc01-conferencing-scenarios | 1.4 | Git and install | Anthropic claude-opus-5-5 | default | Lead holds the dirty-tree context | Claude Code, R-L | lead session | none | verified (in use) | batch 1 approval |
| web-conferencing-features | wc01-conferencing-scenarios | 1.5 | Lookup and listing | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | build-platform | opus | configured | none |
| web-conferencing-features | wc01-conferencing-scenarios | 1.6 | Manifest edit, pnpm install | Anthropic claude-sonnet-5-5 | default | Mechanical; versions fixed by batch 1 | Claude Code, R-S | client-shell (install updates the build-platform lockfile as a tool side effect) | opus | configured | batch 1 approval, task 1.5 pins |
| web-conferencing-features | wc02-conferencing-ports | 2.1 | Domain modelling | Anthropic claude-opus-5-5 | default | Types constrain every later change | Claude Code, R-O | architect | sonnet | configured | none |
| web-conferencing-features | wc02-conferencing-ports | 2.2 | Interface design | Anthropic claude-opus-5-5 | default | Port must fit LiveKit without importing it | Claude Code, R-O | architect | sonnet | configured | none |
| web-conferencing-features | wc02-conferencing-ports | 2.3 | Use case edit, small | Anthropic claude-sonnet-5-5 | default | Bounded change | Claude Code, R-S | architect | opus | configured | none |
| web-conferencing-features | wc02-conferencing-ports | 2.4 | Protocol design | Anthropic claude-opus-5-5 | default | Consent errors break principle 4 | Claude Code, R-O | architect | sonnet | configured | contract decision 2 |
| web-conferencing-features | wc03-realtime-adapter-features | 3.1 | Refactor, behaviour-preserving | Anthropic claude-opus-5-5 | default | Live adapter, no test until boundary | Claude Code, R-O | webrtc-engineer | sonnet | configured | none |
| web-conferencing-features | wc03-realtime-adapter-features | 3.2 | WebRTC | Anthropic claude-opus-5-5 | default | Track lifecycle edge cases | Claude Code, R-O | webrtc-engineer | sonnet | configured | none |
| web-conferencing-features | wc03-realtime-adapter-features | 3.3 | Async streams | Anthropic claude-opus-5-5 | default | Audience routing is a privacy boundary | Claude Code, R-O | webrtc-engineer | sonnet | configured | none |
| web-conferencing-features | wc03-realtime-adapter-features | 3.4 | Browser capability gating | Anthropic claude-opus-5-5 | default | `setSinkId` and autoplay differ by engine | Claude Code, R-O | webrtc-engineer | sonnet | configured | none |
| web-conferencing-features | wc03-realtime-adapter-features | 3.5 | Track replacement | Anthropic claude-sonnet-5-5 | default | Small hook | Claude Code, R-S | webrtc-engineer | opus | configured | none |
| web-conferencing-features | wc04-share-and-chat-ui | 4.1 | React, design fidelity | Anthropic claude-opus-5-5 | default | Prototype match | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-conferencing-features | wc04-share-and-chat-ui | 4.2 | React, audience clarity | Anthropic claude-opus-5-5 | default | Principle 3, audiences explicit | Claude Code, R-O | ui-engineer | sonnet | configured | impeccable |
| web-conferencing-features | wc04-share-and-chat-ui | 4.3 | Small UI state | Anthropic claude-sonnet-5-5 | default | Bounded | Claude Code, R-S | ui-engineer | opus | configured | impeccable |
| web-conferencing-features | wc05-device-settings | 5.1 | React, media permissions | Anthropic claude-opus-5-5 | default | Permission and device states | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc05-device-settings | 5.2 | React, capability gating | Anthropic claude-opus-5-5 | default | Explaining unsupported controls | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc06-web-csp | 6.1 | Security-sensitive build script | Anthropic claude-opus-5-5 | default | Must not change desktop | Claude Code, R-O | client-shell | sonnet | configured | security review findings |
| web-conferencing-features | wc06-web-csp | 6.2 | Test edits | Anthropic claude-sonnet-5-5 | default | Mechanical against 6.1 | Claude Code, R-S | client-shell | opus | configured | 6.1 |
| web-conferencing-features | wc06-web-csp | 6.3 | Gherkin edit | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | bdd-quality | opus | configured | 6.1 |
| web-conferencing-features | wc06-web-csp | 6.4 | Generated header | Anthropic claude-sonnet-5-5 | default | Generated from the artifact | Claude Code, R-S | livekit-platform | opus | configured | 6.1 |
| web-conferencing-features | wc07-background-effects | 7.1 | Asset pipeline | Anthropic claude-sonnet-5-5 | default | Copy step and pinned files | Claude Code, R-S | client-shell | opus | configured | 1.6 |
| web-conferencing-features | wc07-background-effects | 7.2 | Library integration | Anthropic claude-opus-5-5 | default | Lazy load, support check, reapply | Claude Code, R-O | webrtc-engineer | sonnet | configured | 3.5, 7.1, 1.6 |
| web-conferencing-features | wc07-background-effects | 7.3 | React, design | Anthropic claude-opus-5-5 | default | New surface from approved shape | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc08-entity-graph-5-0-1 | 8.1 | Registry check, pin edit | Anthropic claude-sonnet-5-5 | default | Mechanical with a stop rule | Claude Code, R-S | build-platform | opus | configured | 5.0.1 on npm as latest |
| web-conferencing-features | wc08-entity-graph-5-0-1 | 8.2 | Manifest bump | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | client-shell | opus | configured | 8.1 |
| web-conferencing-features | wc08-entity-graph-5-0-1 | 8.3 | Manifest bump on an AG-UI spike | Anthropic claude-sonnet-5-5 | default | Already on @ag-ui/core 1.0.4; checks peer range | Claude Code, R-S | architect | opus | configured | 8.1 
| web-conferencing-features | wc08-entity-graph-5-0-1 | 8.4 | Manifest bump | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | ui-engineer | opus | configured | 8.1 |
| web-conferencing-features | wc08-entity-graph-5-0-1 | 8.5 | Install, lockfile | Anthropic claude-sonnet-5-5 | default | Mechanical | Claude Code, R-S | build-platform | opus | configured | 8.2 to 8.4, batch 1 |
| web-conferencing-features | wc09-local-history | 9.1 | Interface design | Anthropic claude-opus-5-5 | default | Port shape outlives PGlite | Claude Code, R-O | architect | sonnet | configured | none |
| web-conferencing-features | wc09-local-history | 9.2 | Workers, WASM, SQL, Vite config | Anthropic claude-opus-5-5 | default | Leader election, multi-tab, same-origin asset emission | Claude Code, R-O | client-shell | sonnet | configured | 6.1, 1.6 |
| web-conferencing-features | wc09-local-history | 9.3 | Entity graph wiring | Anthropic claude-opus-5-5 | default | ListQuery fidelity, live queries | Claude Code, R-O | client-shell | sonnet | configured | 8.5 |
| web-conferencing-features | wc09-local-history | 9.4 | React, design | Anthropic claude-opus-5-5 | default | New surface | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc10-local-recording | 10.1 | Media pipeline | Anthropic claude-opus-5-5 | default | Hardest new code in the phase | Claude Code, R-O | client-shell | sonnet | configured | 3.2 to 3.4 |
| web-conferencing-features | wc10-local-recording | 10.2 | Worker, OPFS | Anthropic claude-opus-5-5 | default | Engine differences, quota | Claude Code, R-O | client-shell | sonnet | configured | none |
| web-conferencing-features | wc10-local-recording | 10.3 | State machine wiring | Anthropic claude-opus-5-5 | default | Consent cannot be bypassed | Claude Code, R-O | client-shell | sonnet | configured | 2.4, 3.3 |
| web-conferencing-features | wc10-local-recording | 10.4 | React, consent UX | Anthropic claude-opus-5-5 | default | Principle 4 surface | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc10-local-recording | 10.5 | React, playback | Anthropic claude-opus-5-5 | default | New surface | Claude Code, R-O | ui-engineer | sonnet | configured | batch 2 |
| web-conferencing-features | wc11-conferencing-boundary | 11.1 | Running commands, triage | Anthropic claude-opus-5-5 | default | First contact with untested code | Claude Code, R-O | bdd-quality | sonnet | configured | batch 3 step 1 |
| web-conferencing-features | wc11-conferencing-boundary | 11.2 | Integration debugging | Anthropic claude-opus-5-5 | default | Failures cross five components | Claude Code, R-O | bdd-quality | sonnet | configured | Docker, LIVEKIT_ env in shell |
| web-conferencing-features | wc11-conferencing-boundary | 11.3 | Independent review | glm-5.3 via liter-llm, plus role reviewers | unsupported | Must not be the producer | R-J, plus R-O security-reviewer and independent-reviewer | review scripts; findings files | opus reviewer in a fresh context | gateway verified 2026-11-18 | gateway running |
| web-conferencing-features | wc11-conferencing-boundary | 11.4 | Git, PR, deploy watch | Anthropic claude-opus-5-5 | default | Approval-gated | Claude Code, R-L | lead session | none | verified (in use) | batch 3 step 2 |
| web-conferencing-features | wc11-conferencing-boundary | 11.5 | Running tests, triage | Anthropic claude-opus-5-5 | default | Hosted failures need diagnosis | Claude Code, R-O | bdd-quality | sonnet | configured | 11.4 |
| web-conferencing-features | wc11-conferencing-boundary | 11.6 | Writing | Anthropic claude-opus-5-5 | default | Product-truth statement | Claude Code, R-L | lead session | none | verified (in use) | 11.5 |

