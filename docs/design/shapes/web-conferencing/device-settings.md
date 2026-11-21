# Shape: device settings (lobby and room)

Task 5.1 (lobby) and 5.2 (room). Scenarios WC-5, WC-6, WC-13. Mode: Operate.
Status: approved 2026-11-18 (batch 2, decision `batch2-approval-web-conferencing-features`). Shared rules and acceptance A-1 to A-7 are in
[README.md](README.md).

## 1. Job and audience

- **Who:** anyone about to join or already in a meeting on meet.know-me.tools:
  guests, invitees, people on a laptop with a headset, a USB camera or a docked
  monitor with its own speakers.
- **Situation:** the lobby, seconds before joining ("is the right mic on?"), or the
  room, mid-call, after "we can't hear you" or after plugging in a headset.
- **Primary job:** pick the microphone, camera and (where the browser allows) speaker,
  and see that they work: a moving level, a live preview, a test sound.
- **Success:** the device picked in the lobby is the one live after joining (WC-5);
  a switch in the room takes effect without leaving; a browser that cannot choose a
  speaker says so instead of offering a control that fails (WC-6).

## 2. Selected direction

Incumbent world, no new visuals. Two placements of one set of field components:

- **Lobby:** two pickers (Microphone, Camera) added to the existing preview card
  (`lobby-preview.tsx`, prototype `#v-lobby .preview-card`) under the Mic and Camera
  toggles, above the level meter. The preview and meter already exist.
- **Room:** a new **Settings** control in the room bar opens the existing side sheet
  (`.rsheet`, the same component wc04 uses for Chat) on a pane titled
  "Audio and video". The pane holds Microphone, Speaker, Camera and, under the camera
  preview, the Background section from [background-effects.md](background-effects.md).

Why the side sheet: it is the prototype's only in-room surface for secondary work
(chat, transcript, invite), it keeps the stage visible while testing, and it becomes
the prototype bottom sheet below 768 with no new pattern.

**Assumption:** the speaker picker is room-only (the spec lists lobby mic and camera
only). A lobby speaker test is an open question.

## 3. Scope and boundaries

- In: pickers, level meter, camera preview, speaker picker and test sound, device
  change and loss handling, permission states, the Settings control and pane.
- Untouched: the lobby layout, toggles, name field, join button and error card; the
  room stage, head, captions and existing controls; the prototype files.
- Not in this phase: remembering the last choice across visits (**Assumption:** not
  persisted; WC-5's negative control expects the default in a fresh profile), audio
  processing toggles (noise suppression, echo cancellation), resolution choice.
- Anti-goals: a modal settings dialog that hides the stage; a device menu that only
  appears on hover; a speaker control that throws in Firefox or Safari.

## 4. Layout per breakpoint

### Lobby (`/join` focused layout, page column)

| Width | Layout |
|---|---|
| 375 | One column (prototype `bp-1023` collapse). Preview card first: 16:9 preview, toggle row (wraps), then **Microphone** field, **Camera** field, each full width, then the level meter row, then the device error card if any. Lobby info and join form follow below. |
| 768 | Same single column, page padding per `bp-767`; fields stay full width of the card (max 640 inside the page). |
| 1024 | Two columns (`lobby-main`): preview card left, info and form right. Fields sit inside the left card under the toggles, stacked. |
| 1440 | As 1024 inside `page-max`; nothing stretches beyond the card. |

Field order inside the card: preview, toggles, Microphone, level meter, Camera.
(Meter sits under its microphone so the feedback is next to its control.)

### Room (`/meet`, Settings pane)

| Width | Sheet | Pane content |
|---|---|---|
| 375 | Bottom sheet (prototype `max-width: 767px` rule): full width, top radius `radius-lg`, fill `bg-2`, scrim over the stage, max height 85vh, content scrolls inside `.rsheet-scroll`. | One column. |
| 768 | Side sheet over the stage with scrim (prototype `max-width: 1199px`), width `rs-w`. | One column. |
| 1024 | As 768. | One column. |
| 1440 | Side sheet docked beside the stage, no scrim (prototype default). | One column. |

Pane anatomy (top to bottom):

1. Sheet head: eyebrow "Settings", title "Audio and video" (`h2`, `tabindex=-1`,
   receives focus on open), lede line "Only you see these settings." Close button.
2. **Audio** (`h3`): Microphone field; level meter; Speaker field with a secondary
   `sm` button "Play test sound", or the speaker note where unsupported.
3. **Video** (`h3`): Camera field; 16:9 self preview (mirrored, `tile` fill when the
   camera is off, with the lobby's initials avatar and "Your camera is off" line);
   Background section (see its brief).

### Room bar

New control **Settings** (icon `settings`, label "Settings"), a panel control
(`aria-controls` the sheet, `aria-expanded` true while its pane is open), placed in
the end group after Chat and before Copy join link. Rest `control`, open state
`selected` + `on-selected` (the room bar's panel-open state), focus `focus`. Below 900
the label is visually hidden and stays in the name. Overflow at 375: see open
question 3 in README.

## 5. Components and tokens

| Part | Component | Tokens |
|---|---|---|
| Device field | kit `Field` + `Label` + `NativeSelect` (native `<select>`; menus are the OS list, best for long device names and screen readers) | `control` / `on-control`, hover `control-hov`, focus `focus` / `on-focus`, height `size-control-h` (48), padding `size-input-pad-x`, end padding `size-select-pad-end` |
| Field label | visible `<label>` above, 14px semibold `fg` | `fg` |
| Field hint / status line | `small`, `fg-sub`, or `red-text` with `alert` icon when invalid | `fg-sub`, `red-text` |
| Level meter | existing `role="meter"` bar | track `muted`, fill `meter-fill` (tokens v1.6.0, approved 2026-11-18), height 8, radius pill, `dur-meter` linear |
| Self preview | `<video>` in a `radius-lg` box | `tile` (empty), `media-bg` behind video |
| Test sound button | kit `Button` secondary, `sm` under `pointer: fine`, else default | `card` / `fg`, hover `card-hov`, focus `focus` |
| Speaker note | neutral note: `surface` fill, `info` icon, text (not a warning; nothing is wrong) | `surface`, icon `fg-sub`, text `fg` |
| Sections | `h3` 16px semibold, `s5` between sections, `s3` within | spacing only, no rules |
| Settings control | room `Ctl` (`room-controls.tsx`) | `control`, `selected`, `focus` |

Sheet surface is `bg-2` (chrome); controls on `bg-2` are allowed (`control` vs
`bg-2` 3.90 dark / 4.09 light).

## 6. States

| State | Lobby | Room pane |
|---|---|---|
| Permission not yet asked or prompt open | Pickers disabled (`aria-disabled`, focusable, described by "Allow camera and microphone to choose a device."). Existing pending preview copy stays. | n/a (permission was granted or denied in the lobby). |
| Loading device list | Selects show their current choice text "Default microphone"/"Default camera" and stay usable; no spinner (enumeration is fast). | Same. |
| Ready | Select lists devices by browser label; first option is the system default, labelled "Default (<label>)" where the browser reports it. Meter moves while mic is on. | Same, plus speaker list. |
| Mic or camera toggled off in lobby | That picker stays enabled (choice applies when turned on); meter hidden; preview shows initials. | Picker enabled; choosing a device while muted keeps it muted. |
| Permission denied | Pickers for the denied kind hidden; the existing `ErrorCard` (cause then fix) remains the only message. | Field replaced by the line "<Microphone/Camera> blocked by the browser. Allow it in the address bar's site settings, then reopen this panel." |
| No device of a kind | Select disabled with single option "No microphone found" / "No camera found"; hint "Connect one and it appears here." | Same. |
| Device unplugged | Selection falls back to the default; polite announcement "<Label> disconnected. Using <default label>." Select shows the new value. | Same, plus a toast with the same text (toast style: `fg` fill, `bg` text). |
| New device plugged in | List updates in place; selection unchanged; no announcement. | Same. |
| Switch in progress | Select stays enabled; preview keeps the last frame. | Same; the Ctl state for the kind is unchanged. |
| Switch failed (device busy, constraint error) | Select returns to the previous device; error line under the field: "Couldn't use <label>. Another app may be using it. Close it and try again." `aria-invalid` on the select, `control-invalid` fill. | Same. |
| Speaker supported (`setSinkId` present) | n/a | Speaker select plus "Play test sound" (plays a short tone through the chosen output; button label becomes "Playing..." and `aria-disabled` for the tone's 1.5 s). |
| Speaker unsupported | n/a | No select. Text under the Speaker heading: "This browser plays meeting audio through your system's sound output. To change it, use your computer's sound settings." The text sits in a `role="status"` element, so it is announced once when the pane opens. |
| Effects section | n/a | See background-effects.md. |

## 7. Copy

- Labels: "Microphone", "Camera", "Speaker". Section heads "Audio", "Video".
- Default option: "Default (<device label>)", or "System default" when the label is
  empty.
- Settings control: name "Settings", `aria-expanded` per state. Sheet title "Audio
  and video"; lede "Only you see these settings."
- Lobby disabled hint: "Allow camera and microphone to choose a device."
- Announcements: "Microphone changed to <label>." / "Camera changed to <label>." /
  "Speaker changed to <label>." after a successful switch (polite, room and lobby).

## 8. Interaction

- Changing a select switches immediately; there is no Apply button.
- Lobby choice is carried into the join (task 2.3); the room opens with it active.
- Opening the Settings pane: focus moves to the pane title; Escape or Close returns
  focus to the Settings control. Opening another pane (Chat) replaces this one, as in
  the prototype.
- The pane's self preview and meter run only while the pane is open (stops the extra
  analyser and video element when closed).
- Sheet slides with `dur-panel` / `ease-out`, exits with `dur-exit` / `ease-in`
  (prototype); instant under reduced motion.

## 9. Accessibility acceptance (WC-13, in addition to A-1 to A-7)

- DS-1 Each select has a visible label bound by `for`/`id`; accessible names are
  exactly "Microphone", "Camera", "Speaker".
- DS-2 The meter is `role="meter"` named "Microphone level", `aria-valuemin` 0,
  `aria-valuemax` 100, `aria-valuenow` updated at most 10 times a second (no live
  region). It is hidden (`hidden`) when the mic is off.
- DS-3 Lobby focus order: Mic toggle, Camera toggle, Microphone, Camera, then the
  join form. Room pane order: Close, Microphone, Speaker (or none), Play test sound,
  Camera, Background options.
- DS-4 Settings control: `aria-controls` the sheet id, `aria-expanded` true only
  while the Audio and video pane is open; name stays "Settings" below 900px.
- DS-5 With `setSinkId` removed by init script, no element with name "Speaker" and
  role `combobox` exists; the unsupported text is in the accessibility tree under
  the "Speaker" heading, on an element with `role="status"` (test id
  `km-speaker-unsupported`), so it is announced politely when the pane opens (WC-6).
- DS-6 With `setSinkId` present, the unsupported text is absent (WC-6 negative).
- DS-7 Disabled-before-permission selects use `aria-disabled` (still focusable) and
  are described by the permission hint.
- DS-8 Failed switch sets `aria-invalid="true"` and `aria-describedby` to the error
  line; the line has an `alert` icon plus text (not colour alone).
- DS-9 Every announcement is polite; nothing in this surface uses `role="alert"`
  except the existing lobby `ErrorCard`.
- DS-10 Targets: selects 48px tall; Play test sound 44px on touch, 36px only under
  `pointer: fine`; Settings control 48px below 900, 56px above.
- DS-11 Reduced motion: sheet open/close instant; meter fill transition 0 ms.

### Contrast pairs (add to the record, A-7)

| Pair | Dark | Light | Required |
|---|---|---|---|
| `meter-fill` on `muted` (meter value vs track) | 5.41 | 4.94 | 3:1 |
| `control` vs `bg-2` (selects in the sheet) | 3.90 | 4.09 | 3:1 (in record) |
| `selected` (Settings open) vs `bg` (room bar surface) | 6.17 | 3.91 | 3:1 (in record) |
| `fg` on `surface` (speaker note) | in record | in record | 4.5:1 |
| `fg-sub` on `bg-2` (hints, lede) | 8.26 | 7.55 | 4.5:1 |

## 10. Open questions

1. Lobby speaker test ("Play test sound" in the lobby where supported)? Recommended:
   not this phase.
2. Remember the last chosen devices in this browser? Recommended: not this phase.
3. Meter token (README question 2) and room bar overflow (README question 3).

## 11. Decisions (operator, 2026-11-18, `batch2-approval-web-conferencing-features`)

The open questions above are resolved; the brief stands as written.

1. **Speaker is room-only.** No lobby speaker picker or lobby test sound this phase
   (request to bdd-quality stands: drop `km-lobby-speaker-select`).
2. **Device choices are not remembered** across visits; a fresh profile gets the
   browser defaults (WC-5 negative control).
3. **`meter-fill` is added** (tokens v1.6.0): dark `#22C55E`, light `#166534`, 5.42 /
   4.94:1 on `muted`. The meter uses it in both themes; the record pair is
   `meter-fill-on-muted`.
4. **The room bar scrolls sideways below 768px**, as the prototype does; no "More"
   menu. The rule is in DESIGN.md "Room control bar below 768".
