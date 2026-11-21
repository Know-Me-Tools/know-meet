# Prerequisites for the wc boundary, observed 2026-11-18 (task 1.5, WC-11)

Observed by build-platform in the phase worktree. Environment variable VALUES were never read or written. UNKNOWN means not observable from this machine.

## 1. Pins (npm registry, observed with `npm view`)

| Package | Version | dist.integrity | Peers | npm dist-tags |
|---|---|---|---|---|
| @livekit/track-processors | 0.8.3 | sha512-68hetu9AV0mHjOM4UDSgdJRjpckcy2LFxEYh4iN1X6niP2qiaQCz826wDKn7ULl4a+czyfAkiN9gzwKuRCOlUQ== | livekit-client ^1.12.0 or ^2.1.0; @types/dom-mediacapture-transform ^0.1.9 (required, no optional flag) | latest 0.8.3 |
| @mediapipe/tasks-vision | 0.10.14 | sha512-vOifgZhkndgybdvoRITzRkIueWWSiCKuEUXXK6Q4FaJsFvRJuwgg++vqFUMlL0Uox62U5aEXFhHxlhV7Ja5e3Q== | none | latest 1.2.3 (0.10.14 is NOT latest) |
| @electric-sql/pglite | 0.5.16 | sha512-Nj8KcIsJL748W408U2N8q4+9IlONdpRIU8MJypIAAINMJ5nqKyqpX7Mgg/5XKkXiAib3AoZGR6hnJFlrlLBrcg== | none | latest 0.5.16 |
| @prometheus-ags/entity-graph-core | 5.0.1 | sha512-CO2sPu9WJiNufzXSVlSTtAUUnScKH0Sm6ST+Qbd4Bd6jzhHA9sdqBkrEwWN/TnWp4Z4U/u0hDWYhWBVMMmrd5w== | loro-crdt >=1.0.0, @ag-ui/core ^1.0.0, @tauri-apps/plugin-sql >=2.0.0 (all optional) | latest 5.0.1, next 5.0.1 |
| @prometheus-ags/entity-graph-react | 5.0.1 | sha512-I/EzSY7I1FqWv8crmEHQ5aMcS4obg39bNO5G+ULTQ7ntKitTtH9b5GM+9EnLELhVugFKVNslMgfRKKjzB1mUMw== | react and react-dom >=19.0.0 <20.0.0; core ^5.0.1; same three optional peers | latest 5.0.1, next 5.0.1 |

Engines of both entity-graph packages: node `^22.14.0 || ^24.0.0 || >=26.0.0`. Repo node is 26.5.0: satisfied.

Peer fit against the worktree manifests:
- livekit-client 2.24.1 (packages/realtime) satisfies ^2.1.0.
- react and react-dom 19.2.7 (apps/web, packages/ui) satisfy >=19.0.0 <20.0.0.
- `@types/dom-mediacapture-transform` is not in the lockfile (only `@types/dom-mediacapture-record` 1.0.22 is). Latest on npm is 0.1.12, which satisfies ^0.1.9. Task 1.6 must add it explicitly as an exact pin to apps/web; do not rely on peer auto-install under `saveExact`.
- `@tanstack/react-table` ^9.2.4, `@tanstack/table-core` ^9.2.4, `lucide-react` ^1.28.0, `tailwind-merge` ^3.6.0, `@tanstack/react-virtual` ^3.14.9, `immer` ^11.1.15, `zustand` ^5.0.14 come in as transitive dependencies of entity-graph-react 5.0.1. Whether they collide with versions already in the lockfile is UNKNOWN until task 1.6 runs `pnpm install`.
- `@ag-ui/core` is 1.0.4 in both spikes, which meets ^1.0.0. apps/web does not list `@ag-ui/core`, `loro-crdt` or `@tauri-apps/plugin-sql`; they are optional peers, so not required for the install.

Version drift the pins touch (observed in the worktree):
- apps/web pins entity-graph 4.3.0; spikes/agentic-ui/own pins 4.4.0; spikes/agentic-ui/hybrid pins core 4.3.0. This is a major bump (4.x to 5.0.1). That is change wc08, not task 1.6.
- tooling/versions.toml has `pglite = "0.5.4"` and `prometheus_entity_management = "4.2.0"`. Neither matches the manifests (4.3.0 in apps/web). Nothing enforces them.
- `@mediapipe/tasks-vision` 0.10.14 is forced: track-processors 0.8.3 depends on exactly 0.10.14.

## 2. tooling/versions.toml is guarded (blocks the task 1.5 write as specified)

`tooling/versions.source.json` records the file as a byte-identical copy of `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/versions.toml` with sha256 0c2f7f60...53a3c, policy "Never edit it here; re-copy from the reference and update sha256". `tooling/repo-rules/src/check-pins.ts` fails lint if the digest differs. Observed: the worktree file and the read-only source file have the same digest today. Editing the file without changing the recorded digest fails lint; editing both makes the copy no longer byte-identical to its source. See the report for the proposed diff and the decision needed.

## 3. Environment variable names (values not read)

| Name | Used by | Set in the shell that ran this check |
|---|---|---|
| LIVEKIT_URL | tooling/release/compose.yaml (required, `:?`), token service, boundary tests | set |
| LIVEKIT_API_KEY | token service via compose (name-only pass-through) | set |
| LIVEKIT_API_SECRET | token service via compose (name-only pass-through) | set |

The repo also references LIVEKIT_TRUNK_ID, LIVEKIT_REGIONS and S3_PROVIDERS or S3_PROVIDER_ORDER in docs or code. Whether any of them is required for the wc scenarios is UNKNOWN. Whether the values in this shell point at the hosted LiveKit project the boundary will use is UNKNOWN. A shell that runs a different process than the one that runs the boundary may not have them; recheck at the boundary.

Optional service settings with defaults in compose.yaml (names only): KM_SITE_ORIGIN, KM_TRUSTED_PROXY_HOPS, KM_TOKEN_TTL_SECONDS, KM_RATE_LIMIT_BURST, KM_RATE_LIMIT_REFILL_SECONDS, KM_MEETING_RATE_LIMIT_BURST, KM_MEETING_RATE_LIMIT_REFILL_SECONDS, KM_UNUSED_CODE_TTL_SECONDS, KM_MAX_CODES_PER_CLIENT, KM_MAX_USED_CODES_PER_CLIENT, KM_MAX_STORED_CODES, and release-test overrides KM_RELEASE_RATE_LIMIT_BURST and KM_RELEASE_RATE_LIMIT_REFILL_SECONDS. Meeting creation defaults to a burst of 3 per 600 seconds per client (compose default); a wc suite that creates more than 3 meetings per client inside 10 minutes will be rate limited unless the override is set.

## 4. Host ports used by tooling/release/compose.yaml (`lsof -nP -iTCP:<port> -sTCP:LISTEN`, 2026-11-18)

| Port | Bound by compose | Free now | Listener observed |
|---|---|---|---|
| 8080 | proxy, 127.0.0.1:8080 (same-origin entry) | NO | OrbStack forwarding container `knowme-web` (knowme-web:latest, 0.0.0.0:8080->8080) |
| 8081 | web image alone, 127.0.0.1:8081 (WR-3 negative control) | NO | process `openai-pr...` (pid 7506, `openai-proxy` per name prefix; full name truncated by lsof) |

Both compose host ports are occupied. `docker compose up` for the release stack will fail to bind until the listeners are stopped or the host ports are remapped. Stopping them is the operator's call; this role did not touch either. The token service in compose.yaml has no host port. Other containers observed running (not compose ports): knowme-uar 6565, knowme-memory-server 3001, knowme-surrealdb.

## 5. Browsers

- Playwright `@playwright/test` 1.65.0 in apps/web, tests/fidelity, tests/release.
- Its browsers.json wants chromium and chromium-headless-shell revision 1254, webkit 2388, ffmpeg 1013, firefox 1572. Cache `~/Library/Caches/ms-playwright` holds chromium-1254, chromium_headless_shell-1254, webkit-2388, ffmpeg-1013: present. firefox-1572 is not cached.
- Configs observed: tests/fidelity uses `devices["Desktop Chrome"]`; tests/release uses Desktop Chrome with fake media (`chromiumWithFakeMedia`). No firefox or webkit project is configured, so only chromium is needed unless wc01 adds a project. Whether Chrome's `getDisplayMedia` (WC-1 tab share) works under the fake-media flags used there is UNKNOWN.

## 6. LiveKit project limits

Not documented in the repo. `services/livekit/README.md` states "Not verified against LiveKit Cloud yet" that the project allows rooms to be created on join, and that a participant cap and timeouts should be set in the LiveKit Cloud project. Meeting count, concurrent participant, egress and agent-dispatch limits of the project behind LIVEKIT_URL: UNKNOWN. The operator must read them from the LiveKit Cloud dashboard. Whether the project has recording egress and an S3 or GCS bucket configured: UNKNOWN (no value read, nothing in the repo records it).
