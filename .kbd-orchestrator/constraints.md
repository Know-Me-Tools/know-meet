# Know Meet — KBD Constraints

Project-specific rules for KBD verification. Derived from the generic KBD
template plus Know Meet conventions. The repository has no `AGENTS.md` yet, so
there is no "Never Do" section to import. Revisit this file when the hybrid
shell workspace adds one.

Build, test and lint commands are not defined yet (see `project.json`). Until
the hybrid shell phase sets them, `build-passes` and `no-lint-warnings` are
checked against the commands that phase introduces.

---

## Blocking constraints

```yaml
constraints:
  - id: no-livekit-secrets-in-repo
    severity: blocking
    description: 'LIVEKIT_API_SECRET / LIVEKIT_API_KEY values never appear in tracked files; they come from the shell environment only'
    check: "git grep --untracked -nE 'LIVEKIT_API_(SECRET|KEY)\\s*[:=]\\s*[\"\\x27]?[A-Za-z0-9]{16,}' -- . ':!*.md'"

  - id: no-hardcoded-secrets
    severity: blocking
    description: 'No hardcoded API keys, tokens or passwords in source'
    check: "git grep --untracked -nE '(sk-[A-Za-z0-9]{20,}|api_key\\s*=\\s*[\"\\x27][A-Za-z0-9]{12,})' -- apps packages docs/design/live"

  - id: token-secret-stays-server-side
    severity: blocking
    description: 'Browser, Tauri webview and Flutter client code never receive the LiveKit API secret; tokens are minted server-side'
    note: 'Manual review of any token / auth change'

  - id: design-tokens-single-source
    severity: blocking
    description: 'Brand colors, type and spacing come from the Know Meet design tokens (docs/design/tokens.css / tokens.json); no ad-hoc hex values in app UI code'
    note: 'Applies to React, Tauri and Flutter themes; Flutter theme must be generated from or mirror tokens.json'

  - id: reference-repo-read-only
    severity: blocking
    description: '/Users/gqadonis/Projects/hybrid-mobile-architecture-src is a read-only reference; never write to it from this project'

  - id: max-500-lines-per-file
    severity: blocking
    description: 'No authored file exceeds 500 lines in any language; oversized files become a feature directory split by clean-architecture layer (see AGENTS.md)'
    exceptions: 'lockfiles; generated code (*.g.dart, *.freezed.dart, routeTree.gen.ts, frb output, src-tauri/gen/**); vendored code (**/vendor/**); native platform project files; test fixtures/goldens; root live/** (temporary operator exception, 2026-11-09); tool-generated AI-harness skill/command files under .agents|.claude|.codex|.dsh|.kimi-code|.opencode|.qwen|.zed; docs/design/prototype/** and docs/design/live/** (E-L6, operator 2026-11-09); .kbd-orchestrator KBD state (*.json, *.jsonl, *.sig, review/**/raw-*.txt) and .agent-team generated team.json/state.json (operator 2026-11-09); CHANGELOG.md'
    note: 'Checker script to be added to lint, pre-commit and CI in this phase'

  - id: kebab-case-file-names
    severity: blocking
    description: 'File and directory names are kebab-case'
    exceptions: 'Dart *.dart lower_snake_case; Rust module files snake_case; tool-mandated names (README.md, LICENSE, CHANGELOG.md, AGENTS.md, CLAUDE.md, Cargo.toml, build.rs, main.rs, lib.rs, mod.rs, pubspec.yaml, package.json, tsconfig*.json, vite.config.ts, components.json, tauri.conf.json, Dockerfile, dotfiles); native platform scaffolding; generator-owned names; tool-generated AI-harness files (SKILL.md, command files, .openspec-target) under harness dot-directories'

  - id: no-any-type
    severity: blocking
    description: 'No `any` type in TypeScript source'
    check: "git grep -nE ':\\s*any\\b' -- '*.ts' '*.tsx'"

  - id: build-passes
    severity: blocking
    description: 'Project build must pass without errors'
    command: '<see .kbd-orchestrator/project.json build_health_command>'
```

---

## Warning constraints

```yaml
  - id: design-prototype-fidelity
    severity: warning
    description: 'Shell UI matches the reference prototype (docs/design/prototype, docs/design/live) in look, feel and both themes'
    note: 'Visual comparison at 375 / 768 / 1024 / 1440 in light and dark'

  - id: shadcn-components-not-forked-ad-hoc
    severity: warning
    description: 'UI primitives come from the shared shadcn/ui component set themed with Know Meet tokens, not one-off copies per app'

  - id: clean-architecture-boundaries
    severity: warning
    description: 'Domain and application layers do not import UI, Tauri, Flutter or LiveKit SDK code; adapters live at the edge'

  - id: no-console-log-in-commits
    severity: warning
    description: 'No console.log in committed TypeScript/JavaScript application code'
    check: "git grep -n 'console\\.log' -- '*.ts' '*.tsx'"

  - id: tests-for-new-features
    severity: warning
    description: 'Tests exist for new features added in a change'

  - id: no-stub-comments
    severity: warning
    description: 'No TODO/FIXME/STUB/HACK comments in committed code'

  - id: accessibility-basics
    severity: warning
    description: 'New UI has semantic HTML or accessible names, visible focus, and reduced-motion support'
```

## Path ownership

- `docs/design/prototype/` and `docs/design/live/` are design references. Shell
  work reads them; changes there are design changes, not shell changes.
- `live/` at the repo root is a stale duplicate of `docs/design/live/`. It is
  pending removal and must not be used as a source.
