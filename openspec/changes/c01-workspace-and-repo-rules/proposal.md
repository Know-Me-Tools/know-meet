## Why

No workspace or enforcement exists, and the operator's kebab-case, 500-line, no-`any`, no-ad-hoc-colour and secret rules must hold from the first commit.

## What Changes

- pnpm workspace (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json`)
- `tooling/versions.toml` copied from the reference package with digest; derived pins (tauri-cli 2.11.4 included)
- Biome, ls-lint, line-count checker, hex-colour scan, dependency-direction rules, secret scans, zero-warning settings
- lint/typecheck/test/build scripts, pre-commit hook, CI
- Root `live/` removal or explicit exception (operator decision pending)

## Capabilities

### New Capabilities

- `repo-rules`: The repository rejects rule violations

### Modified Capabilities

- None

## Impact

- Owner role: `build-platform` (`.agent-team/know-meet-team`)
- Phase: `hybrid-shell-foundation`; plan: `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md`
