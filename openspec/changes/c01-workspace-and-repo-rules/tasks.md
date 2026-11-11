## 1. Workspace and repo rules

- [x] 1.1 Create the pnpm workspace root, tsconfig base and turbo pipeline
- [x] 1.2 Check in tooling/versions.toml from the reference package with its digest and derive rust-toolchain, engines and packageManager pins
- [x] 1.3 Configure Biome (noExplicitAny, import rules), ls-lint with E-N exceptions, the line-count checker with E-L exceptions, and the hex-colour scan, each with negative fixtures
- [x] 1.4 Add lint, typecheck, test and build scripts including secret scans and zero-warning flags, a pre-commit hook and CI
- [x] 1.5 Install and verify every pinned tool and knowme-builder alpha.5; block c05 and c06 on any mismatch
- [x] 1.6 Delete the stale root live/ folder or record the operator-approved temporary exception (operator decision required)

Task model assignments: see `.kbd-orchestrator/phases/hybrid-shell-foundation/plan.md` → TASK MODEL ASSIGNMENTS, rows keyed `hybrid-shell-foundation / c01 / <task id>`. Contract: `adopted-contract.json` sha256 f91e7c30…
