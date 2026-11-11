# Know Meet team — skill catalog

Source of truth for roles: `team.json` in this folder. This file records which
skills each role uses, where they come from, and which well-regarded skills are
not installed yet. Research date: 2026-11-09. Install counts are skills.sh
telemetry and approximate.

## Installed and bound

| Role | Skills |
|---|---|
| delivery-lead | kbd-process-orchestrator, kbd-plan, kbd-reflect, openspec-propose / apply-change / verify-change, value-scenario-discovery, value-scenario-verify, planning-and-task-breakdown, lean-build |
| architect | clean-architecture, domain-modeling, api-and-interface-design, codebase-design, typescript-base-patterns, documentation-and-adrs |
| build-platform | lean-build, ci-cd-and-automation, dependency-pin-discipline, performance-optimization, github-ops |
| bdd-quality | bdd-lifecycle-loop, bdd-testing, bdd-cucumber-js, playwright-bdd-configuration / step-definitions / gherkin-syntax, playwright-cli (Microsoft), webapp-testing (Anthropic), e2e-testing, bdd-video-proof, value-scenario-verify |
| design-lead | impeccable (pbakaus, 106k stars), ui-ux-pro-max (nextlevelbuilder, 147k stars), prometheus-ui-ux, frontend-design (Anthropic), design-system, better-accessibility, hybrid-design-tokens, reference-ui-fidelity |
| ui-engineer | shadcn (shadcn/ui official), impeccable, vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions, web-design-guidelines (all vercel-labs/agent-skills), better-accessibility, prometheus-ui-ux, frontend-ui-engineering |
| client-shell | tauri-react-vite, tauri-custom-titlebar, tauri-tray-app, tauri-ui-review, react-vite-stack, vercel-react-best-practices, hybrid-mobile-architecture |
| mobile-engineer | dart-flutter-patterns, flutter-build-responsive-layout, flutter-setup-declarative-routing, flutter-fix-layout-issues (flutter/agent-plugins), flutter-golden-ui, hybrid-design-tokens, hybrid-mobile-architecture |
| webrtc-engineer | context7-mcp, browser-testing-with-devtools, debugging-and-error-recovery, observability-and-instrumentation, performance-optimization |
| livekit-platform | security-and-hardening, api-and-interface-design, deployment-patterns, observability-and-instrumentation, context7-mcp |
| livekit-agents | python-patterns, python-testing, persona-scoped-agent, agent-runtime-security, context7-mcp |
| crdt-engineer | sync-doctrine, pem-local-first, entity-realtime-local-first, property-based-testing, context7-mcp |
| integrations-engineer | resend, email-best-practices, api-connector-builder, security-and-hardening, context7-mcp |
| security-reviewer | security-review, agent-runtime-security, differential-review, security-and-hardening |
| independent-reviewer | adversarial-review, code-review-and-quality, second-opinion, spec-to-code-compliance, prometheus-ui-review |

The team installer also binds `prometheus-ui-ux` / `prometheus-ui-review` as
conditional UI routers; backend work never loads them.

Impeccable is installed in this project with `impeccable install --project
--providers=claude,codex,opencode,agents` (skill v4.8.1, design hook in
`.claude/settings.local.json`). The design-lead still has to run
`/impeccable init` with the owner (an interview) and then `/impeccable document`.
Impeccable has no Kimi Code, Qwen or Zed provider; Qwen and Zed read
`.agents/skills/impeccable`, and Kimi roles use the fallback in their prompts.

## Recommended, not installed (delivery-lead approves via an OpenSpec change)

| For | Skill | Source | Install | Evidence |
|---|---|---|---|---|
| livekit-agents, livekit-platform | livekit/agent-skills (building, debugging, testing, operating livekit agents; writing scenarios; simulations; reading docs) + LiveKit Docs MCP | github.com/livekit/agent-skills (official) | `lk skills install` **or** `npx skills add livekit/agent-skills` — pick one, the README warns about double-loading | Official, pushed 2026-11-06, ~500 installs per skill |
| crdt-engineer | loro | github.com/loro-dev/loro `skills/loro` (official) | `npx skills add loro-dev/loro` | Official, tiny adoption |
| crdt-engineer | yjs-best-practices | github.com/liveblocks/skills | `npx skills add liveblocks/skills` | Vendor, 319 installs; Yjs maintainers publish none |
| build-platform | turborepo | github.com/vercel/turborepo (official) | `npx skills add vercel/turborepo` | 89k installs |
| build-platform (if ADR picks Nx) | nx-workspace, nx-run-tasks, nx-cloud-cache-investigator | github.com/nrwl/nx-ai-agents-config | `nx configure-ai-agents` | 88k installs |
| bdd-quality | playwright-bdd | github.com/vitalets/playwright-bdd (library author) | `npx skills add vitalets/playwright-bdd` | Official, 391 installs |
| bdd-quality, mobile-engineer | flutter-add-integration-test, flutter-apply-architecture-best-practices | github.com/flutter/agent-plugins (official) | see docs.flutter.dev/ai/get-started | 40k / 45k installs |
| ui-engineer | shadcn MCP | ui.shadcn.com/docs/mcp | `npx shadcn@latest mcp init --client claude` | Official |
| mobile-engineer | Dart MCP server | dart-lang | MCP: `dart mcp-server` | Official |
| ui-engineer | accessibility (web-quality-skills) | github.com/addyosmani/web-quality-skills | `npx skills add addyosmani/web-quality-skills` | 68k installs |

## Known gaps (no well-regarded skill exists)

- LiveKit egress, LiveKit SIP + Telnyx, general WebRTC (ICE/TURN, simulcast,
  webrtc-internals), Tauri (only small community skills), Rust build caching.
  Use the LiveKit Docs MCP (`https://docs.livekit.io/mcp`), Context7
  (`/livekit/client-sdk-js`, `/livekit/client-sdk-flutter`, `/websites/livekit_io`)
  and vendor `llms.txt`. Write in-house skills here if a gap keeps costing time.

## Harness coverage

| Harness | Role definitions | Notes |
|---|---|---|
| Claude Code | `.claude/agents/*.md` | Native subagents |
| Codex | `.codex/agents/*.toml` | Names use underscores (`ui_engineer`) |
| OpenCode | `.opencode/agents/*.md` | |
| Kimi Code | `.kimi-code/agents/*.md` | Per-role model frontmatter is ignored |
| DeepSeek harness | `.dsh/profiles/know-meet-team-*` | Experimental team; no per-member model |
| Qwen Code | `.qwen/agents/*.md` | Generated from `team.json` (no exporter); regenerate after manifest changes |
| MiniMax Code | `native/minimax/agents/*/agent.md` (staged) | Lives in the user data dir (`~/.minimax/agents/`); copy only with owner approval. `mcode exec` has no agent selector |
| Zed | none (no custom subagents) | Uses the routing block in `AGENTS.md` and runs roles sequentially; skills from `.agents/skills` |
