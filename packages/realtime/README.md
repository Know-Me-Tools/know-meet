# @know-meet/realtime

The `RealtimeRoom` port (`@know-meet/application`, ADR-0001) over `livekit-client` 2.24.1, for
the web app and the Tauri webview. The composition root calls
`createLiveKitRealtimeRoom()` and hands the result to the meeting use cases. Nothing the port
returns names a LiveKit type; the only exported type that does is `VideoProcessorHook`, which
wc07 implements inside this package.

Status: the base adapter is wr04 task 4.1. The conferencing additions (wc03, tasks 3.1 to
3.5) are written under VLBV and have not been compiled or run; their first run is
`wc11-conferencing-boundary`.

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

## Conferencing (wc03, written under VLBV, not yet run)

- **Screen share (WC-1).** `setScreenShareEnabled` uses the browser picker with no surface
  restriction and asks for tab or system audio (Chromium only). A closed or refused picker
  returns `share-not-started`; no `getDisplayMedia` returns `unsupported`. When the browser
  ends the share itself, the SDK unpublishes it and the snapshot drops it, as a stop does.
  `attachMedia` plays `screen-share` and remote `screen-share-audio`; local share audio is
  never attached.
- **Chat and consent (WC-2, WC-3, WC-8, WC-9).** `sendText` / `registerTextStreamHandler`,
  never the deprecated `sendChatMessage`. A received chat stream is read up to the text
  limit (8000 bytes) with a 10 s timeout; anything larger, stalled or malformed is dropped
  and reported as `message-dropped`. Consent text is decoded with the domain codec; the
  sender is the identity the server reported.
- **Devices (WC-5, WC-6).** The device list comes from one page-wide catalog
  (`@know-meet/realtime/browser`): `enumerateDevices` at load and on every `devicechange`,
  never a permission prompt, read again after a device is first enabled (labels appear).
  The lobby choice becomes `ideal` capture defaults, so a device unplugged since the lobby
  falls back to the default. `selectDevice` switches with `exact`, so a gone device returns
  `device-not-found`. Speaker selection is gated exactly like the SDK's
  `supportsAudioOutputSelection()`: `setSinkId` present and not WebKit. That makes it
  unsupported in Safari and the Tauri macOS webview even where `setSinkId` exists, because
  the SDK refuses there.
- **Audio playback (WC-12).** `audioPlayback` mirrors the SDK's `canPlaybackAudio`.
  `startAudio()` calls the SDK synchronously so it runs inside the click; the adapter still
  tries once right after joining.
- **Background effects (WC-4).** The port takes a domain `BackgroundEffect`; the adapter
  keeps it true on whatever camera track is published (pending while the camera is off,
  reapplied to a new or processor-less track, a failure not retried on the same track).
  _How_ is a `VideoProcessorHook` passed as `createLiveKitRealtimeRoom({ videoProcessor })`;
  Without a hook, `support.backgroundEffects` is `unsupported`.

## Background processor hook (wc07 task 7.2, written under VLBV, not yet run)

```ts
import { createBackgroundProcessorHook, createLiveKitRealtimeRoom } from "@know-meet/realtime";

const room = createLiveKitRealtimeRoom({
  videoProcessor: createBackgroundProcessorHook({
    tasksVisionFileSet: "/mediapipe/wasm", // directory holding the tasks-vision WASM files
    modelAssetPath: "/mediapipe/models/selfie-segmenter.tflite", // the pinned model
  }),
});
```

- **Export:** `createBackgroundProcessorHook(paths: BackgroundAssetPaths): VideoProcessorHook`
  from the main entry. `BackgroundAssetPaths` is `{ tasksVisionFileSet, modelAssetPath }`.
  Both are app configuration (task 7.1 serves the files); the package holds no asset URL.
  They go to every `BackgroundProcessor` the hook builds as `assetPaths`, so MediaPipe never
  uses its CDN defaults, which `connect-src` would block.
- **Effects:** `blur` is `switchTo({ mode: "background-blur" })` at the library's default
  radius (one strength, per the approved shape). `image` is
  `switchTo({ mode: "virtual-background", imagePath: imageUrl })`; pass the same-origin preset
  paths (`/backgrounds/ground.webp`, `/backgrounds/dusk.webp`, `/backgrounds/tide.webp`)
  through the domain `backgroundImage()`.
- **Lazy:** `@livekit/track-processors` (and MediaPipe) is dynamically imported on the first
  `apply`, so creating the hook costs nothing and a meeting without effects never fetches it.
  A failed import is forgotten so a later request can try again.
- **One processor per track:** the first effect builds the processor in `disabled` mode,
  sets it on the camera track, then switches to the effect; later effects on that track only
  call `switchTo`. `disabled` first is deliberate: the library only logs an image that fails
  during construction, but `switchTo` rejects, so a missing preset becomes a failure.
- **Failure:** if the library, WASM, model or image fails to load, the hook removes its
  processor before rejecting. The adapter reports `failed` (`effect-failed` from
  `setBackgroundEffect`) and the camera goes out unprocessed; the UI reverts to None.
- **Removal:** `remove` stops only a processor this hook set.
- `@livekit/track-processors` 0.8.3 is a dependency of this package; `apps/web` needs no
  direct import of it.

## Wire contract for other clients (Flutter must match)

| What              | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| Chat topic        | `lk.chat`                                                                     |
| Consent topic     | `know-meet.recording-consent` (never the chat topic)                          |
| Audience          | stream attribute `audience`: `private` or `everyone`                          |
| Private message   | `destinationIdentities` = exactly the one recipient, plus `audience: private` |
| Message id / time | the stream `id` and `timestamp`                                               |
| Consent payload   | the domain codec's JSON (`v: 1`) as the stream text                           |

A receiver cannot verify `audience`: the server does not tell it whether a stream was sent
to it alone. A modified client that marks a broadcast `private` would be shown as private
to every receiver. The label is only as honest as the sender.

## Browser support

Written against Chromium. Safari/WebKit (Tauri on macOS) and Firefox are unverified. If the
SDK reports WebRTC unsupported, `connect` returns `connection-lost`.

## Not handled

- Network-quality signals and connection stats in the snapshot.
- Simulcast tuning, capture constraints, bandwidth caps. E2EE.
- Device errors other than refusal (not found, in use) on enable are reported as
  `permission-denied`, because `MediaError` has no separate code.

## Layout

`src/realtime-room/` is the feature: `domain/` holds SDK-free rules (mapping, codecs, error
mapping, the effect plan), `application/` the snapshot store, media bindings and diagnostics,
`infrastructure/livekit/` everything that touches `livekit-client`, and
`infrastructure/browser/` the SDK-free browser reads exported as `@know-meet/realtime/browser`.

## Tests

`tests/unit` covers the SDK-free parts with hand-made stand-ins. The files in
`infrastructure/livekit/` are covered only by the boundary run.
