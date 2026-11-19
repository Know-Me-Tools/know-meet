# Conferencing scenarios (`web-conferencing-features`, WC-1 to WC-14)

Acceptance written before production code (VLBV, OpenSpec change
`wc01-conferencing-scenarios`, tasks 1.1 and 1.2). Contract:
`.kbd-orchestrator/phases/web-conferencing-features/adopted-contract.json`
(digest `24260182…`). Nothing here has been run. Every scenario is
`NOT_EXERCISED` until the single boundary run in `wc11-conferencing-boundary`.
Same layout, projects and run inputs as the web-release suite (`README.md`).

## Map from scenario to files

| ID    | Feature                                    | Executed by                                                         | Projects                                   |
| ----- | ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------ |
| WC-1  | `features/wc-1-screen-share.feature`       | `wc-1-screen-share.spec.ts`                                         | packaged, hosted                           |
| WC-2  | `features/wc-2-chat-everyone.feature`      | `wc-2-chat-everyone.spec.ts`                                        | packaged, hosted, + firefox, webkit        |
| WC-3  | `features/wc-3-chat-private.feature`       | `wc-3-chat-private.spec.ts`                                         | packaged, hosted, + firefox, webkit        |
| WC-4  | `features/wc-4-background-effects.feature` | `wc-4-background-effects.spec.ts`                                   | packaged, hosted                           |
| WC-5  | `features/wc-5-device-choice.feature`      | `wc-5-device-choice.spec.ts`                                        | packaged, hosted                           |
| WC-6  | `features/wc-6-speaker.feature`            | `wc-6-speaker.spec.ts`                                              | packaged (+ firefox, webkit: explanation)  |
| WC-7  | `features/wc-7-local-history.feature`      | `wc-7-local-history.spec.ts`                                        | packaged, hosted, + firefox, webkit        |
| WC-8  | `features/wc-8-local-recording.feature`    | `wc-8-local-recording.spec.ts`                                      | packaged, hosted                           |
| WC-9  | `features/wc-9-consent-declined.feature`   | `wc-9-consent-declined.spec.ts`                                     | packaged                                   |
| WC-10 | `features/wc-10-web-csp.feature`           | `wc-10-web-csp.spec.ts`                                             | packaged, hosted (two tests packaged only) |
| WC-11 | `features/wc-11-entity-graph.feature`      | `wc-11-entity-graph.spec.ts`; commands `pnpm why`, `pnpm lint:pins` | packaged (notes), any (pins)               |
| WC-12 | `features/wc-12-enable-audio.feature`      | `wc-12-enable-audio.spec.ts`                                        | packaged, hosted                           |
| WC-13 | task 1.3 (design-lead): axe and UI review  | `accessibility.spec.ts` extended                                    | not written here                           |
| WC-14 | `features/wc-14-repository-rules.feature`  | commands: `pnpm lint`, `typecheck`, `test`, `build`                 | command                                    |

`@cross-engine` tests also run in `packaged-firefox`, `packaged-webkit`,
`hosted-firefox` and `hosted-webkit` (added to `playwright.config.ts`; those
projects select only that tag). Firefox and WebKit have no fake-media flags, so
cross-engine tests join with microphone and camera off through the lobby toggles.
The Chromium projects also carry `--auto-select-desktop-capture-source` for WC-1.

Invocation, from the repository root, as in the contract:

```bash
pnpm --filter @know-meet/release-tests exec playwright test wc-1-screen-share.spec.ts --project=packaged
pnpm --filter @know-meet/release-tests exec playwright test --project=packaged-firefox --project=packaged-webkit
```

## Run inputs added by this phase

| Variable                       | Needed by    | Meaning                                                                                         |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------- |
| `KM_RELEASE_PREVIOUS_CSP_FILE` | WC-10        | The hosted CSP header value main served before this phase, saved by the runner before building. |
| `KM_RELEASE_CSP_FILE`          | WC-10        | As in web-release: the value `build:hosted` writes.                                             |
| `KM_RELEASE_DEFAULT_BUILD_URL` | WC-10, WC-11 | As in web-release: the default (non-hosted) build.                                              |

A missing input fails with `BLOCKED:`; it never skips. WC-5 and WC-6 also throw
`BLOCKED:` when Chromium offers fewer than two devices of a kind; WC-12 when
`navigator.userActivation` is unavailable.

## Independent witnesses (page taps, `src/wc-taps.ts`)

Installed with `addInitScript` before application code; they watch the browser,
not the application. `wire`: every `RTCDataChannel` message received (WC-3).
`gum`: every `getUserMedia` track and its deviceId (WC-5). `recorder`:
`MediaRecorder` starts, stops, bytes (WC-8, WC-9). `csp`: `securitypolicyviolation`
events (WC-4, WC-7, WC-8). `egress`: bodies passed to fetch, XHR, sendBeacon and
`WebSocket.send`, including Blob bodies Playwright cannot show (WC-7, WC-8).
Worker CSP violations reach the console, so `wc-network.ts` also reads console
messages. Disk state is listed from the origin private file system by the
browser's own API (`opfsEntries`), never from the app's index.

## Negative controls (task 1.2): how each one fails

Consent (WC-8, WC-9). "Nothing records" means three witnesses agree: no
`km-recording-indicator` on any page, `MediaRecorder` start count 0, and no new
file in the origin private file system (`notRecordingProbe`).

| Control                           | Observation                                                                             | Fails when the protection is removed because                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WC-8: before B answers            | 5 s window on A and B, all three witnesses                                              | recording starts on request, before the answer: the recorder start count or a new file appears                                                                            |
| WC-9: B declines                  | 20 s window, three witnesses, plus A shows the declined notice                          | a decline is ignored or recording starts on any answer: a witness moves                                                                                                   |
| WC-9: counterpart in the same run | A asks again, B agrees, one recorder started and one file written                       | the fixture cannot record at all, which would make the decline window vacuous; also fails if the declined request had already started a recorder (start count would be 2) |
| WC-9: late joiner declines        | indicators gone on A, B, C, A's recorder stopped, library keeps one non-empty recording | a late decline is ignored (indicator stays, recorder never stops) or the written part is discarded (library empty)                                                        |
| WC-9: late joiner agrees          | 10 s window, indicators on A, B, C, A's recorder not stopped                            | any join stops the recording, which would let the late-decline test pass for the wrong reason                                                                             |

On-device privacy (WC-7, WC-8). The scan covers HTTP requests (URL, headers,
body bytes), signalling-socket frames and page-level egress for the whole run.
Needles are unique chat texts and the local history id (at least 16 characters;
never the room code or the display name, which the service legitimately sees).

| Control                | Observation                                                                                                              | Fails when the protection is removed because                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| WC-7 history leak scan | `findLeaks` over A's whole run, after a reload                                                                           | any code path uploads chat text or the history id (history sync, analytics, error report): it appears in a URL, header, body, frame or egress entry  |
| WC-7 detector canary   | a unique text POSTed to a route-stubbed `canary.invalid` must be flagged                                                 | the detector is blind (recorder not attached, wrong scan): the canary is not found and the control test fails, so a clean scan is never credited     |
| WC-7 fresh profile     | a new profile's history is empty                                                                                         | history is server-side or shared across profiles: the fresh profile lists the meeting                                                                |
| WC-8 recording egress  | `findRecordingEgress` over A and B: WebM or Cluster signature, media-typed body, or a body or frame of 64 KiB or larger  | recording bytes are uploaded in any chunk: signature, type or size trips it                                                                          |
| WC-8 detector canary   | a 70 000-byte `video/webm` blob with an EBML signature POSTed to a stubbed host must be flagged                          | the detector is blind                                                                                                                                |
| WC-3 private to B only | C's data-channel log and panel never contain the text for 10 s; an Everyone control message in the same run does reach C | the server or client delivers the private text to C: it appears in C's wire log even if C's panel hides it. The control proves C's listener was live |

Limit, stated plainly: chat between participants travels on the LiveKit data
channel, which Playwright's network events do not show. The scan proves no HTTP
upload, no signalling frame and no page-level body carries the text. It does not
prove no other byte of it left the browser. The accepted risk "private chat is
readable at the LiveKit server" stays in the contract.

## Assumptions and open points (not resolved here)

1. UI contract names in `src/wc-test-ids.ts` follow the four approved shapes
   (batch 2, operator decision `batch2-approval-web-conferencing-features`,
   2026-11-18). Effects are reached through the room Settings sheet
   (`km-room-settings`, "Audio and video" pane, Background radiogroup), with no
   separate effects control. Speaker choice is room-only; the lobby offers
   microphone and camera. Select options are assumed to carry the deviceId as
   value. The Background group is assumed to stay open between choices.
2. Private-message wording is assumed to be `Private to <name>`; B's own view may
   say `you`. WC-3 accepts both for B.
3. History ids are assumed uuid-like and distinct from the room code.
4. `/history` and `/recordings` are real hosted routes reached through the shared
   adaptive navigation (Home, History, Recordings). `surface.spec.ts` (WR-5) and
   `hosting.spec.ts` (WR-2) allow exactly `/`, `/join`, `/meet`, `/history`,
   `/recordings`, check the navigation lists those three destinations at 375, 768
   and 1440, and still assert `/dashboard`, `/agents`, `/settings`, `/notes` and
   `/auth` render not-found. The adopted WR-5 contract text still names
   `/recordings` as not-found: the lead amends it.
5. WC-7 oracle: "no history ids in the network log" holds only if the history id
   never appears in a requested URL. The spec reloads on the list route and opens
   entries by client navigation; a history detail route that embeds the id would
   leak it on a hard load.
6. WC-11: "notes against the packaged image" conflicts with WR-5 (the hosted build
   excludes `/notes`). The notes flow runs against the default build with the
   `/api/notes` BFF stubbed in memory.
7. WC-12 needs B to join without a trusted user activation; B joins with synthetic
   clicks. A trusted click would unlock playback and make the prompt impossible.
8. WC-4 uses the app's first preset background image, not an uploaded fixture.
   Frame difference uses a generated y4m; thresholds are judgement, and visual
   quality stays a judgement from screenshots, per the contract.
9. WC-10 reads asset URLs by crawling the built output (`discoverAssets`) and
   requires at least one worker script (name contains `worker`) and one `.wasm`.
   The adopted-source table is `ADOPTED_ADDITIONS` in `src/csp-delta.ts`.
10. WC-1's capture source name (`Entire screen`) is Chromium's headless default
    and may need changing in `src/browser-args.ts`.
11. The room bar scrolls sideways below 768px, so Leave may be off-screen at 375.
    The WC specs run at the desktop viewport and click through Playwright's
    auto-scroll; none asserts that every room control is in the viewport. A later
    spec at 375 must not either.
12. Shape/contract differences kept on purpose: the lobby meter is read from
    `aria-valuenow` (0 to 100, role=meter), not a `data-level` 0 to 1; the
    device-only notice is asserted on the History list, not in the detail; delete
    is in the History detail and the list is re-read through the navigation; a
    recording's player is in the detail, so WC-8 opens the card before playing.
