## CRITICAL

**C1. Harness portability is asserted, not designed.**
Why: 8 harnesses required; research confirms Zed has no subagents, Qwen needs `.qwen/agents/*.md`, and the tier/dependsOn/skills model assumes a Claude-Code-style subagent runtime. No role owns per-harness role sync (`.claude/agents/**`, `.qwen/agents/**`, `.agents/**`) or a portability matrix.
Fix: assign harness-sync ownership (build-platform or a new meta role); emit role files per harness; define a degraded mode (single primary agent reading role prompts) for Zed.

**C2. Impeccable is a hard gate but unsupported on Kimi Code.**
Why: design-lead/ui-engineer prompts mandate `npx impeccable install`, `/impeccable init`, `audit` before handoff; the shared suffix requires evidence to be "done." On Kimi Code the gate can't run, so either work stalls or the gate is silently skipped.
Fix: route Impeccable CLI steps to supported harnesses; define an explicit fallback (ui-ux-pro-max audit + written checklist + prototype diff screenshots) when the CLI is unavailable.

**C3. Unowned paths in the priority-1 phase.**
Why: current phase generates the web shell, but nobody owns `apps/web/src` files outside `app/`, `infrastructure/`, `presentation/` (main.tsx, styles/globals.css, Tailwind v4 theme wiring, routes, generated shell leftovers). Either ownership enforcement blocks generation or files rot unowned.
Fix: client-shell owns `apps/web/src/**` with a presentation carve-out for ui-engineer; mark generated files and define regen ownership.

**C4. Product features with no owner: email/SMS summary delivery and calendar integrations.**
Why: listed in CONTEXT; no role prompt or skill covers notification providers or calendar OAuth/sync. `services/**` nominally belongs to livekit-platform, whose prompt is LiveKit-only.
Fix: add an integrations owner (or explicitly extend livekit-platform's prompt + skills) before the phase that ships summaries.

**C5. Cross-language domain contract has no owner.**
Why: domain is TS; mobile "mirrors" it in Dart; Python agents consume Transcript/MeetingMemory via CRDT. No shared contract package, no codegen, no Dart-side boundary enforcement (dependency-cruiser is TS-only). Three-language drift on the core data model is near-certain.
Fix: architect ADR must name a schema source of truth (e.g., generated TS/Dart/Python types from one schema) and assign ownership of a `packages/contracts`-style package; add Dart boundary lint owner.

**C6. Prompt violates the team's own ownership invariant.**
Why: livekit-platform is told to "replace docs/design/live/server.mjs" — that path is owned by design-lead. "Work only in owned paths" is a shared hard rule; the spec self-contradicts.
Fix: carve `docs/design/live/**` out to livekit-platform, or delivery-lead moves the prototype server into `services/` as an OpenSpec change.

## WARNING

**W1. Over-staffed for the current phase.**
Why: hybrid-shell-foundation needs delivery-lead, architect, build-platform, design-lead, ui-engineer, client-shell, mobile-engineer (+ reviewers). livekit-agents, crdt-engineer, webrtc-engineer, livekit-platform, security-reviewer are defined as active with no dormancy mechanism — invites premature ADRs and speculative work.
Fix: encode a per-phase roster; park backend roles until their phases.

**W2. webrtc-engineer's owned path is inside mobile-engineer's.**
Why: `apps/mobile/lib/infrastructure/realtime/**` ⊂ `apps/mobile/lib/**`; both are told to generate/maintain shell from hybrid-mobile-architecture — regeneration will clobber the realtime adapter.
Fix: exclude the subpath from regen templates or define an explicit regen protocol + merge owner.

**W3. Sequencing inconsistencies.**
Why: ui-engineer and mobile-engineer need build-platform's toolchain (shadcn CLI, Tailwind, Flutter caching, workspace) but don't depend on it, while client-shell does; bdd-quality depends only on delivery-lead but its step defs require architect's use cases and existing app scaffolds; architect's lint enforcement depends on build-platform, which depends on architect (soft cycle).
Fix: add deps ui-engineer→build-platform, mobile-engineer→build-platform, bdd-quality→architect/client-shell/mobile-engineer; split lint wiring into a follow-up change owned by build-platform with architect as acceptor.

**W4. BDD gating is hollow for server-side value scenarios.**
Why: no harness or step-definition owner for egress (S3→IPFS), Telnyx SIP PIN dial-in, or email/SMS delivery. Those scenarios can't go red→green, so phase gating either skips them or gets gamed.
Fix: extend bdd-quality or livekit-platform with an integration-test harness (Telnyx sandbox numbers, LiveKit Cloud egress smoke) as a prerequisite of the relevant phase.

**W5. Monorepo ADR is pre-empted.**
Why: architect owns the "monorepo tool" ADR, but build-platform's prompt and owned files hardcode pnpm+Turborepo before the ADR exists.
Fix: state Turborepo as the default hypothesis in the ADR input, or move the decision to build-platform and cut it from architect's ADR list.

**W6. Cross-model review degrades silently.**
Why: independent-reviewer's adversarial-review presumes cross-model judging; on single-model harnesses (DeepSeek-only, Zed) that's impossible and the guarantee quietly evaporates.
Fix: define minimum fallback (fresh context + adversarial persona) and prefer routing reviews to multi-model harnesses.

**W7. build-platform configures paths it doesn't own.**
Why: owns "uv for Python agents" and Flutter build caching but no files under `agents/**` or mobile build configs — every wiring edit crosses owned paths.
Fix: explicit carve-outs (agents tooling files, mobile build config) into its owns, or consult-only mode with owners applying PRs.

**W8. Weak skill binding where official skills exist uninstalled.**
Why: bdd-quality binds three community playwright-bdd skills (conflicting guidance risk; official exists); crdt-engineer and livekit-agents rely solely on context7 while the official Loro/yjs-best-practices and livekit/agent-skills exist uninstalled.
Fix: install the official skills (cheap) and pin guidance precedence; note Loro skill's tiny adoption in the ADR.

## SUGGESTION

**S1.** Nobody owns repo meta (`README`, `AGENTS.md`/`CLAUDE.md`, `.agent-team/**` role definitions beyond reviews). Assign it.
**S2.** `infra/**` outside `infra/livekit` (S3/IAM, IPFS pinning) unowned — give livekit-platform `infra/**`.
**S3.** Golden tests: specify pinned fonts (Ahem) and CI image, or golden flakes will fight the 20% warm-build gate.
**S4.** Make security-reviewer a required check (dependsOn or checklist) on livekit-platform/livekit-agents/crdt changes, not just delivery-lead-adjacent.

## VERDICT

**FAIL** — Six criticals: harness portability and Impeccable gating break on required harnesses now; priority-1 shell files land in unowned paths; two product feature areas have no owner; the tri-language domain has no contract owner; and one role prompt violates the team's own ownership invariant. Architecture and role decomposition are otherwise coherent — fix C1–C6 (mostly cheap ownership/portability edits) and re-review.
