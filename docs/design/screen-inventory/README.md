# Screen inventory (OpenSpec c02, task 2.3; VS-7 scope)

The in-scope routes, screens and states for phase `hybrid-shell-foundation`,
with stable IDs that the c03 baselines, the VS-1 and VS-3 checks and the screen
changes (c09–c12) refer to.

| File | What it holds |
|---|---|
| [route-inventory.json](route-inventory.json) | Machine-readable inventory: one entry per route or state, with `id`, source file, hash, title, access, `inScope`, `scopeBasis`; plus the capture matrix and counts |
| [theme-behaviour.md](theme-behaviour.md) | How the theme is chosen, applied, switched and synced, and what each shell must reproduce |
| [source-hierarchy.md](source-hierarchy.md) | Which source wins when sources disagree, and the source-level discrepancies with their resolutions |
| [source-digests.json](source-digests.json) | sha256 of the 39 design source files read for c02 |

## Scope rule

Operator decision Q-A3 (2026-11-09): *app frame + static screens of home,
sign-in, join, dashboard, agents, recordings, settings + meeting-room layout with
media stubbed.* Applied as:

| Page | In scope | Basis |
|---|---|---|
| App frame (`frame.*`) | 7 states: signed out, signed in, account menu open, nav collapsed, nav open, skip link focused, theme toggle | "app frame" |
| `index.html` | 1 | "home" |
| `auth.html` | 5: sign in, sign up, check email, sign-in error, link sent | "sign-in" read as the whole sign-in page (see D-1) |
| `join.html` | 4 | "join" |
| `dashboard.html` | 8 routes + signed-out gate | "dashboard" |
| `agents.html` | 13 routes + signed-out gate | "agents" |
| `recordings.html` | 10 routes + signed-out gate (player media stubbed) | "recordings" |
| `settings.html` | 16 routes + signed-out gate | "settings" |
| `meet.html` | 2: `#room` (signed in), `#room-guest` | "meeting-room layout with media stubbed" |

**Counts:** 85 entries in total; **70 in scope** (59 routes from
`screens.html`, 4 signed-out gates, 7 frame states);
15 out of scope (`screens.html` itself, 10 other `meet.html` routes, 4 live-room
references). The capture matrix is 2 themes × 4 viewports (375, 768, 1024,
1440), so **560 baseline captures**.

Out of scope, kept in the inventory with `inScope: false` so IDs stay stable:
`meet.start`, `meet.lobby`, the six room panels (`meet.room.invite`,
`.transcript`, `.chat`, `.chat.with-marcus`, `.record-consent`, `.agents`),
`meet.ended`, `meet.processing`, `screens.default`, and the live room's start,
lobby, in-call and ended views (live media is a contract exclusion; VS-6 is
deferred). `live-room.in-call` is the layout reference for `meet.room`.

## ID rule

`<page>.<hash>` with `#` dropped and `:` replaced by `.`; `<page>.default` for a
page's main view; `<page>.gate-signed-out`; `frame.<state>`;
`live-room.<view>`. IDs are never reused. If a route is renamed in the prototype,
the old ID is retired and a new one added.

## Capture notes for c03

- Theme: set `localStorage['km-meet-theme']` before navigation.
- Sign-in: set `localStorage['km-auth']` to a JSON object with `name` and
  `email` for every `access: "sign-in"` entry; clear it for `guest`, `invitee`
  and the gate states.
- Freeze the clock: km.js builds sample meetings and recordings relative to now.
- Frame states need an interaction; the `how` field says which.
- Fonts: the prototype loads Google Fonts; the shells self-host the same
  families and weights (`packages/design-tokens/fonts/README.md`).

## Open decisions for the operator

| ID | Question | Default applied here |
|---|---|---|
| D-1 | Does "sign-in" mean the whole `auth.html` flow (5 states) or only `#sign-in` (and `#sign-in-error`)? | Whole flow, 5 states in scope. Narrowing removes 3 entries (24 captures). |
| D-2 | Are the room's side panels (invite, transcript, chat, private chat, recording consent, add agent) part of "meeting-room layout"? They are static UI, but their content implies LiveKit features that are excluded. Same question for `#start` and `#ended`. | Out of scope. Including the six panels adds 6 entries (48 captures). |

D-3 to D-5 (tokens and contrast) are in
[../token-reconciliation/README.md](../token-reconciliation/README.md).
