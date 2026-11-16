# ADR-0001: The RealtimeRoom and TokenIssuer ports

## Status

Accepted (architect, web-release phase, OpenSpec change `wr02-meeting-domain-and-ports`).
Not yet exercised: under VLBV nothing runs before the `wr09-release-boundary` run.

## Date

2026-11-15

## Context

The guest meeting (WR-1) needs start, join, leave and mute. Domain and application code
must not import `livekit-client` (boundary rule, Biome override on `**/domain/**` and
`**/application/**`). The LiveKit adapter lands later in `packages/realtime` (wr04), the
screens in wr05. The port has to be shaped so a `livekit-client` 2.x adapter can implement
it directly and so React can read it without glue.

The release contract fixes two facts the port must carry:

- The meeting room renders each remote participant's camera in a `<video>` and microphone
  in an `<audio>`, with the subscribed track as `srcObject`
  (`tests/release/README.md`, UI contract).
- A token request for a code the service never issued returns 404, and the client then opens
  no WebSocket (WR-1 negative case).

## Decision

1. **State is a snapshot plus a change signal.** `getSnapshot()` returns an immutable
   `RoomSnapshot` (connection state, local participant, remote participants) and returns the
   same object until something changes; `subscribe(listener)` signals changes. This is the
   `useSyncExternalStore` contract, so presentation reads the room with one hook and no
   adapter-specific events reach the UI.
2. **Media is attached through the port, not exposed.** `attachMedia(target, element)` binds
   an `HTMLMediaElement` to one participant's microphone or camera and returns a detach
   function. The adapter calls LiveKit's `track.attach(element)` when the track is subscribed,
   re-attaches when it is replaced, and clears the element when it goes away. Attaching the
   local microphone does nothing. The port names one DOM type (`HTMLMediaElement`, a platform
   type already in the application package's `lib`) and no SDK type.
3. **One media method.** `setMediaEnabled(kind, enabled)` covers microphone and camera; the
   adapter maps it to `setMicrophoneEnabled` or `setCameraEnabled`. After `connect` both are
   off until enabled.
4. **Failures are values.** Every port and use case returns `Result<T, E>` with `E` a subset
   of the domain `MeetingError` union (meeting-not-found, rate-limited, forbidden,
   invalid-request, permission-denied, connection-lost). Adapters map HTTP statuses, LiveKit
   connection errors and `MediaDeviceFailure.PermissionDenied` onto these codes and never
   throw for them. Copy lives in presentation.
5. **Join checks before it spends.** The join use case parses the code and name first; a code
   that cannot exist reports meeting-not-found without calling the issuer, and any issuer
   error returns before `connect` is called.
6. **Wire types stay with the adapter for now.** The HTTP envelope (`{ ok, data | error }`)
   is not a domain concept. The `TokenIssuer` port speaks domain types (`RoomCode`,
   `DisplayName`, `RoomCredentials`); the wr04 HTTP adapter validates responses against the
   release contract. `packages/contracts` (one schema generating TypeScript, Dart and
   Python) is deferred to its own ADR, when a second language consumes these types.

## Alternatives considered

### Expose `MediaStreamTrack` in the snapshot

- Pros: presentation sets `srcObject` itself; no attach method.
- Cons: LiveKit's adaptive stream measures the elements a track is attached to; bypassing
  `attach` loses that, and tracks are mutable objects inside an otherwise immutable snapshot.
- Rejected.

### Pass LiveKit `Track` or `Participant` objects through an opaque type

- Pros: no mapping.
- Cons: the type leaks by inference into presentation, and the Flutter adapter could never
  share the shape.
- Rejected.

### An event stream (`onParticipantJoined`, `onTrackSubscribed`, ...)

- Pros: mirrors the SDK.
- Cons: every consumer rebuilds state from events; React needs a snapshot anyway.
- Rejected.

### Create `packages/contracts` in this change

- Pros: the role's long-term home for cross-language types.
- Cons: needs a format ADR, a code generator and a new workspace package (a lockfile
  change), and no Dart or Python consumer of these types exists in this phase.
- Deferred.

## Consequences

- The fakes in `@know-meet/application/fakes` implement both ports, so wr05 can build the
  screens before the LiveKit adapter exists.
- The adapter owns the hard part: keeping element bindings correct across track
  replacement, reconnection and unsubscription. A bug there shows as a black tile, and no
  application test can catch it; only the WR-1 boundary run can.
- The uncomfortable part: `HTMLMediaElement` in a port ties it to the browser. The Flutter
  client will need its own media seam (a texture or platform view), so this port is shared
  in shape, not in code. If a non-browser TypeScript host appears, the element type becomes a
  type parameter.
