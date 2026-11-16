# @know-meet/realtime

The `RealtimeRoom` port (`@know-meet/application`, ADR-0001) over `livekit-client` 2.24.1, for
the web app and the Tauri webview. The composition root calls
`createLiveKitRealtimeRoom()` and hands the result to the meeting use cases. Nothing exported
names a LiveKit type.

Status: written under VLBV for OpenSpec change `wr04-realtime-adapter` (task 4.1). It has not
been compiled or run; the first run is the `wr09-release-boundary` WR-1 scenario.

## What it guarantees

- **No connection before `connect`.** The SDK room is created inside `connect`, so a token
  request the service refuses never opens a WebSocket (WR-1 negative case).
- **Snapshot contract.** `getSnapshot()` returns the same object until something changes;
  unchanged participants keep their references. Participant changes are read one microtask
  after the SDK event, batched, because the SDK emits some events (for example
  `TrackUnsubscribed`) before it finishes updating the publication.
- **Devices start off.** After `connect` the microphone and camera are off; the join use case
  enables them one at a time from the lobby choices.
- **Permission refusal keeps the guest in the room.** A refused or unusable device returns
  `permission-denied` for that device and the room stays connected.
- **Typed connect errors, one attempt.** A refused or expired token (`ConnectionError` with
  reason `NotAllowed`) returns `forbidden`; anything else returns `connection-lost`. The adapter
  never retries `connect`. (The SDK itself may try another LiveKit Cloud region on a 403 before
  failing; a 401 is terminal.)
- **Reconnection.** The SDK's reconnect policy runs; the snapshot reports `reconnecting` and
  then `connected` and keeps the participants on screen meanwhile. If the SDK gives up, the
  state becomes `disconnected` with reason `connection-lost`.
- **Leaving.** `disconnect` reports `disconnected` with reason `left`, stops local tracks (the
  camera light goes off), removes every listener and disposes the SDK room. Calling it twice is
  safe.
- **Media bindings.** `attachMedia(target, element)` keeps the element bound to the
  participant's camera or microphone: it attaches when the track is subscribed (or published,
  for the local camera), moves to the new track after unsubscribe/resubscribe or a reconnect,
  clears the element when the track goes away, and returns an idempotent detach function. It
  works when called before the track exists. The local microphone is never attached (no echo).
  Attaching goes through the SDK's `track.attach`, which sets `srcObject` to a `MediaStream`
  holding the track and calls `play()`.

## Settings

- `dynacast: true` (default): the publisher pauses simulcast layers nobody receives.
- `adaptiveStream: false` (default): the SDK would otherwise pause remote video whose element
  is hidden, zero-sized or in a background tab. For a two-person call the bandwidth saving is
  small and the risk to WR-1 (two pages, one possibly in the background) is real. Turn it on
  once the room grid exists and has been measured.
- Simulcast and capture resolution use SDK defaults. `webAudioMix` stays off so remote audio
  plays through the `<audio>` element the page renders.
- `onDiagnostic` receives connection changes, connect and media failures (error names only)
  and audio-playback status. It never receives a token or an error message.

## Audio autoplay

Browsers block audible playback without a user gesture. Join starts from a click, so the
adapter calls `room.startAudio()` right after connecting, and the SDK's own `play()` on attach
usually succeeds under the click's sticky activation. If the browser still blocks it, remote
audio stays silent, `onDiagnostic` reports `audio-playback` with `playing: false`, and nothing
in the port lets the page retry yet. Fix when it is observed: add a `startAudio()` (or
`audioBlocked` snapshot flag) to the port so a button can call it from a gesture.

## Browser support

Written against Chromium (the WR-1 browser). Safari/WebKit (Tauri on macOS) and Firefox are
unverified. If the SDK reports WebRTC unsupported, `connect` returns `connection-lost`.

## Not handled

- Device selection (microphone/camera choice), output device selection.
- Screen share, data channels, chat, E2EE.
- Network-quality signals and connection stats in the snapshot.
- Simulcast tuning, capture constraints, bandwidth caps.
- Device errors other than refusal (not found, in use) are reported as `permission-denied`,
  because the port has no separate code.
- A retry for blocked audio playback (see above).

## Tests

`tests/unit` covers the SDK-free parts with hand-made stand-ins: snapshot mapping, connection
mapping, error mapping, the media binding registry and the snapshot store. The SDK-facing files
in `src/livekit/` and the factory are covered only by the WR-1 boundary run.
