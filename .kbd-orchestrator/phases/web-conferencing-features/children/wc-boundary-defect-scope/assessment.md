# Assessment: wc-boundary-defect-scope

Parent: `web-conferencing-features`. Date: 2026-11-19. Candidate: `440156e2`.
Authority: operator, 2026-11-19: "use a child phase to assess the scope and size
set of potential problems so you find the best solution". Runtime decision:
`wc-defect-scope-sweep-authority`.

## Why this child exists

The parent's boundary used its three repairs on three defects, one per run:

1. r1: the generated Dart palette made `meterFill` required.
2. r2: the WC-7 spec used a Playwright fixture that does not exist.
3. r3: an older unit test failed against the rewritten fake.

Every run stopped at its first failure (the runner, then Turbo), so each run
showed one defect and hid the rest. This child measures the whole set once,
without changing code, so a single batched repair can address it.

## Method

- **Diagnostic sweep** (`evidence/sweep-2026-11-19/`). Each static gate runs
  to completion. Not boundary evidence, not a repair, changes no code.
- **Static seam scan** (read-only subagent). Looks for defects that lint,
  typecheck and unit tests cannot see but that break the later boundary steps:
  images, compose, the packaged Playwright run and the CSP header step. The lead
  re-checked findings 1–4 by reading the files.

## Results: static gates

| Gate | Result | Evidence |
|---|---|---|
| `pnpm lint` (8 rules) | PASS | `01.log` |
| `pnpm typecheck` (8 packages, web included) | PASS | `02.log`: 8/8 tasks pass. The exit 1 is the sweep's `--continue` flag reaching the trailing `tsc`, not a defect. |
| `pnpm test` (7 packages, 119 tests) | 1 FAIL | `03.log`: only `apps/web` `lazy-realtime-room.test.ts:51` |
| `pnpm build` (web, Rust, Flutter, iOS, Android) | PASS | `04b.log`, 938 s with `RUSTC_WRAPPER` unset; the first attempt hung 81 min in `cargo build -p bff` on sccache (D9) |
| `build:hosted` | PASS with input | `05b.log` fails without `KM_LIVEKIT_URL` (D8); `05c.log` passes with it set from `LIVEKIT_URL` (value redacted from the log) |

## Defect register

| # | Defect | Location | Breaks | Root cause class | Confidence | Fix size |
|---|---|---|---|---|---|---|
| D1 | Unit test expects 1 notification; the rewritten fake publishes during `connect` (5) | `apps/web/tests/unit/lazy-realtime-room.test.ts:67` | `pnpm test` | Stale test after a refactor (wc02 fake rewrite) | high on location, medium on cause (not run in isolation) | ~1–5 lines |
| D2 | Pin check regex also matches `prometheus_entity_management = "4.2.0"` | `tests/release/src/entity-graph-pins.ts:124-139`; `tooling/versions.toml:46` | packaged run, WC-11 `@smoke` | Test logic too broad | high (lead verified) | ~1 line |
| D3 | Lockfile check expects the spikes in the root lockfile (0 mentions); hybrid spike has no `-react` | `entity-graph-pins.ts:16-20, 85-100` | packaged run, WC-11 `@smoke` | Test assumes wrong workspace shape | high (lead verified) | ~15 lines |
| D4 | WC-10 header test runs packaged, but the packaged proxy sends no CSP | `tests/release/wc-10-web-csp.spec.ts:70`; `tooling/release/proxy/nginx-split.conf:3-4` | packaged run | Wrong tag (`@hosted-only` missing) | high (lead verified) | 1 line |
| D5 | Compose binds 8080/8081, both held on this host | `tooling/release/compose.yaml:26,68` | `docker compose up` | Environment fact (known since 2026-11-18, never applied) | high (lead verified) | ~2 lines plus 3 env inputs (`KM_SITE_ORIGIN`, `KM_RELEASE_BASE_URL`, `KM_RELEASE_STATIC_URL`) |
| D6 | Two packaged-only tests need a default-build server compose does not start | `tests/release/src/release-env.ts:26`; `wc-10:136`, `wc-11:76` | packaged run | Missing run-book input | medium | 0 lines (run-book step: `vite preview` of the default build, or `KM_RELEASE_DEFAULT_BUILD_URL`) |
| D7 | Committed gateway CSP header is stale | `infra/k8s/overlays/production/security-headers.yaml:15` | `render-gateway-headers.ts --check` | Planned work: task 6.4 renders it inside the run | high | regenerate; also supply `KM_RELEASE_CSP_FILE` and `KM_RELEASE_PREVIOUS_CSP_FILE` |

Run-time facts found by the sweep:

| # | Fact | Effect | Handling |
|---|---|---|---|
| D8 | `build:hosted` needs `KM_LIVEKIT_URL`; the contract run inputs never listed it | boundary step 6 fails | run input: set it from `LIVEKIT_URL` in the same shell, redact logs |
| D9 | the shared sccache hung `cargo build -p bff` for 81 min | boundary step 5 stalls with no error | run input: `RUSTC_WRAPPER` unset for `pnpm build` |

Lower risk, not counted:
- The screen-capture source name in headless Chromium is flagged ASSUMPTION in
  `browser-args.ts` (WC-1).
- Cross-engine projects must be named explicitly, and Firefox is not installed.

## Root cause

The defects are seams between new code and existing tests, harness and
environment. None is in the product features. Three things combine:

1. **VLBV: nothing executes before the boundary.** About 86 changed files meet
   the toolchain for the first time at once.
2. **Fail-fast at two levels.** The runner stops at the first failing step and
   Turbo at the first failing package, so one run reveals one defect.
3. **A budget sized for defects, spent on runs.** The plan set 3 repairs,
   although the web-release reflection recorded the same pattern (7 repairs,
   one tooling defect each).

## The uncomfortable part

The register covers what static reading and the static gates can see. No WC
scenario (screen share, chat, effects, devices, history, recording) has
executed. Behaviour failures can only appear in the packaged Playwright run,
and nothing here predicts them.

## Recommendation

Drafted as `../../amendment-1-proposal.md` with `../../amend-contract-1.jq`:

1. One batched repair for D1–D5 (one commit, about 25 lines).
2. Run inputs for D5–D9.
3. A runner change so static steps collect all failures before stopping.
4. One reserve repair for behaviour failures in the packaged run.
