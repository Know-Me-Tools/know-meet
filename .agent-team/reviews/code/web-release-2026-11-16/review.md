# Independent code review: web release (boundary task 9.3, code part)

- Reviewer: independent-reviewer role (read-only; same model family, harness-native; no
  cross-model judge reachable). Saved by the lead. Scope: files at 3b02b792; CD job (e059e1db) not covered.
- **Verdict: BLOCK** (1 CRITICAL, 2 HIGH, 4 MEDIUM, 4 LOW).

## CRITICAL
- **C1. Back navigation leaves the guest broadcasting.** Only the Leave button calls `leave()`
  (`apps/web/src/presentation/meeting-room/presentation/room-view.tsx:100`); nothing leaves on
  unmount (`meeting-room-screen.tsx:23-55`). Back to the lobby keeps mic and camera live in the call.
  Fix: leave in an unmount effect while connected or connecting; add a WR-1 step for Back.

## HIGH
- **H1. Three sources for the LiveKit URL in the cluster, never compared:** `vars.KM_LIVEKIT_URL`
  (bundle meta CSP, `images.yml:95`), the committed Gateway CSP (`security-headers.yaml:15`), and
  the Secret's `LIVEKIT_URL` (`token-service.yaml:51-55`). Any mismatch blocks `room.connect` by CSP.
  Fix: assert all three equal in the boundary run.
- **H2. Release prerequisites open at HEAD:** staging issuer (`certificate.yaml:31`), placeholder tags
  (`kustomization.yaml:19,21`), GHCR packages private. By design; make them explicit gates before 9.4.

## MEDIUM
- M1. A join in flight navigates after the lobby unmounts (`use-join-meeting.ts:45-63`); no abort.
- M2. Autoplay-blocked remote audio has no recovery control (`livekit-realtime-room.ts:165-167`).
- M3. CSP allows only the project host; LiveKit regional failover hosts would be blocked (unverified).
- M4. `RealtimeRoom.attachMedia` names `HTMLMediaElement` in the application port (`ports.ts:102`).

## LOW
- L1. Hosted CSP keeps `ipc:` and `http://ipc.localhost`.
- L2. Dev proxy targets port 3000; the service binds 8080 (local development only).
- L3. Rate limiting depends on `externalTrafficPolicy: Local` on the Envoy Service (unverified).
- L4. Health probes write a log line each.

## Checked and found sound
Ports, probes, Services and route split; image names and SHA-only tags; pod security; Gateway and
Certificate wiring; token-service request gate and scoping; guest flow deep links; realtime adapter
listener and media binding hygiene; layer boundaries; repository rules; no secrets in manifests.
