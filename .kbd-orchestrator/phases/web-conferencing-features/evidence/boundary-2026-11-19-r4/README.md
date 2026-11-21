# Boundary run r4 — 2026-11-19

Contract: amendment 1, digest `7062a5d7…` (decision `contract-adoption-web-conferencing-features-7062a5d7`).
Candidate: `aea6d789` (repair 4 of 5, batched fix for D1–D5) for the static steps; `72e2a1d8` (task 6.4, the regenerated gateway header only) from step 7 on.
Runner: scratchpad `run-boundary-steps.mjs`. Argv, exit codes and timing: `argv-and-exit.json`. Static steps ran in run-to-completion mode (`KM_STATIC_CONTINUE=1`, Turbo `--continue`) per `boundaryPacket.staticGateMode`.
Run inputs per amendment 1:
- `RUSTC_WRAPPER` unset.
- `KM_LIVEKIT_URL` set from `LIVEKIT_URL`; every log is redacted of it.
- Compose on `KM_PROXY_PORT=18080` and `KM_STATIC_PORT=18081` (8080 and 8081 are held), with `KM_SITE_ORIGIN=http://localhost:18080`.

| Step | Command | Exit | Log |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 | `01-static-1.log` |
| 2 | `pnpm lint` | 0 | `02-static-2.log` |
| 3 | typecheck (Turbo `--continue`, then repo rules `tsc`) | 0 | `03-static-3.log` |
| 4 | test (Turbo `--continue`, repo-rules tests, native aggregate) | 0 | `04-static-4.log` |
| 5 | build (Turbo `--continue`, native aggregate) | 0 | `05-static-5.log` |
| 6 | `build:hosted` | 0 | `06-static-6.log` |
| 6.4 | header: `--check` before (1, stale as expected), render (0), `--check` after (0); committed as `72e2a1d8` | — | `07-header-check-before.log`, `08-header-render.log`, `09-header-check-after.log` |

The header diff adds only the adopted sources: `'wasm-unsafe-eval'`, `blob:` on img and media, and `worker-src 'self' blob:`.

Steps 7 onward follow below as they complete.

## Steps 7–10 (candidate `72e2a1d8`)

| Step | Command | Exit | Log |
|---|---|---|---|
| 7 | `render-gateway-headers.ts --check` | 0 | `10-release-1.log` |
| 8 | `docker compose … build`; image IDs | 0 | `11-release-2.log`, `image-digests.txt` (web `sha256:309d8171…`, token service `sha256:09bbc5b5…`) |
| 9 | `docker compose … up -d --wait`; `/api/healthz` 200 | 0 | `12-release-3.log` |
| 10 | packaged Playwright (`test:packaged`) | 1 | `10-packaged-1.log`, `packaged/playwright.json`, `packaged/html/` |

Step 10 used these run inputs:
- `KM_RELEASE_BASE_URL=http://localhost:18080` and `KM_RELEASE_STATIC_URL=http://127.0.0.1:18081`.
- TTL 600, burst 10, refill 60.
- `KM_RELEASE_CSP_FILE` from `build:hosted`.
- `KM_RELEASE_PREVIOUS_CSP_FILE`: the committed header before 6.4, kept in the lead's scratchpad.
- `KM_RELEASE_DEFAULT_BUILD_URL=http://127.0.0.1:4173` (`vite preview`).
- `KM_RELEASE_IMAGE_DIGESTS` from `image-digests.txt`.

## Result: step 10 FAIL — 26 passed, 23 failed (758 s)

- **21 failures: `POST /api/meetings` returned 429.** The token service log shows `request_refused … limit: meeting-creation`.
  - The local stack runs with the compose default `KM_MEETING_RATE_LIMIT_BURST=3` per 600 s per client, and the suite creates far more meetings than that from one client.
  - `evidence/prerequisites-2026-11-18.md` line 43 recorded this ("unless the override is set"), and no plan step set the override.
  - The same run input applies to the next per-client caps: `KM_MAX_CODES_PER_CLIENT=5` and `KM_MAX_USED_CODES_PER_CLIENT=50`.
- **1 failure, the same cause:** the accessibility reduced-motion test clicks Start meeting, then never sees the join screen (`accessibility.spec.ts:233`). The test is unchanged since web-release, where it passed.
- **1 failure, a test-harness defect:** in WC-12 "autoplay blocked", the precondition "B has had no user activation" is false (`wc-12-enable-audio.spec.ts:68`). `joinRoomWithoutUserActivation` (`src/wc-room.ts:168`) fills the code and the name with Playwright `fill()`. That is trusted keyboard input, which grants user activation.

**What this run does and does not show:**
- PASS, with the product running: hosting, surface, headers, token abuse (3 of 5), accessibility (axe in both themes at all widths, keyboard, the fill probe), the WC-10 controls, WC-11 (the pins and notes), and the WC-7 and WC-8 detector controls.
- No WC behaviour scenario (WC-1 to WC-9, WC-12) reached its feature. Every one was refused at meeting creation, or stopped at the harness precondition. They are **not exercised**, not failed by the product.

Repairs used: 4 of 5. One remains.
