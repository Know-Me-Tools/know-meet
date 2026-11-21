# Closure packet — web-conferencing-features

Disposition: **CLOSED** (budget-exhausted). This packet is a derived view of
the bound contract (sha256:3bf75c23c434b5fa6c872ace1f952400be0ccf2d917f26e29100222730f83d57) and
`boundary-results.json` (sha256:90b935bc7a57f53395df01069e928892bccc0fe2314740fe84b6750e2e0f2424); the canonical KBD disposition is authoritative.

## What works, and for whom

- WC-1 — Screen share reaches the other participant and stops cleanly
- WC-2 — A message to everyone reaches every participant
- WC-3 — A private message reaches only its recipient
- WC-4 — Blur and image backgrounds show remotely and turn off cleanly
- WC-5 — Chosen microphone and camera are the ones used
- WC-6 — Speaker choice works where supported and is explained where not
- WC-7 — History survives a reload and never leaves the device
- WC-8 — A consented recording runs, saves locally and plays back
- WC-9 — A declined consent means no recording
- WC-10 — The hosted page serves the new web CSP and nothing else is widened
- WC-11 — Entity graph 5.0.1 from npm, and notes still work
- WC-12 — Enable audio appears when autoplay is blocked and starts audio
- WC-13 — New controls are accessible and match the approved designs
- WC-14 — Repository rules hold and the other shells still build

## Under which conditions

- environment: Web only, hosted at https://meet.know-me.tools behind the existing gateway and continuous deployment
- environment: Current desktop Chrome, Edge, Firefox and Safari; controls a browser cannot support are hidden or explained
- environment: Phone browsers: chat, devices and history in layout; screen share and effects shown as unavailable where the browser cannot do them; media behaviour on phones not verified
- environment: Media: the existing LiveKit Cloud project
- WC-1 real collaborator: LiveKit Cloud project
- WC-1 real collaborator: services/livekit token service
- WC-1 real collaborator: web image
- WC-1 real collaborator: Chromium with fake media and auto-accepted screen capture
- WC-2 real collaborator: LiveKit Cloud project
- WC-2 real collaborator: token service
- WC-2 real collaborator: web image
- WC-3 real collaborator: LiveKit Cloud project
- WC-3 real collaborator: token service
- WC-3 real collaborator: web image
- WC-4 real collaborator: LiveKit Cloud project
- WC-4 real collaborator: web image with self-hosted MediaPipe assets
- WC-4 real collaborator: hosted CSP header
- WC-5 real collaborator: LiveKit Cloud project
- WC-5 real collaborator: web image
- WC-5 real collaborator: Chromium fake devices
- WC-6 real collaborator: web image
- WC-6 real collaborator: LiveKit Cloud project
- WC-7 real collaborator: web image
- WC-7 real collaborator: PGlite in the browser
- WC-7 real collaborator: LiveKit Cloud project
- WC-8 real collaborator: LiveKit Cloud project
- WC-8 real collaborator: web image
- WC-8 real collaborator: OPFS
- WC-8 real collaborator: MediaRecorder
- WC-9 real collaborator: LiveKit Cloud project
- WC-9 real collaborator: web image
- WC-10 real collaborator: web image
- WC-10 real collaborator: gateway header filter
- WC-10 real collaborator: tauri.conf.json
- WC-11 real collaborator: npm registry
- WC-11 real collaborator: pnpm lockfile
- WC-11 real collaborator: web image
- WC-12 real collaborator: LiveKit Cloud project
- WC-12 real collaborator: web image
- WC-13 real collaborator: web image
- WC-14 real collaborator: repo-rules tooling
- WC-14 real collaborator: turbo

## Limits

- none

## What remains

- nothing: every scenario passed

## Pre-authorization runner artifacts

- no runnerOutputGlobs declared in the contract; scan not possible

This scan is passive evidence (VLBV 04, 10): it reports and never blocks.

## Closure states

| State | Value |
|---|---|
| Implementation complete | false |
| Behavior accepted | true |
| Release eligible | true |
| Release authorized | false (a separate owner decision) |

Method: VLBV.
Executed by: not recorded in boundary-results.json.
