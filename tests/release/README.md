# Release scenarios (`@know-meet/release-tests`)

Acceptance for the `web-release` phase, written before production code (VLBV,
OpenSpec change `wr01-release-scenarios`, tasks 1.1 and 1.2). The adopted
contract is `.kbd-orchestrator/phases/web-release/adopted-contract.json`
(sha256 `772bfa1f…`, amendment 1). Nothing here has been run. Every scenario is
`NOT_EXERCISED` until the single boundary run in `wr09-release-boundary`.

## Map from scenario to suite

| ID   | Feature                                         | Runs in                                        | Executed by                                                                                                                                              |
| ---- | ----------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WR-1 | `features/wr-1-guest-meeting.feature`           | packaged, hosted                               | `meeting.spec.ts`                                                                                                                                        |
| WR-2 | `features/wr-2-deep-links.feature`              | packaged, hosted                               | `hosting.spec.ts`                                                                                                                                        |
| WR-3 | `features/wr-3-tls-and-headers.feature`         | hosted (positive), packaged (negative control) | `headers.spec.ts`                                                                                                                                        |
| WR-4 | `features/wr-4-token-abuse.feature`             | packaged, hosted                               | `token-abuse.spec.ts`                                                                                                                                    |
| WR-5 | `features/wr-5-hosted-surface.feature`          | packaged, hosted (negative control: packaged)  | `surface.spec.ts`                                                                                                                                        |
| WR-6 | `features/wr-6-secret-hygiene.feature`          | command                                        | `pnpm run lint:secrets` and `tooling/release/src/scan-artifacts.ts` ([scan-contract.md](scan-contract.md))                                               |
| WR-7 | `features/wr-7-reproducible-deployment.feature` | command                                        | `kubectl --context gke_knowme-corporate_us-south1_main -n argocd get applications.argoproj.io/know-meet -o json` against the workflow digests (wr09 9.4) |
| WR-8 | `features/wr-8-accessible-screens.feature`      | packaged                                       | `accessibility.spec.ts` (automated part); the UI review is wr09 9.3                                                                                      |
| WR-9 | `features/wr-9-repository-rules.feature`        | command                                        | `pnpm run lint && pnpm run typecheck && pnpm run test && cargo check --workspace`                                                                        |

The feature files do not carry `@ui` or `@cli`, so the fidelity suite
(`tests/fidelity`, which selects on those tags) never generates them. They are
the readable statement; the specs are the executable form. Each spec test has
the WR id as a tag and `@negative-control` on its control.

## Projects and invocation

| Project    | Base URL                                                                                                                                      | Excludes                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `packaged` | `KM_RELEASE_BASE_URL`, default `http://localhost:8080` (the compose stack's same-origin entry: static image plus `/api` to the token service) | tests tagged `@hosted-only`   |
| `hosted`   | `https://meet.know-me.tools`                                                                                                                  | tests tagged `@packaged-only` |

Both use Desktop Chrome with `--use-fake-device-for-media-stream`,
`--use-fake-ui-for-media-stream` and camera and microphone permissions. Trace,
video and screenshots are on for every test. One worker, file order, no retries.

From the repository root:

```bash
pnpm --filter @know-meet/release-tests exec playwright test --project=packaged
pnpm --filter @know-meet/release-tests exec playwright test --project=hosted
# one file
pnpm --filter @know-meet/release-tests exec playwright test meeting.spec.ts --project=hosted
```

`pnpm exec playwright test tests/release --project=…` from the root, as the
contract's boundary packet writes it, does not work with this layout: the root
`playwright.config.ts` re-exports the fidelity config (projects `web` and
`cli`), and the root has no Playwright binary. The lead reconciles the packet.

## Run inputs (environment)

| Variable                               | Needed by             | Meaning                                                                                                                                                           |
| -------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KM_EVIDENCE_DIR`                      | all                   | Evidence folder. Use a new dated folder per invocation, for example `evidence/boundary-<date>/packaged`. Unset: `tests/release/reports/<timestamp>` (gitignored). |
| `KM_RELEASE_BASE_URL`                  | packaged              | Same-origin entry of the compose stack.                                                                                                                           |
| `KM_RELEASE_STATIC_URL`                | WR-3 negative control | The static image alone, without the test proxy or Gateway. Defaults to the base URL; set it if the proxy adds headers.                                            |
| `KM_RELEASE_DEFAULT_BUILD_URL`         | WR-5 negative control | The default (non-hosted) build of the same commit. Default `http://127.0.0.1:4173` (Vite preview, as the fidelity suite serves it).                               |
| `KM_RELEASE_CSP_FILE`                  | WR-3                  | Path of the CSP header value written by `build:hosted` (wr06 task 6.3).                                                                                           |
| `KM_RELEASE_TOKEN_TTL_SECONDS`         | WR-4                  | Token lifetime from the deployed configuration.                                                                                                                   |
| `KM_RELEASE_RATE_LIMIT_BURST`          | WR-4                  | Requests one client may send back to back with a full bucket (both POST endpoints together). At least 2.                                                          |
| `KM_RELEASE_RATE_LIMIT_REFILL_SECONDS` | WR-4                  | Time for an empty bucket to refill completely. WR-4 waits this long before each burst.                                                                            |
| `KM_RELEASE_IMAGE_DIGESTS`             | WR-1 evidence         | The two image digests of the run, recorded as given.                                                                                                              |

A missing required input fails the test with a message starting `BLOCKED:`. It
never skips. The test runner holds no LiveKit credential: tokens come from the
running token service.

## UI contract (`src/test-ids.ts`)

wr05 (ui-engineer) and wr06 (client-shell) implement these values. Summary:

- **Screen roots**, present whatever the state: `km-screen-home`,
  `km-screen-join`, `km-screen-meet`.
- **Home**: `km-home-start-meeting` (button), `km-home-join-code` (input),
  `km-home-join` (button). No name on home: the name is entered in the lobby
  only (`docs/design/web-release-acceptance.md`, section 0).
- **Join lobby**: `km-lobby-display-name` (input), `km-lobby-camera-preview`
  (`<video>`), `km-lobby-mic-toggle` and `km-lobby-camera-toggle`,
  `km-lobby-join`.
- **Meeting room**: `km-room-code` (text is exactly the code), `km-local-tile`,
  `km-remote-tile` (one per remote participant, with
  `data-participant-identity`), inside it `km-remote-video` (`<video>` with the
  subscribed camera track as `srcObject`), `km-remote-audio` (`<audio>` with the
  subscribed microphone track as `srcObject`) and `km-participant-muted`
  (visible only while that participant's microphone is muted);
  `km-room-mute-mic`, `km-room-mute-camera`, `km-room-leave`, and
  `km-room-leave-confirm` ("Leave meeting" in the leave dialog, design O-7; the
  specs confirm it when it opens and also work without a dialog).
- **Toggle state**: every media toggle carries `data-state="on"` or `"off"`.
  Toggles use action names and no `aria-pressed` (design conflict K-1), so the
  specs read this attribute.
- **States**: `km-state-meeting-not-found`, `km-state-permission-denied`,
  `km-state-disconnected`, and `km-not-found` on the not-found page
  (`RouteNotFound` today renders the heading but not the id).

Flow the specs drive: Home "Start meeting" calls `POST /api/meetings`, then
shows the lobby for the new code; Home "Join" shows the lobby for the typed
code; the lobby's "Join meeting" calls `POST /api/token`, then shows the room.
A 404 from the token endpoint shows `km-state-meeting-not-found` and opens no
WebSocket. The specs read the code from `km-room-code`, not from the URL, so
the URL shape is the builders' choice. The keyboard test needs every listed
control reachable by Tab in any order; it assumes only that "Join meeting"
follows the name field.

## Token service contract (`src/api-contract.ts`)

wr03 (livekit-platform) implements this behind same-origin `/api`.

| Method and path      | Request                                   | Success                                                                                   | Errors                                                 |
| -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `POST /api/meetings` | `{}`                                      | 201 `{ ok: true, data: { code } }`, code matches `^km-[a-z0-9]{3}-[a-z0-9]{3}$`           | 403, 429                                               |
| `POST /api/token`    | `{ code, name }`, name 1 to 60 characters | 200 `{ ok: true, data: { url, token, identity, room, expiresIn } }`, `room` equals `code` | 400, 403, 404 for any code not issued (any shape), 429 |
| `GET /api/healthz`   | none                                      | 200 `{ ok: true, data: { status: "ok" } }`                                                | none                                                   |

Errors are `{ ok: false, error: { code, message } }` with `code` one of
`invalid-request` (400), `forbidden-origin` (403), `meeting-not-found` (404),
`rate-limited` (429, with `Retry-After`). POST endpoints require `Origin` equal
to the configured site origin and share one rate-limit bucket per client
address (the forwarded client address behind the Gateway). The token grants
`roomJoin` to that room only, no `roomAdmin`, `ingressAdmin` or `roomCreate`,
and expires within the configured lifetime. Responses carry
`Cache-Control: no-store`. Cross-language types for the app belong in
`packages/contracts` (architect).

## Evidence

Per invocation, under `KM_EVIDENCE_DIR`: `html/` (report), `playwright.json`,
`test-results/` (traces, videos, screenshots, JSON attachments). WR-1 records
the room code, both contexts' screenshots and the image digests; WR-4 records
decoded claims without the signature; WR-3 records the certificate and a
header dump. argv and exit code are recorded by the boundary runner
(`evidence/boundary-<date>/argv-and-exit.json`).

Traces hold full network responses, including the short-lived access tokens
the token endpoint returns. Treat evidence folders as sensitive until the
tokens expire, and do not publish raw traces.

## Not covered here

- WR-6, WR-7 and WR-9 are command scenarios run by the boundary packet, not by
  this package.
- The WR-8 UI review against DESIGN.md and the prototype room (wr09 9.3), and
  WR-8's final acceptance wording (design-lead, task 1.3).
- Camera mute is driven by the keyboard test but not observed from the other
  participant; the contract oracle observes microphone mute only.
- Safari and Firefox media behaviour; mobile browsers; reconnection after a
  network drop; permission-denied and disconnected states (contracted ids
  only, no scenario asserts them).
- The participant cap and empty-room timeout of the token service.
- Requests without an `Origin` header (the contract names foreign origins only).
