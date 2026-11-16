# Web release: design and accessibility acceptance

Owner: design-lead. Task: `wr01-release-scenarios` 1.3, phase `web-release`. This file
elaborates adopted scenario **WR-8** (`.kbd-orchestrator/phases/web-release/adopted-contract.json`)
and does not change it. It is the reference for `wr05` (5.1 to 5.4), the release specs
and the independent UI review at `wr09` 9.3.

Authority, in order: `docs/design/tokens.json` v1.5.0, `DESIGN.md`, `docs/design/brand-guide.html`,
`docs/design/prototype/` (v2), `docs/design/live/` (room layout reference). The root `live/`
folder is not a source. `PRODUCT.md` governs voice and audience. This is **refinement, not
redesign**: every state below reuses an existing prototype composition, an existing shared
component (`packages/ui/src/components/*`) and existing tokens. Where that is not enough,
the gap is an open decision (section 9), not an invention.

Prototype references use `file#route` and the element id, for example
`prototype/meet.html#lobby #preview-empty`.

## 0. Scope of the hosted build

- Reachable: **home** (`/`), **join lobby** (`/join`), **meeting room** (`/meet`). Every other
  path renders the not-found state (WR-5). The room code travels in the URL of `/join` and
  `/meet` (format owned by client-shell, wr06), so a shared link and a reload both work.
- Flow, both roles: home -> lobby -> room. "Start a meeting" asks the token service for a
  new code, then opens the lobby for it. "Join" opens the lobby for the typed code. The
  name is entered in the lobby only. There is no meeting name in this release.
- Not shipped: agents, dots, the Concierge, transcription and captions, recording, chat,
  screen share, invites by email/SMS/calendar/phone, sign-in. No UI may imply them.
- Room code format: the prototype's `km-` plus two groups of three `[a-z0-9]`
  (`km-4fq-82x`). If wr03 issues a different shape, the format check and the example
  string in section 7 change together (dependency on wr03 3.2).

## 1. State inventory

"Ref" is the prototype or live state the state is built from. "New" means the prototype
does not show it; its specification is in section 2.

### 1.1 Home (`/`)

| State | What the user sees | Controls | Ref |
|---|---|---|---|
| H1 default | App bar (brand, theme toggle). Hero: eyebrow, h1, lede, primary "Start a meeting", guest note; "Join with a code" card; hero illustration (O-2). Footer with brand and the release note (O-1). No feature sections. | Brand link, theme toggle, Start a meeting, code field, Join | `prototype/index.html` `.hero` (hero copy, `#join-form`, `figure.mini`) and `footer.site-foot` |
| H2 start in progress | Same page. The primary button shows the spinner and "Starting…"; it keeps focus and its place. Code field stays usable. | As H1; Start is `aria-disabled` and `aria-busy` | `prototype/join.html` `busy()` on a primary button ("Opening…") |
| H2e start failed | Below the hero actions, an error card with the cause and the fix (7.1). Start returns to rest. | As H1 | New: `live/room.html #lb-join-error` (`.error-card`) |
| H3 code invalid format | The field takes `control-invalid`; the field error line (alert icon in `red-text` + text) appears under the hint; focus returns to the field. Checked on blur and submit, never while typing. | As H1 | `prototype/index.html #join-error` with `prototype/join.html` `codeForm()` messages |

### 1.2 Join lobby (`/join`)

Layout is `prototype/meet.html#lobby` (`.lobby-main`: preview card beside the info column,
stacked below 1024) with the live additions from `live/room.html #v-lobby`: device pickers,
share card, media error card, join error card.

| State | What the user sees | Controls | Ref |
|---|---|---|---|
| L1 default, camera preview | Mirrored live preview in `#preview`; mic level meter running under the toggles; eyebrow "Your new meeting" (starter) or "You’re joining" (joiner); h1 "Meeting km-4fq-82x"; share card (code and link); name field; Join meeting; Cancel. | Mic toggle, camera toggle, Microphone select, Camera select, Copy join code, Copy join link, Your name, Join meeting, Cancel, theme toggle | `prototype/meet.html#lobby #preview`, `#meter`; `live/room.html #share-card`, `.dev-grid` |
| L2 camera off | `#preview-empty`: initials avatar from the typed name ("?" before a name), text "Your camera is off…". Camera toggle reads "Camera off". Meter still shows when the mic is on. | As L1 | `prototype/meet.html#lobby #preview-empty` |
| L3 permission prompt pending | Preview shows `#preview-empty` with the initials avatar and "Allow camera and microphone access in your browser’s prompt to see your preview." Toggles and selects are `aria-disabled` until the prompt resolves. Name field and Join meeting work. | Name, Join meeting, Cancel, Copy buttons | New, built on `#preview-empty` |
| L4 permission denied (camera, mic or both) | The blocked device’s toggle shows its off state; under the device pickers an error card names what is blocked and how to allow it (7.2). Join meeting stays enabled: the guest can join without camera, or listen only. Pressing a blocked toggle asks again; if still blocked the card stays. | As L1 | `live/room.html #lb-media-error`, `live-lobby.js` `mediaError()` |
| L5 no devices found | The missing device’s select shows one disabled option "No camera found" / "No microphone found"; its toggle is `aria-disabled` with the error card as its description. Join meeting stays enabled. | As L1 minus the missing device | `live/room.html #lb-media-error` ("not found"), `live-lobby.js` device list |
| L6 joining | Join meeting shows the spinner and "Joining…", `aria-busy`, `aria-disabled`, keeps focus. Name field is read-only. Cancel stays. | Cancel | `live-lobby.js` `joinNow()` ("Joining…") |
| L6e join failed | Error card above the buttons (`#lb-join-error`) with cause and fix (7.2); focus moves to the card heading; Join meeting returns to rest. | As L1 | `live/room.html #lb-join-error` |
| L7 meeting not found | The lobby is replaced by the centre card: search badge (`err`), h1 "We couldn’t find that meeting", the code tried in `code`, a "Meeting code" form prefilled with it and focused with the value selected, and "Start a meeting instead". Camera and mic are released. | Meeting code, Find meeting, Start a meeting, theme toggle | `prototype/join.html#wrong-code` (`viewWrongCode`) |

L7 shows when the token request for the code returns 404 (on Join meeting, and on load if
wr03 exposes a lookup). It never connects (WR-1 negative control).

### 1.3 Meeting room (`/meet`)

Layout is `prototype/meet.html#room-guest` reduced per section 3, with the connection
chip and audio banner from `live/room.html #v-room`.

| State | What the user sees | Controls | Ref |
|---|---|---|---|
| R0 connecting | Head with h1 "Meeting km-4fq-82x", meta "Connecting…", chip "Connecting…" (`amber-soft`). Own tile with preview or initials. | Mic, camera, Copy join link, Leave, theme toggle | `live/room.html #conn-chip` (`connecting`) |
| R1 alone, waiting | Own tile plus the share card in the next grid cell: heading "You’re the only one here", the code in `code-big`, Copy join code, the link in `link-box`, Copy join link, one line of copy (7.3). Chip "Connected". | As R0 plus the two copy buttons in the card | New: `live/room.html #share-card` composition placed in `.tile-grid` |
| R2 two participants | Two person tiles (own tile carries "(you)"), share card gone, meta "km-4fq-82x · 2 in the call". Speaking shows the `size-speak-badge` in the tile head (`speak-person`). | Mic, camera, Copy join link, Leave, theme toggle | `prototype/meet.html#room-guest` tiles; `live-room.js` `makePersonTile()` |
| R3 remote mic muted | Remote tile foot shows the muted badge (mic-off icon) beside the name; tile name gains ", muted". | As R2 | `prototype/meet.html` `.muted-badge` |
| R4 remote camera off | Remote tile shows the initials avatar on `tile` instead of video; name in the foot. | As R2 | `live-room.js` `updatePersonTile()` avatar branch |
| R5 local muted | Mic control shows mic-off, label "Unmute", fill `red-soft` (`.ctl.is-off`); own tile shows the muted badge. Camera off is the same pattern ("Start video"). | As R2 | `prototype/meet.html` `#ctl-mic`, `syncRoomControls()` |
| R6 reconnecting | Chip "Reconnecting…" (`amber-soft`, pip `pip-amber`); tiles keep their last frame; controls stay operable. | As R2 | `live/room.html #conn-chip` (`reconnecting`) |
| R6s sound blocked | Audio banner under the head: mic-off icon, text, "Turn on sound" (`btn-sm btn-primary`). | As R2 plus Turn on sound | `live/room.html #audio-banner` |
| R7 disconnected | Room replaced by the centre card: warn badge, h1 "You were disconnected", cause and fix, Rejoin (primary), Home (secondary). Camera and mic released. | Rejoin, Home, theme toggle | New: `prototype/join.html` `.center-card` (`#expired` layout) |
| R8 left | Centre card: h1 "You left the meeting", one line, Rejoin (primary), Start a new meeting, Home (ghost). | Rejoin, Start a new meeting, Home, theme toggle | New: `.center-card`; buttons from `live/room.html #v-ended` `.btn-row` |
| R9 leave dialog | Alert dialog "Leave the meeting?", "The meeting stays open for anyone still in it.", Stay (ghost), Leave meeting (`btn-danger`). | Stay, Leave meeting | `live/room.html #leave-dlg` minus "End for everyone" |

A reload on `/meet` keeps the `/meet` route (WR-2) and shows R8 with the line "Reloading
the page took you out of the meeting." Rejoin opens the lobby for the same code.

## 2. Specification of the states the prototype does not show

Only existing tokens and shared components. Component names are `packages/ui/src/components`.

- **H2e, L6e error cards.** The live `.error-card` composition: fill `red-soft` on the
  surface it sits on, radius `radius`, padding `s3` x `s4`, gap `s2`; row with `KmIcon`
  `alert` in `red-text` and a `strong` heading in `fg`; then a `text-sm` paragraph in `fg`.
  `role="alert"`. No stripe, no stroke (DESIGN.md replacements table).
- **L3 permission pending.** `#preview-empty` unchanged in layout; text swapped (7.2). The
  toggles and selects use `aria-disabled="true"` (not `disabled`, so they stay focusable and
  explain themselves through `aria-describedby` to the preview text). Disabled look is
  `opacity: 0.5` on the rest fill (DESIGN.md state order).
- **L5 no devices.** `NativeSelect` with one `<option disabled selected>`; the toggle is
  `aria-disabled` with `aria-describedby` pointing at the error card heading.
- **R1 share card.** Fill `surface` (panel level on the `bg` stage, step 1.16), radius
  `radius-tile` like a tile, same grid cell size as a tile (row stretch), content centred,
  padding `s5`, gap `s3`. Heading `text-lg` display face. Code: the `code-big` mono style.
  Link: `link-box` (fill `card`, mono `text-sm`, truncates). Copy buttons: ghost
  `Button size="icon"` (`icon-btn`, `size-target` 44). Text in `fg-sub`. No orb, no
  animation: the cyan waiting orb in `join.html#waiting` is reserved for agents.
- **R7, R8 centre cards.** The `join.html` `.center-card` (`center-card.tsx`) on the page
  ground, with the app bar of the lobby (brand link, theme toggle). Badge: `warn` with
  `KmIcon alert` for R7 (as `join.html#expired` uses `warn` with `clock`); none for R8. Buttons: `Button` primary, secondary,
  ghost, in a `btn-row`, full width below 768 like `join.html` `.join-row`.
- **R0, R6 connection chip.** The live chip, with its text always visible (no visually
  hidden text at any width; the title truncates first). Round `size-pip` pip:
  `pip-amber` on `amber-soft` while connecting or reconnecting, `pip-green` on
  `green-soft` when connected. Disconnected never shows as a chip; it is view R7.
- **Muted badge over video (R3, R5).** On an avatar tile, the prototype badge (`red-soft`
  fill, `mic-off` in `fg`). On a video tile, the translucent fill cannot be measured
  against unknown video, so the badge uses the opaque `danger-btn` fill with `on-danger`
  icon (existing tokens; O-6).

No new colour, font, radius, size or motion value is needed for any state above.

## 3. Removed versus the prototype room, and how the layout closes

| Prototype element (`prototype/meet.html`) | Release |
|---|---|
| Concierge, dot, agent and phone tiles | Removed; only person tiles |
| `.captions-wrap` captions bar | Removed |
| `aside.rsheet` (chat, transcript, knowledge, invite, private agent, Concierge) | Removed |
| `#ctl-share`, `#ctl-cc`, `#ctl-rec`, `#ctl-chat`, `#ctl-tx`, `#ctl-kb`, `#ctl-agents`, `#ctl-asst` | Removed (not hidden-but-present; no "later release" toasts) |
| `#ctl-invite` "Invite" | Replaced in the same slot by "Copy join link" (`link` icon) (O-4) |
| `#rec-ind`, `#rec-banner`, `#guest-chip`, `#kb-chip`, "Transcribing" meta | Removed; meta is "{code} · {n} in the call" |
| `#agents-dlg`, `#consent-dlg`, `#lock-dlg`, "End for everyone" | Removed |
| `#room-brand` link | Non-interactive mark (O-5) |

Closing the gap without looking broken:

- **Controls bar.** Three groups stay, so the prototype rhythm stays: clock (left,
  hidden below 900 as now), media group (mic, camera) centred, end group (Copy join link,
  Leave) right. Below 900 labels are visually hidden and controls are 48 px; at 375 the
  four controls fit one row without the sideways scroller. Leave keeps `danger-btn`.
- **Stage.** With no captions bar and no sheet, the stage spans the full width between
  head and controls with the existing page padding (`s5`, `s4` below 768). Columns follow
  `live-room.js` `colsFor`: one tile or one tile plus share card -> 2 columns at 481 px and
  up, 1 column at 480 px and below; two tiles the same. When the tiles do not fill the
  stage height, the grid is centred vertically instead of top-aligned (layout only, no new
  value), so 1440 x 900 does not show a block of empty ground under the tiles.
- **Per width.** 375: tiles stacked at 4:3, share card below the own tile, everything
  visible without scrolling at 375 x 812. 768: two columns at 16:10. 1024 and 1440: two
  columns at 16:10, grid centred. Both themes use the same levels: stage `bg`, tile `tile`,
  share card `surface`.
- **Home.** The feature bento, guest-or-signed-in table, Concierge section, meeting flow
  and the next-meeting card are removed (they describe excluded features or sample data).
  The hero keeps its two-column composition at 1024 and up (O-2) and the prototype’s own
  single-column layout below 1024. "Sign in" and "Your meetings" are removed from the hero.

## 4. Navigation in the hosted build

- DESIGN.md D-8 defines five destinations; four are excluded here, which leaves Home
  alone. A one-item bar or rail is noise, and DESIGN.md already says navigation never
  appears in the room or join flows. **The hosted build renders no primary navigation**:
  no bottom bar, no rail, no inline links, no account button, no Start meeting button in
  the app bar. Content gets no bottom-bar padding and no rail offset.
- The app bar stays on home and lobby (brand link to `/`, theme toggle), height
  `header-h` plus the top safe area, fill `bg`. The room keeps its own head.
- Movement between the three screens is by the flow controls only: Start a meeting and
  Join (home -> lobby), Join meeting (lobby -> room), Cancel and the brand (lobby ->
  home), Leave / Rejoin / Home (room -> lobby or home).
- The resize morph has nothing to morph; width classes still drive layout (grids, page
  padding) and the reflow at 600 and 1024 must cause no horizontal scroll.
- WR-5 says "Navigation shows only home, join and the meeting room". Read it as "every
  rendered link targets `/`, `/join` or `/meet`" (see conflict K-2).

## 5. Accessibility acceptance

### 5.1 Accessible names (exact strings)

These are the UX copy and the role/name locators. `{code}` is the room code, `{name}` a
display name. "Exact" means the full accessible name equals the string.

| Screen | Role | Exact accessible name |
|---|---|---|
| all | link | `Skip to content` (first focusable, home and lobby) |
| home, lobby, R7, R8, L7 | link | `Know Meet home` |
| all | button | `Switch to light theme` (in dark) / `Switch to dark theme` (in light) |
| home | heading level 1 | prototype hero h1 (O-1) |
| home | button | `Start a meeting` (rest) / `Starting…` (H2) |
| home | textbox | `Join with a code` |
| home | button | `Join` |
| lobby | heading level 1 | `Meeting {code}` |
| lobby | region | `Camera and microphone check` |
| lobby | video (`aria-label`) | `Your camera preview` |
| lobby | button | `Mic on` / `Mic off` |
| lobby | button | `Camera on` / `Camera off` |
| lobby | meter | `Microphone level` |
| lobby | combobox | `Microphone` |
| lobby | combobox | `Camera` |
| lobby, R1 | button | `Copy join code` |
| lobby, R1, room bar | button | `Copy join link` |
| lobby | textbox | `Your name` (required) |
| lobby | button | `Join meeting` (rest) / `Joining…` (L6) |
| lobby | link | `Cancel` |
| L7 | heading level 1 | `We couldn’t find that meeting` |
| L7 | textbox | `Meeting code` |
| L7 | button | `Find meeting` |
| L7, R8 | link | `Start a meeting instead` (L7) / `Start a new meeting` (R8) |
| room | heading level 1 | `Meeting {code}` |
| room | navigation | `Meeting controls` |
| room | region | `Participants` |
| room | timer | `Time in meeting` |
| room | status | connection chip text: `Connecting…`, `Connected`, `Reconnecting…` |
| room | group (tile) | `{name} (you)` for the own tile, `{name}` otherwise, then `, muted` and `, camera off` when they apply, for example `Sam Patel, muted, camera off` |
| room | button | `Mute microphone` / `Unmute microphone` |
| room | button | `Stop video` / `Start video` |
| room | button | `Leave` |
| R1 | heading level 2 | `You’re the only one here` |
| R6s | button | `Turn on sound` |
| R9 | alertdialog | `Leave the meeting?` |
| R9 | button | `Stay`, `Leave meeting` |
| R7 | heading level 1 | `You were disconnected` |
| R8 | heading level 1 | `You left the meeting` |
| R7, R8 | button | `Rejoin` |
| R7, R8 | link | `Home` |

Rules for the names:

- **Label in name (SC 2.5.3).** Every visible label is the start of the accessible name.
  Room camera is `Stop video` / `Start video`, the visible label, not "Turn camera off".
- **Toggles are action-named or state-named, never both.** Room mic and camera are action
  buttons whose name and visible label change; they carry **no** `aria-pressed`. Lobby
  toggles keep the prototype’s state labels (`Mic on`) with no `aria-pressed`. State is
  also shown by icon and fill and announced (5.3).
- **Busy buttons** keep focus: `aria-disabled="true"` plus `aria-busy="true"`, never
  `disabled`, so focus is not lost to `body`.
- Decorative icons, the brand mark in the room, avatars and speaking bars are
  `aria-hidden="true"`. "Speaking" is `sr-only` text inside the tile, not in the name.

### 5.2 Focus order and focus management

- **Home:** skip link, brand, theme toggle, Start a meeting, code field, Join, footer
  brand. Errors: focus returns to the code field (H3); the start error card is announced
  without moving focus (H2e).
- **Lobby (DOM order, also at 375 where the preview stacks first):** skip link, brand,
  theme toggle, Mic toggle, Camera toggle, Microphone select, Camera select, Copy join
  code, Copy join link, Your name, Join meeting, Cancel. No autofocus on load (the
  browser permission prompt owns attention). Invalid submit focuses Your name. L6e
  focuses the error heading (`tabindex="-1"`). L7 focuses the code field, value selected.
- **Room:** on entry focus moves to the h1 (`tabindex="-1"`, no visible focus fill on a
  heading that is not interactive is acceptable because it is not keyboard-operable).
  Order: Turn on sound (when shown), Copy join code and Copy join link in the share card
  (R1), theme toggle in the head, then the controls bar: Mute microphone, Stop video,
  Copy join link, Leave. The stage is not focusable unless it overflows (existing RV-23
  rule in `use-stage-layout.ts`). Tiles hold no controls in this release.
- **Dialog R9:** opens with focus on Stay; Tab cycles Stay, Leave meeting; Escape is
  Stay; the background is inert; closing returns focus to Leave.
- **R7, R8:** focus moves to the h1 when the view replaces the room.

### 5.3 Live-region announcements

One polite status region per screen, `role="status"` `aria-atomic="true"`, rendered empty
at mount and reused (stable region, then text update). No `aria-live` on the tile grid,
the meta line or the chip. Toasts announce through the same region.

| Event | Announcement (exact) |
|---|---|
| Remote participant joins | `{name} joined` |
| Remote participant leaves | `{name} left` |
| Remote mic off / on | `{name} is muted` / `{name} unmuted` |
| Local mic off / on (room) | `Your microphone is off` / `Your microphone is on` |
| Local camera off / on (room) | `Your camera is off` / `Your camera is on` |
| Lobby toggles | `Microphone off` / `Microphone on` / `Camera off` / `Camera on` |
| Connection drops | `Connection lost. Reconnecting…` |
| Connection restored | `Reconnected` |
| Copy | `Join code copied` / `Join link copied` / the copy failure line (7.3) |
| Starting / joining | none (the busy button name carries it) |

Remote camera changes are not announced; the tile name changes. Errors that block a task
(H2e, L4, L5, L6e) are `role="alert"` cards, not the status region. Field errors are
linked with `aria-describedby` and `aria-invalid`.

### 5.4 Keyboard

- Every control works with Tab, Shift+Tab, Enter and Space; selects with arrows. No
  single-key shortcuts (nothing to remap under SC 2.1.4). No keyboard trap outside the
  modal dialog; Escape closes it.
- Copy buttons, Leave and every busy button are reachable and report their result.

### 5.5 Targets

- Room controls at least 48 x 48 (56 high at 900 and up); icon buttons `size-target`
  44; primary actions `size-control-h` 48 (hero and lobby primary 52 as the prototype);
  `btn-sm` ("Turn on sound") only at `pointer: fine`, otherwise 44. Nothing below
  `size-target-min` 24. Spacing between adjacent room controls at least `s2`.

### 5.6 Fill contrast and focus (no outlines, rings or shadows)

Measured pairs from `docs/design/token-reconciliation/contrast-record.md` (dark / light):

| Control | Rest | Focus fill and its change |
|---|---|---|
| Primary button (Start, Join, Join meeting, Rejoin, Find meeting, Turn on sound) | `ember-btn` + `on-ember` (6.17 / 5.28) | `focus` + `on-focus`; change vs `ember-btn` 3.11 / 3.63 |
| Secondary button, room control at rest, Home | `card` + `fg` (text-identified) | `focus` vs `card` 14.22 / 19.21 |
| Ghost / icon button (copy, theme, Cancel, Stay) | transparent, icon `fg` | `focus` vs surfaces >= 14.22 / 14.24 |
| Leave, Leave meeting | `danger-btn` + `on-danger` | change vs `danger-btn` 4.82 / 3.97 |
| Text inputs, selects | `control` vs bg/surface/card >= 3.06 / 3.03; `on-control` 4.64 / 4.69 | `focus` vs `control` 4.64 / 4.69; `focus-placeholder` |
| Invalid field | `control-invalid` + `on-control-invalid` + error line | focus wins over invalid |
| Speaking badge | `speak-person` + `on-speak` | n/a (>= 3.10 on tiles, >= 3.68 on video) |
| Tile name over video | `media-tag-bg` + `on-media` | n/a |

**Not yet in the contrast record, must be added and pass before the boundary review**
(design-lead adds them to `packages/design-tokens/scripts/contrast-record.mjs`; measured at
the boundary, not now): R-1 `fg` icon and label on `red-soft` composited over `bg` (room
control off); R-2 `focus` vs that composite (>= 3:1); R-3 `fg` text and `pip-*` on
`green-soft` / `amber-soft` / `red-soft` composited over the room head fill (chip; text
4.5:1, pip 3:1); R-4 `red-text` icon and `fg` text on `red-soft` composited over
`surface` and over `bg` (error cards); R-5 `on-danger` on `danger-btn` as a 28 px badge
glyph (already 4.5:1 as button text; record it as a graphic). If any fails, the fix is an
open decision for the owner, not a new value chosen by an engineer.

Focus rule: the focused element itself takes `focus` and every piece of content on it
takes `on-focus` (RV-22..RV-25). Transitions `dur-fast` on `background-color` and
`color` only.

### 5.7 Reduced motion (`prefers-reduced-motion: reduce`)

- Spinners (`anim-spin`) stop; the busy text ("Starting…", "Joining…") carries the
  state.
- Speaking bars (`anim-voice-bar`) are static (`room.css` reduced rule, `scaleY(0.7)`);
  the badge still appears and disappears.
- Focus and hover transitions, toast enter and exit, dialog open and close: instant
  (`dur-reduced-motion`). No view transitions.
- The mic meter keeps updating (it is live information the user asked for) but with no
  easing transition.
- Live video is the participants’ own media and is not decorative motion; it is not
  paused.

### 5.8 Out of scope, stated plainly

- **No captions or transcript.** Deaf and hard-of-hearing participants have no text
  alternative for speech, and with chat excluded there is no text channel at all. This is
  a known gap of the release, not a WCAG conformance claim for live audio (SC 1.2.4).
- No speaker (output) selection: Safari and Firefox do not support choosing an output
  device. No noise suppression control. No sign-language pinning.
- Media behaviour at 375 px on phones is not verified (contract); only layout is.

## 6. Review rubric for the independent UI review (wr09 9.3)

The reviewer reads this file, DESIGN.md and the prototype room, not the build history.
Severity: **CRITICAL** blocks the release (WR-8 fails); **HIGH** must be fixed before
merge; **MEDIUM** is recorded as work to do.

| # | Check | Severity if it fails |
|---|---|---|
| U1 | axe at WCAG 2.2 AA reports a violation on any screen, state, theme or width in the matrix | CRITICAL |
| U2 | A control cannot be reached or operated by keyboard, or focus is lost to `body` (busy buttons, view swaps) | CRITICAL |
| U3 | Focus is shown by an outline, ring, border or shadow, or not shown | CRITICAL |
| U4 | Any border, outline, `box-shadow`, `<hr>` or thin-line pseudo-element on the three screens (DESIGN.md scan, count must be 0) | CRITICAL |
| U5 | A control, link, panel or copy line refers to an excluded feature (agents, dots, Concierge, recording, transcript, captions, chat, share, invites, sign-in, sample data, "prototype" or "simulated" text) | CRITICAL |
| U6 | Motion continues under reduced motion (spinner, bars, transitions) | CRITICAL |
| U7 | Horizontal page scroll at any matrix width | HIGH |
| U8 | A colour, font, radius, size or duration in the screens is not a token (ad-hoc hex, literal px for a token role, `brightness()` filter on a state) | HIGH |
| U9 | An accessible name differs from 5.1, or a visible label is not the start of its name | HIGH |
| U10 | A state in section 1 is missing or differs in composition from its Ref | HIGH |
| U11 | State shown by colour alone (chip text hidden, muted shown only by fill) | HIGH |
| U12 | A live-region announcement in 5.3 is missing, duplicated or `assertive` | HIGH |
| U13 | Dark and light do not use the same levels (stage `bg`, tile `tile`, card `surface`) or a light level is inverted | HIGH |
| U14 | Layout looks unfinished: empty slot where a removed control was, top-heavy stage at 1440, orphan group in the controls bar, hero hole | HIGH |
| U15 | Error or empty copy differs from section 7 or does not give cause then fix | MEDIUM |
| U16 | Target below 44 for a touch control (`pointer: coarse`) | MEDIUM |
| U17 | Type scale, eyebrow or spacing rhythm differs from the prototype on the same composition | MEDIUM |

Screenshot matrix (file name `{screen}--{state}--{theme}--{width}.png` in the dated
evidence folder that WR-8 names):

| Tier | States | Themes | Widths | Images |
|---|---|---|---|---|
| Full | H1, L1, R1, R2 | dark, light | 375, 768, 1024, 1440 | 32 |
| Spot | H2, H2e, H3, L2, L3, L4, L5, L6, L6e, L7, R3, R4, R5, R6, R6s, R7, R8, R9 | dark, light | 375, 1440 | 72 |
| Total | | | | 104 |

Where each state comes from at capture time (for bdd-quality; no test code here): L3
holds while the permission prompt is open (do not pre-grant); L4 with permissions denied
for the context; L5 with no fake devices; L7 with a well-formed code never issued; R6 by
taking the context offline briefly; R7 by keeping it offline past the reconnect window;
R6s with autoplay blocked (WebKit); R3, R4 by acting in the second context. A state that
cannot be produced on a browser is reported `NOT_EXERCISED`, never substituted.

## 7. Copy

Voice (`docs/design/README.md`): plain, calm, explicit; errors give the cause, then the
fix; sentence case; no apology, no "oops". Curly apostrophes and the single ellipsis
character `…`.

### 7.1 Home

| Where | String |
|---|---|
| Code empty on submit | `Enter the meeting code, for example km-4fq-82x.` |
| Code invalid format | `Codes look like km-4fq-82x: “km”, then two groups of three letters or numbers, joined by hyphens.` |
| Code hint (O-1) | `Ask the person who started the meeting for the code.` |
| Start failed, service unreachable | heading `Couldn’t start a meeting`; text `The meeting service didn’t answer. Check your connection, then try again.` |
| Start refused, rate limit (429) | heading `Too many new meetings`; text `This network started too many meetings in a short time. Wait a minute, then try again.` |

### 7.2 Lobby

| Where | String |
|---|---|
| Name hint | `Shown on your tile.` |
| Name empty | `Enter your name so others know who you are.` |
| Preview, camera off | `Your camera is off. Turn it on to check how you look before you join.` |
| Preview, prompt pending | `Allow camera and microphone access in your browser’s prompt to see your preview.` |
| Camera blocked | heading `Camera access is blocked`; text `Allow the camera in your browser’s site settings for this page, then turn it on again. You can still join without it.` |
| Microphone blocked | heading `Microphone access is blocked`; text `Allow the microphone in your browser’s site settings for this page, then turn it on again. You can still join and listen.` |
| Both blocked | heading `Camera and microphone access are blocked`; text `Allow them in your browser’s site settings for this page, then turn them on again. You can still join and listen.` |
| No camera | option and heading `No camera found`; text `Plug one in, then pick it from the Camera list. You can still join without it.` |
| No microphone | option and heading `No microphone found`; text `Plug one in, then pick it from the Microphone list. You can still join and listen.` |
| Device in use | heading `Your camera is in use by another app` (or `microphone`); text `Close the other app, then turn it on again.` |
| Join failed, service unreachable | heading `Couldn’t join the meeting`; text `The meeting service didn’t answer. Check your connection, then select Join meeting again.` |
| Join failed, media connection | heading `Couldn’t connect to the meeting`; text `Your network may be blocking video calls. Try another network, then select Join meeting again.` |
| Join refused, rate limit (429) | heading `Too many join attempts`; text `This network tried to join too many times in a short time. Wait a minute, then try again.` |
| Share card line | `Anyone with the code or link joins from their browser. No account needed.` |
| Not found (L7) | h1 `We couldn’t find that meeting`; text `No open meeting uses the code {code}. Check each character with the person who shared it: 0 and o, or 1 and l, are easy to mix up.` |

### 7.3 Room and not-found route

| Where | String |
|---|---|
| R1 heading and line | `You’re the only one here` / `Share the code or link. People join from their browser, no account needed.` |
| Sound blocked banner | `Your browser blocked sound from the meeting until you click.` |
| R7 | h1 `You were disconnected`; text `The connection dropped and couldn’t be restored. Check your network, then rejoin.` |
| R8 | h1 `You left the meeting`; text `The meeting stays open for anyone still in it. Rejoin with the same code while it’s open.` |
| R8 after reload | `Reloading the page took you out of the meeting.` |
| Leave dialog | `Leave the meeting?` / `The meeting stays open for anyone still in it.` |
| Mic or camera failed in the room | `Couldn’t turn on your microphone. Another app may be using it.` (or `camera`) |
| Copy failed | `Couldn’t copy. Select the code and copy it yourself.` |
| Not-found route (client-shell) | h1 `This page isn’t available`; text `This site has the home page and meetings only.`; link `Home` |

## 8. The uncomfortable point

The release ships the shell of a product whose whole identity is agents, and none of the
agents. The Know Meet mark means "an agent is at the table"; the prototype hero promises
"agents do the follow-through"; the room composition was designed around agent tiles,
captions and a panel. Strip those and what remains is a plain two-person video call that
is visibly less capable than the free tools every visitor already has: no captions, no
chat, no screen share, no recording. Fidelity to the prototype makes this worse, not
better, because a faithful room with the agent parts removed reads as a room with parts
missing.

Two risks follow. First, honesty: if the home page keeps its current copy, the public URL
overclaims on day one, and U5 should fail the review. That needs owner copy decisions
(O-1, O-2) before 5.1 builds, not after. Second, accessibility: with captions and chat
excluded, the release is less usable for deaf and hard-of-hearing visitors than the
prototype was designed to be, and passing axe will not show that. A green WR-8 means the
three screens are well built, not that the meeting is accessible to everyone.

## 9. Open decisions for the owner

| # | Decision | Default the engineers build until answered |
|---|---|---|
| O-1 | Home copy in the hosted build. The hero eyebrow, h1 and lede promise agents; the guest note promises the Concierge and transcription; the join hint mentions email/SMS/calendar invites; the footer says "Prototype … simulated". | Keep eyebrow and h1 (owner-approved brand line). Proposed for approval: lede `Start a video meeting in your browser and share the code. Agents, transcripts and summaries come next.`; guest note `No account needed. Guests start and join meetings in the browser.`; hint as 7.1; footer `Know Meet on this site runs real video meetings on LiveKit. Agents, transcripts and summaries are not in this release.` Footer links to excluded screens removed. |
| O-2 | Hero illustration (`figure.mini`) shows agents, a dot and a REC chip. | Same composition with four human tiles only, no REC chip, no orb or agent glyph, caption updated. Alternative: remove it and use the single-column hero at every width. |
| O-3 | No meeting name in the release. | h1 and document title `Meeting {code}`. |
| O-4 | Invite panel removed, but people need the link after the first person joins. | "Copy join link" control in the Invite slot. |
| O-5 | The room brand link leaves the call without asking. | Non-interactive mark in the room. |
| O-6 | Muted badge over video. | `danger-btn` / `on-danger` on video tiles, prototype `red-soft` on avatar tiles. |
| O-7 | Leave confirmation. | Keep the prototype dialog (Stay / Leave meeting). |
| O-8 | Connection chip wording. | `Connected` (live uses `Live`, which reads as broadcast or recording). |

No open decision asks for a new token. If R-1 to R-5 fail when measured, the fix comes
back here as a new decision.

## 10. Conflicts found between DESIGN.md, the prototype, live/ and AGENTS.md

- **K-1 Toggle semantics.** `prototype/meet.html` `#ctl-mic` / `#ctl-cam` set
  `aria-pressed` and also change the name ("Mute microphone" / "Unmute microphone"). The
  current app (`apps/web/src/presentation/meeting-room/presentation/room-controls.tsx`)
  does the same and names the camera "Turn camera off" while the visible label is "Stop
  video", which fails SC 2.5.3. Resolution in 5.1: action names, no `aria-pressed`.
- **K-2 Navigation.** DESIGN.md D-8 puts five destinations wherever the app bar appears;
  the hosted build excludes four. WR-5’s "Navigation shows only home, join and the
  meeting room" conflicts with DESIGN.md’s "never appears in the room or join flows".
  Resolution in section 4: no primary navigation; WR-5 read as rendered links.
- **K-3 Colour-only state in live/.** `live/assets/live.css` hides the connection chip
  text under 768 (`.conn-chip .txt` visually hidden), leaving the pip colour as the only
  cue, against DESIGN.md "state is never colour alone". Resolution: text always visible.
- **K-4 Cyan for a human state.** `prototype/join.html#waiting` uses the cyan orb for a
  person waiting; DESIGN.md reserves cyan for agents and dots. Not used in this release.
- **K-5 Stale live/ notes.** `live/README.md` still describes an "active-speaker ring"
  (DESIGN.md replaced rings with the speaking badge), and `live.css` hardcodes `#FCA5A5`
  where the `media-quality-poor` token exists. Documentation and reference drift only.
- **K-6 Home leave hazard.** The prototype room’s brand link and the current app’s
  `Link to="/"` Leave control end the call with no confirmation (O-5, O-7).
- **K-7 Ad-hoc state value.** The current room control "off" hover uses
  `brightness-[1.12]`, a filter value that is not a token (U8).
