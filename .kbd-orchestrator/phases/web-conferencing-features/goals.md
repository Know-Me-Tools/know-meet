# Goals: web-conferencing-features

Started: 2026-11-18T07:25:31Z, as the signed successor of `web-release`
(authorization: `web-release/start-successor-web-conferencing-features.manifest.json` and its `.sig`).

## Operator goals (2026-11-18)

- **Scope:** the React 19 web app live at https://meet.know-me.tools. Desktop
  (Tauri) and mobile (Flutter) are out of scope for this phase.
- **Screen sharing:** a participant can share a screen, window or tab with
  everyone in the meeting, and stop sharing.
- **Chat:** participants can send text messages to everyone in the meeting at
  once, or privately to one specific participant.
- **Background effects:** a participant can blur their background or replace it
  with an image.
- **Device and source management:** choose and configure the microphone, camera
  and speaker (sound output), including levels and preview, before and during a
  meeting, plus an "Enable audio" prompt when the browser blocks autoplay
  (operator, 2026-11-18).
- **Client-only history (operator, 2026-11-18, during assess):** keep a
  local-only history of all sessions, chats and related records in the browser,
  using PGlite through the hybrid-mobile-architecture local-first pattern
  (`pem-local-first`: PEM entities over a PGlite `idb://` store). Nothing in this
  history leaves the device.
- **Client-side recordings (operator, 2026-11-18, during assess):** record
  meetings in the browser and keep the recordings in the app's local storage, as
  an initial attempt at recording without LiveKit (no LiveKit Egress), so a free
  version is possible.
- **Entity graph 5.0.0 from `main` (operator, 2026-11-18, during assess):**
  update every entity-graph and prometheus-entity-management dependency to 5.0.0,
  taken from the `main` branch of `Prometheus-AGS/prometheus-entity-management`,
  not from a tag or registry release, because `main` carries needed updates.
- **Constraints carried forward:** secrets stay server-side and clients receive
  short-lived tokens. Follow the full KBD process (assess, analyze, plan, execute,
  reflect) with OpenSpec changes.

These goals become blocking scope only when this phase's contract is adopted.

## Reflection proposals carried from `web-release` (not adopted scope)

- Harden continuous deployment (branch protection with a deploy-bot bypass, a
  dedicated AppProject, deploy by digest). A follow-up session has PR #13.
- Fix the Flutter golden failures in CI. A follow-up session is open.
- Decide whether to turn on NetworkPolicy enforcement for the node pool.
- Add an "Enable audio" prompt. This is close to the device-management goal;
  decide in assess whether to fold it in.
- Plan the next product slice: sign-in, then the Concierge. The draft OpenSpec
  change `mc01-signed-in-meeting-creation` on `main` belongs to that slice.

## Next

```
/kbd-assess web-conferencing-features
```
