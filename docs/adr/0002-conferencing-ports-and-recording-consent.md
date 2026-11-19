# ADR-0002: Conferencing port extensions and the recording consent protocol

## Status

Accepted (architect, web-conferencing-features phase, OpenSpec change
`wc02-conferencing-ports`). Not yet exercised: under VLBV nothing runs before the
`wc11-conferencing-boundary` run. Extends ADR-0001; does not supersede it.

## Date

2026-11-18

## Context

The phase adds screen share, chat to everyone or one person, device choice (speaker
included), "Enable audio", background effects and browser-local recording with consent
(contract WC-1 to WC-12, decisions D1 to D5). Domain and application code still must not
import `livekit-client` or `@livekit/track-processors`. The adapter (wc03) is
`livekit-client` 2.24.1, read from its installed type declarations:

- `sendText(text, { topic, destinationIdentities, attributes })` sends;
  `registerTextStreamHandler(topic, handler)` receives with `participantInfo.identity`.
- The receiver's `TextStreamInfo` has `id`, `timestamp`, `topic` and `attributes`, but no
  destination list. A receiver cannot tell a private message from a public one unless the
  sender says so.
- `switchActiveDevice("audiooutput")` throws where `setSinkId` is missing.

## Decision

1. **One port, extended; state in the snapshot, commands as methods.** `RoomSnapshot` gains
   `screenShares`, `chat`, `devices`, `audioPlayback`, `backgroundEffect` and `support`.
   `RealtimeRoom` gains `setScreenShareEnabled`, `sendChat`, `refreshDevices`,
   `selectDevice`, `startAudio`, `setBackgroundEffect`, `sendConsentMessage` and
   `onConsentMessage`. `MediaTarget.kind` widens to `MediaSource` (adds `screen-share` and
   `screen-share-audio`). `connect` takes `ConnectOptions { devices }`.
2. **Chat audience is required and explicit.** `ChatAudience` is `everyone` or
   `private(to)`; `OutgoingChatMessage` has no default. The adapter marks private messages
   in the stream `attributes` so the receiver can label them; a received private message
   always has `to` equal to the receiver. The use case refuses a private message to someone
   not present before anything is sent.
3. **Support is data.** `support.screenShare`, `support.backgroundEffects` and
   `support.speakerSelection` let presentation hide or explain controls; the port returns
   `Unsupported` rather than throwing, and never attempts speaker selection without
   `setSinkId`.
4. **The background effect is a request that the adapter keeps true.** The port takes a
   domain `BackgroundEffect` (`none`, `blur`, `image(url)`), not a processor object. The
   adapter owns `@livekit/track-processors` and reapplies the effect when the camera track
   is replaced. This is the "video processor hook": deep, and free of SDK types.
5. **Lobby devices go in at connect.** The join use case passes `DeviceChoice` in
   `ConnectOptions`; the adapter applies it to capture defaults before any track opens, and
   falls back to the system default if the device has gone.
6. **Consent is a pure state machine plus a serial executor.**
   - Domain: `RecordingConsentState`, the wire messages (`record-request`, `record-answer`,
     `record-withdrawn`, `record-started`, `record-stopped`), a versioned JSON codec
     (`v: 1`), and `transitionConsent(state, event) -> { state, commands }`.
   - Application: `createRecordingConsent` feeds room changes, received messages and
     recorder events into the rules one at a time and runs the commands in order, stopping
     at the first failure and feeding it back.
   - Messages travel on a reserved topic, never the chat topic. The sender comes from the
     transport, never the payload.
7. **Rules that keep consent safe.**
   - The recorder starts only after the last present participant agreed and after
     `record-started` was sent. A failed send or recorder start leads to stopped, not
     started.
   - A malformed or unexpected answer is dropped, which counts as no answer.
   - A late joiner gets `record-request` with `phase: "running"`: indicator and prompt.
     Their decline makes the recorder stop, keep the file and announce `record-stopped`
     (D2). If the running-phase prompt cannot be sent, the recording stops.
   - A participant who sees `record-started` without having agreed shows the indicator
     and is asked.
   - A client already in a request or recording answers a second request with
     `declined(busy)`.
   - `LocalRecorder.stop` always finalises and keeps what was written.

## Alternatives considered

### A separate port per feature (ChatChannel, DeviceCatalog, ScreenShare)

- Pros: smaller interfaces.
- Cons: every one needs the same session, connection state and snapshot cadence; the UI
  would join several stores; the adapter would share one SDK room across them anyway.
- Rejected. The recorder is the exception (`LocalRecorder`), because it is a different
  adapter (canvas, MediaRecorder, OPFS) with its own lifecycle.

### Expose a `TrackProcessor` setter on the port

- Pros: matches the SDK, so wc07 could swap processors freely.
- Cons: puts a LiveKit type in the application layer and leaves "reapply after device
  switch" to every caller.
- Rejected.

### Chat as events only (`onChatMessage`)

- Pros: no growing array in the snapshot.
- Cons: the panel needs sent and received messages in one ordered list, and React reads a
  snapshot anyway. The local-history writer can read the tail of an append-only list.
- Rejected for chat. Consent uses events (`onConsentMessage`), because its state is
  derived by the rules, not displayed raw.

### Pause the recording until a late joiner answers

- Pros: nobody is recorded before answering.
- Cons: the operator adopted D2 (continue, indicator, prompt, stop on decline).
- Rejected by contract decision D2.

### Put the consent schema in `packages/contracts` now

- Pros: the role's home for cross-language types; the Flutter client will need it.
- Cons: still no format ADR, generator or second consumer in this phase (web only).
- Deferred again. The codec is one small file (`recording-consent.ts`) with a version
  number, so moving it is mechanical.

## Consequences

- The LiveKit adapter (wc03) must fill six new snapshot fields and eight methods; the
  existing adapter does not compile against this port until it does. That is the planned
  order (wc02 then wc03) and nothing runs before wc11.
- The fakes in `@know-meet/application/fakes` implement both ports plus `LocalRecorder`, so
  wc04, wc05 and wc10 screens can be built first.
- The uncomfortable part: consent is enforced only by the clients that follow this
  protocol. A modified client can record without asking, and private chat is readable by
  the media server. The protocol makes recording visible, not impossible. A decline that
  never reaches the recorder is reported back as a failed send and the prompt returns,
  but if the send succeeded and the message was then lost, the recording keeps running.
  The decliner's remaining remedy is to leave, which removes their media from it.
- Another uncomfortable part: if everyone leaves while a request is pending, the requester
  starts recording alone, because "every present participant agreed" is then vacuously
  true. It records only the requester's own media.
