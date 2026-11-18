## Why

The phase runs under VLBV: acceptance must exist before any production code. The work also needs a clean base and observed cluster facts.

## What Changes

- Gherkin scenarios WR-1 to WR-9 in `features/` and Playwright spec skeletons in `tests/release/` with `packaged` and `hosted` projects
- A clean branch from `main` in a separate worktree; the existing checkout is left untouched
- A list of dependency pins for the operator to add to `versions.toml`
- A read-only check of every fact in `cluster-context.md`, with what was observed recorded beside it

## Capabilities

### New Capabilities

- `release-acceptance`: Release acceptance is defined before production code

### Modified Capabilities

- None

## Impact

- Owner roles: `bdd-quality`, `design-lead`, `delivery-lead`, `build-platform`, `livekit-platform`. Operator batch 1 (pins, `gcloud auth login`) is needed for tasks 1.4 to 1.6.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
