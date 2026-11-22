# Shape: background effects picker

Task 7.3. Scenarios WC-4, WC-13. Mode: Operate. Status: approved 2026-11-18 (batch 2, decision `batch2-approval-web-conferencing-features`).
Shared rules and acceptance A-1 to A-7 are in [README.md](README.md).

## 1. Job and audience

- **Who:** a participant in the room whose surroundings are messy, private or
  distracting (a kitchen, a shared office, a child walking past).
- **Primary job:** turn their background off, blurred or replaced with an image, see
  the result on their own preview before others notice, and turn it off again.
- **Success:** the chosen effect shows on what others receive (WC-4); off restores
  the plain camera; a browser or device that cannot run effects says so, and the
  camera keeps working. All effect files load from the app's own origin.

## 2. Selected direction

Incumbent world. The picker is the **Background** section of the room's "Audio and
video" pane (see [device-settings.md](device-settings.md)), placed directly under the
camera self preview so the preview shows the effect being chosen.

The picker is a **radio group of choice cards** (DESIGN.md "Choice card"): one card
per option, each with a 16:9 thumbnail and a visible label, the radio indicator
inside the card carrying the state.

Options, in order: **None**, **Blur**, then three **image** backgrounds.

- None: thumbnail is the `tile` fill with the `cam` glyph in `fg-sub`.
- Blur: thumbnail is the `tile` fill with the new `background` glyph (README
  question 5). **Assumption:** one blur strength. Two strengths (slight, strong) are
  an open question.
- Images: brand-derived abstract backgrounds, no text, no photography (README
  question 4). Working names: "Ground" (deep `bg` field with the Gathering ring
  motif), "Dusk" (ember to ink gradient), "Tide" (cyan to ink gradient). Each ships
  as a self-hosted 1280x720 WebP plus a 320x180 thumbnail, rasterized from the SVG
  sources in [`docs/design/backgrounds/`](../../backgrounds/README.md) (export spec there).

Why choice cards: the option is visual, so a thumbnail is the label people scan; a
radio group gives one tab stop and arrow-key movement, which a row of toggle buttons
would not.

**Assumption:** effects are room-only. The lobby preview is a raw `getUserMedia`
stream; applying the processor there is extra work not in WC-4. Lobby effects are an
open question.

## 3. Scope and boundaries

- In: the Background section, its states, its preview feedback, and the copy.
- Untouched: the stage tiles (others see the effect in their normal tile), the
  camera control, device settings fields.
- Not in this phase: custom image upload, blur strength slider, face touch-up,
  virtual avatars, applying effects in the lobby.
- Anti-goals: a floating effects tray over the stage; an effect that silently fails
  and leaves people thinking they are hidden; a picker that looks enabled when the
  browser cannot run it.

## 4. Layout per breakpoint

The section lives inside the side sheet (bottom sheet below 768), so its layout
follows the sheet width, not the page.

| Width | Sheet | Grid |
|---|---|---|
| 375 | Bottom sheet, full width (padding `s5`): content width about 335 | 2 columns of cards (about 160 wide), 5 cards: None, Blur / Ground, Dusk / Tide |
| 768 | Side sheet `rs-w` over the stage | 3 columns |
| 1024 | As 768 | 3 columns |
| 1440 | Side sheet docked | 3 columns |

Grid: `repeat(auto-fill, minmax(min(100%, 96px), 1fr))`-style with gap `s2`; the
thumbnails keep 16:9; labels under the thumbnail, 14px semibold, one line, truncate
with the full name in the accessible name.

Section anatomy: `h3` "Background", a one-line hint "Others see the background you
choose.", the radio grid, then the status line (empty unless loading or failed).

## 5. Components and tokens

| Part | Component | Tokens |
|---|---|---|
| Group | kit `RadioGroup` (Base UI radio semantics: `role="radiogroup"`, roving tabindex) | none |
| Card | choice card: the radio item renders the whole card | rest `surface`, hover `card-hov`, checked card fill `ember-soft` (supplementary), focus `focus` with all content `on-focus` and the thumbnail kept |
| Indicator | 20px radio (`size-check`) at the card's top-start corner, over the thumbnail on a `surface` chip so it never sits on the image | rest `control`, checked `selected` + 8px `on-selected` dot, focus `focus` disc |
| Thumbnail | `<img alt="">` (decorative; the card label names it) or glyph tile | `tile`, radius `radius` |
| Label | text under thumbnail | `fg` (rest), `on-focus` (focus) |
| Status line | `small` with `spinner` or `alert` icon | `fg-sub`; failure `red-text` |
| Unavailable note | neutral note | `surface`, `info` icon, `fg` text |

Card radius `radius-lg`; padding `s2`; gap thumbnail to label `s2`. No shadow, no
ring around the checked card: the indicator dot plus the `ember-soft` fill carry the
selection, and the dot alone is sufficient.

## 6. States

| State | What shows |
|---|---|
| Ready, None selected | All five cards enabled; None checked. |
| Effect selected | That card checked; preview shows the processed track. Polite announcement "Background: Blur." (or the image name). |
| First load (model and WASM fetching, typically under 2 s) | The chosen card checks immediately; status line shows a spinner and "Loading background effects..." ; the group gets `aria-busy="true"`; the preview keeps the plain camera until the first processed frame. Other cards stay operable (a new choice replaces the pending one). |
| Preparing (on join and when the camera turns on, also with the pane closed) | Once preparation has run past 400 ms with no effect applied: status line with a spinner and "Preparing background effects…". The group is not busy and every card stays operable. Faster preparations, and camera-on with an effect applied, show nothing. |
| Camera off | Cards enabled; choosing one is remembered and applies when the camera starts. Status line: "Your camera is off. The background applies when you turn it on." |
| Camera blocked or no camera | Group disabled (`aria-disabled` on the group, cards `opacity 0.5`), status: "Background effects need a camera." |
| Device switched | The effect is re-applied to the new camera track (task 7.2); no UI change except a brief return to the plain frame. |
| Failed to start (files did not load, CSP, GPU error) | Selection returns to None; status line with `alert` icon in `red-text`: "Background effects could not start, so your camera is shown as is. Reload the page to try again." Announced politely once. |
| Unsupported: browser (a feature the effect engine needs is missing, including no WebGL2 context) | No radio group. The section shows the heading and the note: "This browser can't run background effects. Your camera works normally. Effects work in current Chrome, Edge, Firefox and Safari on a computer." |
| Unsupported: graphics (WebGL2 runs in software; repair 9) | No radio group. The note: "Background effects need graphics acceleration, which is off in this browser. Your camera works normally. Turn on hardware acceleration in your browser's settings, then reload the page." (W3, web-conferencing-hardening, operator 2026-11-21: one note per cause.) |
| Phone browser where support is unknown | Same gate as unsupported: the support check decides. If supported, the section shows as on desktop with no promise about quality. |
| Reduced motion | No crossfade on the preview when an effect starts; spinner replaced by the static `clock` glyph with the same text. |

## 7. Copy

- Heading "Background". Hint "Others see the background you choose."
- Card names: "None", "Blur", "Ground", "Dusk", "Tide".
- Accessible names: "None", "Blur your background", "Image background: Ground"
  (and so on), so a screen reader hears what the image is for.
- Preparing: "Preparing background effects…"
- Loading: "Loading background effects..."
- Failure and unsupported copy as in the table (cause, then what still works, then
  the fix).

## 8. Interaction

- Arrow keys move and select within the group (radio pattern); Tab leaves the group.
- Selection applies immediately; no Apply button.
- The effect persists for the meeting across device switches and pane close; it is
  not remembered after leaving (**Assumption**, matches device settings).
- Turning off (None) stops the processor; the remote frame returns to the plain
  camera (WC-4 "off").
- Card hover uses `card-hov` under `@media (hover: hover)` only.

## 9. Accessibility acceptance (WC-13, in addition to A-1 to A-7)

- BE-1 One `role="radiogroup"` named "Background" (by its heading) containing five
  `role="radio"` items with the names in section 7; exactly one has
  `aria-checked="true"`.
- BE-2 One tab stop for the group; ArrowRight/ArrowDown and ArrowLeft/ArrowUp move
  selection and focus, wrapping; Space selects the focused item.
- BE-3 Focused card: whole card `focus` fill, label `on-focus`, >= 3:1 against both
  the unfocused card (`surface` or `ember-soft` composited on `bg-2`) and `bg-2`.
- BE-4 Checked state is shown by the indicator dot (`on-selected` on `selected`),
  not only by the card fill.
- BE-5 Thumbnails are `alt=""` or `aria-hidden`; no image carries the only name.
- BE-6 While loading, the group has `aria-busy="true"` and the status line text is
  in a polite live region; the failure text is announced once, politely.
- BE-7 Unsupported: no element with role `radiogroup`; the note text is reachable in
  reading order under the "Background" heading.
- BE-8 Disabled (no camera): `aria-disabled="true"` on the group, items not
  operable, and the reason text referenced by `aria-describedby`.
- BE-9 Targets: each card is at least 96x80 CSS px (far above 44).
- BE-10 Reduced motion: no preview crossfade, no spinner rotation.

### Contrast pairs (add to the record, A-7)

| Pair | Required | Note |
|---|---|---|
| `control` radio disc vs `surface` chip | 3:1 | in record (3.56 / 3.52) |
| `on-selected` dot on `selected` | 3:1 | in record (glyph pair) |
| `focus` vs `ember-soft` composited over `bg-2` (checked card) | 3:1 | new: RV-26 measured `-soft` fills on panels, not on `bg-2` |
| `focus` vs `surface` (unchecked card) | 3:1 | in record (>= 14.22) |
| `fg` label on `ember-soft` over `bg-2` | 4.5:1 | new |
| `red-text` on `bg-2` (failure line) | 4.5:1 | new |

## 10. Open questions

1. One blur strength or two (slight, strong)? Recommended: one.
2. Effects in the lobby preview? Recommended: not this phase.
3. Background images: approve the three brand-derived abstracts (README question 4).

## 11. Decisions (operator, 2026-11-18, `batch2-approval-web-conferencing-features`)

The open questions above are resolved; the brief stands as written.

1. **One blur strength.** No slight/strong choice and no slider.
2. **Effects are room-only.** The lobby preview stays the raw camera this phase.
3. **The three brand abstracts are approved:** Ground, Dusk, Tide. Sources:
   `docs/design/backgrounds/{ground,dusk,tide}.svg`; ui-engineer exports the WebP
   files per that folder's README. Custom upload stays out of this phase.
4. Icons `background` and `image` are requested from ui-engineer (README question 5).
