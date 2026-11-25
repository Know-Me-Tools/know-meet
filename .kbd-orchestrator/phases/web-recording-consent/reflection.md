# Web recording and consent reflection

## Plan-to-delivery delta

1. This phase planned one packaged boundary. The initial packet stopped before Chromium. Ten separately authorized repairs addressed compilation, lint, recorder startup, timing, and evidence coverage. The tenth passed all 29 Chromium cases and seven controls with no skips or flakes.
2. The seventh repair passed its tests. Independent review then found unexercised prior-request replay and frozen-output classification, plus ordering and identity witness gaps. The final packet covers those behaviors with additional assertions. An earlier frozen-output relay produced a library failure before the test could decode the file.
3. Execute exceeded the original 720-minute and 600-tool-call ceilings. A signed amendment increased the ceilings to 4,800 minutes and 1,500 calls. The final evidence records cumulative use against those ceilings. Every repair slot was consumed.

## Root causes and corrective actions

- Starting the native encoder on a blank canvas and silence supplies the input it needs without admitting live sources before the room announcement. Keep the real normal-start case and the native failure control together.
- The first late-consent witness depended on LiveKit's wire representation. Observe received consent before the app consumes it, then correlate request and admission IDs with compositor and mixer events.
- The initial timing oracle confused the start of a tone window with the intended audio end. Anchor the comparison to Stop, confirm the actual recorder microphone and mixer, and decode the saved endpoint.
- A comparator-only frozen-video fixture missed the app's classification path. The next relay also lacked proof that the saved recording was playable. Submit opaque frames explicitly, retain the stored bytes even when an oracle fails, and prove audio continuation independently before trusting the library verdict.
- Record elapsed time, tool-call scope, attempt count, and the complete diagnostics after each boundary. Check intended behavior against the exact assertions before spending the next authorized attempt.

## Goal achievement

[Packaged boundary summary](boundary-summary.json) establishes all five adopted goals for the tested Chromium path.

| Goal | Verdict | Observed evidence |
| --- | --- | --- |
| RC-1. Late-joiner opt-in | MET | Pre-consent exclusion, valid admission, failed delivery, stale admission and prior request replay, and a valid decline. |
| RC-2. Stop, Leave, and decline cutoff | MET | Startup cancel and active cutoff with independent encoder and writer holds and media witnesses. |
| RC-3. Room and save separation | MET | Indicator clearing, rejoin during a pending save, departing-peer mixer detachment, and tab exit. |
| RC-4. Honest recording outcome | MET | The frozen picture with continuing audio was playable and Incomplete. The intentional still source and a short clip were Complete. Encoder, writer, storage and unusable-output cases passed. |
| RC-5. Chromium support and local-only recording | MET | Recording with agreement, rejection on decline, failed start without a false indicator, local playback, and a deliberate upload oracle control. |

## Delivered changes

- `rc01-consent-and-capture-cutoff` binds capture to active participants' consent and separates cutoff and room presence from saving.
- `rc02-recording-outcomes` classifies native saved results and gives prompt failure feedback while preserving playable written bytes.
- Both changes were implemented and verified in Codex. Six of six tasks reconcile across the KBD runtime, projection, and OpenSpec. Both changes were archived, and the local-recording specification gained the five accepted requirements. See the [effective local-recording spec](../../../openspec/specs/local-recording/spec.md).

## Review, integrity, and remaining limits

Static QA matched the 63 candidate source hashes. Candidate file size, naming, secret pattern, explicit TypeScript `any`, inward imports, and whitespace checks passed. The approved packet supplied the lint and build receipts. The recording uses the pinned browser recorder and LiveKit adapter without a new runtime dependency.

Visual progress detection samples the opening 1.4 seconds and compares change during muted playback of that prefix. The accepted case demonstrates a known advancing source within that interval. Late freezes outside the observed prefix, native desktop and mobile behavior, and production deployment were unexercised. Raw recordings, traces, and runner reports remain local. The local acceptance disposition and review are separate from publication. The native independent review used a different model version within the same family. It raised one warning about local-only scope and one suggestion to describe recorded identities as compositor-edge evidence. See the [closeout summary](closure-summary.md).

KBD required source paths under the canonical checkout. Closure used a local snapshot of the exact tested Git blobs, individually matched to all candidate hashes and to the live worktree. The original receipt remains intact. The phase-completion event was appended to the local session log and queued for knowledge writeback.

## Recalled lessons

- Applied the predecessor's positive-trigger and negative-control pairing to the recorded media witnesses.
- The assessment's startup and finalization observability gap recurred during fixture repair. Native start, room announcement, capture cutoff, writer closure, and decoded validity each needed independent evidence.
- Applied Analyze's decision to preserve the existing LiveKit adapter, native MediaRecorder, and local storage boundary.

## Lessons learned

- Pair an injected media failure with an independent witness that the fixture actually reached the recorded bytes.
- Bind consent witness expectations to the exact request, admission, authenticated sender, and receipt time.
- A BDD test that fails before attaching its artifact cannot distinguish bad output from bad classification. Keep the artifact first.
- Confirm budget semantics and capture cumulative usage before a passing run is needed for closeout.

## Contract accuracy

| Metric | Observed value |
| --- | --- |
| Signed amendments after initial adoption | 12 |
| Adopted scenarios blocked by the contract at closure | 0 |
| Adopted scenarios unexercised at closure | 0 |
| B5 attempts used and allowed | 10 of 10 |
| Elapsed Execute minutes and tool calls through evidence cutoff | 4,271 of 4,800 minutes and 1,121 of 1,500 recorded calls |
| Closing review findings | 0 critical, 1 warning, 1 suggestion |
| Post-closure escapes known at reflection | 0 |

## Next phase seed

Retain the separate local-transcription seed as a planning input. Keep the recording consent and local-only storage boundaries intact in any successor. Advance only with separate successor authority.

## Codify as Skill?

None.
