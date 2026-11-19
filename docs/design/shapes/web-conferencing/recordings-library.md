# Shape: recordings on this device (library and playback)

Task 10.5. Scenarios WC-8, WC-13 (WC-10 network check covers playback). Decisions
D1, D4. Mode: Operate. Status: approved 2026-11-18 (batch 2, decision `batch2-approval-web-conferencing-features`). Shared rules and acceptance
A-1 to A-7 are in [README.md](README.md).

## 1. Job and audience

- **Who:** a participant who recorded a meeting in this browser after the room agreed;
  guests included (D1).
- **Situation:** right after the meeting, or days later: replay a decision, download
  the file to keep or send it, or free up space.
- **Primary job:** find a recording, play it, download it, delete it.
- **Success:** the recording is listed with a duration close to what was recorded and
  a size above zero, and it plays from local storage with nothing uploaded (WC-8);
  the page is honest that the file exists only in this browser.

## 2. Selected direction

Incumbent world. The page reuses the signed-in recordings library grammar from
`recordings.html` / `library-view.tsx` (page head, storage strip, card grid with list
toggle) and its player grammar (`#detail` stage and control row), with the cloud-only
parts removed: no S3/IPFS, no transcript, no summary, no delivery, no sharing, no
chapters.

- **Library** (`/recordings` in the hosted build): eyebrow "On this device", title
  "Recordings", storage strip ("Browser storage"), toolbar (sort, grid/list toggle),
  then recordings as cards or rows.
- **Detail** (`/recordings#recording:<id>`): head (title, date, duration, size,
  format), the player, then Download and Delete.

The library and the cloud library would collide at `/recordings` once sign-in ships.
This brief is for the hosted build only; the merge is an open question.

**Assumption:** the card poster is a frame of the recording itself, shown by a
`<video preload="metadata">` seeked to 1 s; if that fails the poster is the `tile`
fill with the `film` glyph. No separate thumbnail is stored.

## 3. Scope and boundaries

- In: library, empty and error states, storage strip with persistence, detail with
  playback, download, delete, the in-progress and incomplete cases.
- Untouched: the consent dialog, the in-room indicator (task 10.4), the composite
  layout (D4: room grid, screen share large), the signed-in recordings screens.
- Not in this phase: trimming, renaming, transcripts (excluded), sharing links,
  upload anywhere, search (a device holds few recordings).
- Anti-goals: anything implying a cloud copy; playback controls that differ from the
  existing player for no reason; a delete without confirmation.

## 4. Layout per breakpoint

| Width | Library | Detail |
|---|---|---|
| 375 | Bottom nav (if README Q1). Storage strip stacks (text, meter, button). Toolbar: sort select full width, grid/list toggle below. Cards one column (prototype `rec-grid` min 300 collapses to 100%). | Back link; head; player full width (16:9); control row wraps to two lines (play, time, scrubber on line one; volume, speed, fullscreen on line two); Download and Delete full width, stacked. |
| 768 | Rail. Strip in two columns (text and meter / button). Toolbar one row. Cards two columns. | Single column, player max width 720. |
| 1024 | Inline nav. Cards three columns in `page-max`. List view rows: poster 120, text, actions. | Single column (`detail-grid single`), player max width 960; actions in a row under the player. |
| 1440 | As 1024 (four columns where `minmax(300px)` allows). | As 1024. |

Card anatomy (prototype `.rec-card`): poster 16:9, body with title (truncate), meta
"18 Nov 2026 · 14:30 · 21 min · 214 MB", chips for format ("MP4" / "WebM") and any
condition ("Stopped early", "Incomplete"). The whole card links to the detail. List
rows carry the same content plus Download as a trailing icon button (rows are the
compact view; cards keep one action).

## 5. Components and tokens

| Part | Component | Tokens |
|---|---|---|
| Page head | kit `PageHead` | display tokens |
| Storage strip | `card` variant `panel` with meter and text (as `StorageStrip`) | `surface`; meter track `muted`, fill `meter-fill` (README Q2) under 80%, `amber` at 80-95%, `red` above 95%, each with the percentage in text |
| Keep safe button | kit `Button` secondary `sm` | `card` / `fg`, focus `focus` |
| Toolbar | `NativeSelect` (Sort: Newest first, Oldest first, Largest first) and kit `ToggleGroup` (Grid, List) | `control`, `selected` + check icon, `focus` |
| Card / row | link card | `surface`, hover `card-hov`, focus `focus` with inner fills dropped |
| Chips | kit `Badge` | format `muted`/`fg`; "Stopped early" `amber-soft`/`amber-text` with `alert` icon; "Incomplete" `red-soft`/`red-text` with `alert` icon |
| Player | existing `recording-player.tsx` / `player-stage.tsx` grammar on a real `<video>` | stage `media-bg`; big play `ember-btn` / `on-ember`; control row on `surface`; scrubber = kit range (`control` track, `selected` range, `slider-thumb`); buttons ghost |
| Download | `<a download>` styled as kit `Button` secondary with `download` icon | `card` / `fg` |
| Delete | kit `Button` destructive, then `AlertDialog` | `danger-btn` / `on-danger` |

## 6. States

| State | What shows |
|---|---|
| Loading | Head and strip shell render; grid area shows two skeleton cards after 300 ms, `aria-busy="true"`. |
| Empty | `Empty` region: `film` media, heading "No recordings on this device", text "Ask to record from the meeting room. Everyone is asked first, and the file is saved only in this browser." A three-step list in the existing `HOW` style: "Ask the room" (`record`), "Everyone agrees" (`users`), "Saved in this browser" (`database`, detail "Never uploaded. Download it to keep a copy elsewhere."). Primary button "Start a meeting". |
| Populated | Cards or rows, sorted newest first. |
| Recording in progress (another tab) | A first card without a link: poster `tile` with a `pip-red` pip and "Recording now", meta "Started 14:30 in another tab". Not playable; no actions. Updates when it finishes (live query). |
| Stopped early (quota) | Chip "Stopped early"; detail note (`amber-soft`, `alert` icon): "Browser storage ran out, so recording stopped at 18:42. Everything up to then was saved." |
| Incomplete (tab closed or crashed while recording) | Chip "Incomplete"; detail note (`red-soft`): "This recording didn't finish saving. It may stop early or not play. Download it to try another player, or delete it." Duration shows "unknown" when not readable. |
| File missing (browser cleared storage, metadata left) | Card shows "File missing"; detail: "The browser removed this file, so it can't play. Delete the entry to tidy up." Only Delete is offered. |
| Playback error (codec or decode) | Stage shows `alert` icon and "This browser can't play this file. Download it and open it in a video player." Download stays. |
| Storage unavailable (no OPFS or IndexedDB in this window) | In place of the library: error note "Recordings aren't available in this window. This browser blocked local storage, which happens in some private windows." |
| Recording unsupported (no MediaRecorder / OPFS writer) | Library still lists existing recordings; the empty state text becomes "This browser can't record meetings. Recording works in current Chrome, Edge, Firefox and Safari on a computer." |
| Not persistent | Strip line: "The browser may clear recordings if the device runs low on space." with button "Keep recordings" (calls `navigator.storage.persist()`). After grant: "Protected from automatic clearing." After refusal: "The browser didn't allow this. Download recordings you want to keep." Button hidden after an answer. |
| Deleting / deleted / failed | As history: spinner on confirm, toast "Recording deleted from this browser.", focus to next card or the heading; failure line in the dialog "Couldn't delete. Close other Know Meet tabs and try again." |
| Permission denied | Not applicable (no prompt; `persist()` refusal is covered above). |

## 7. Copy

- Eyebrow "On this device"; title "Recordings"; strip heading "Browser storage";
  strip text "<used> used by Know Meet in this browser. About <quota> available to
  this site." ("About": `storage.estimate()` is approximate.)
- Detail facts: "Recorded 18 Nov 2026, 14:30 · 21 min · 214 MB · MP4".
- Delete dialog: title "Delete this recording?", text "The <size> file is removed
  from this browser. Download it first if you want to keep a copy. This can't be
  undone." Actions "Cancel", "Delete recording".
- Download filename: `know-meet-<code>-2026-11-18-1430.mp4` (or `.webm`).
- Link back to history in detail when a history entry exists: "Meeting and chat in
  History".

## 8. Interaction

- Playback never autoplays (Pro Max autoplay rule; reduced motion). The big play
  button and Space start it.
- Player keyboard, while focus is in the player region: Space or K play/pause;
  Left/Right seek 5 s; Home/End jump to start/end; M mute; F fullscreen. Scrubber is a
  slider (arrows 5 s, PageUp/PageDown 30 s). Speed select: 0.75x, 1x, 1.25x, 1.5x, 2x.
- The blob URL is created when the detail opens and revoked when it closes.
- Grid/List choice is kept for the session only.

## 9. Accessibility acceptance (WC-13, in addition to A-1 to A-7)

- RL-1 One `h1` "Recordings"; strip heading `h2`; detail title `h1`.
- RL-2 Cards and rows are links in a `<ul>`; each name includes title, date and
  duration ("Meeting 4KQ-9ZD, 18 Nov 14:30, 21 minutes").
- RL-3 Storage meter is `role="img"` (static value) with a name stating used and
  available amounts in words; colour bands also change the text ("Almost full").
- RL-4 Grid/List is a `ToggleGroup` with one pressed item showing a check icon;
  Sort is a labelled select.
- RL-5 Player: region named "Recording player"; play button name toggles
  "Play"/"Pause"; scrubber `role="slider"` named "Seek" with `aria-valuetext`
  "4:12 of 21:03"; mute button "Mute"/"Unmute"; fullscreen "Full screen"/"Exit full
  screen"; speed select labelled "Playback speed".
- RL-6 Focus order in detail: back link, play, scrubber, mute, speed, full screen,
  Download, Delete, history link.
- RL-7 In-progress card is not focusable and exposes "Recording now in another tab"
  as text.
- RL-8 Chips carry an icon and text; condition notes in detail are static text with
  an `alert` icon (not `role="alert"`).
- RL-9 AlertDialog as LH-8 in local-history.md (alertdialog role, inert background,
  initial focus Cancel, focus restored).
- RL-10 Targets: player buttons 44px; list-row Download icon button 44px with name
  "Download <title>".
- RL-11 Reduced motion: no autoplay ever; no hover scale on posters; dialog and
  toasts appear without motion.
- RL-12 Privacy (with WC-8 and WC-10): the `<video>` source is a `blob:` URL; no
  request during the library or playback carries recording bytes.

### Contrast pairs (add to the record, A-7)

| Pair | Required | Note |
|---|---|---|
| `amber` / `red` meter fill on `muted` | 3:1 | new, both themes |
| `amber-text` on `amber-soft`, `red-text` on `red-soft` (chips over `surface`) | 4.5:1 | in record for panels |
| `slider-thumb` vs `selected` range and `control` track | 3:1 | in record |
| `on-ember` play glyph on `ember-btn` over `media-bg` | 3:1 | in record (glyph); add `ember-btn` vs `media-bg` |
| `selected` toggle item vs `control` track | not required (check icon and text carry state) | DESIGN.md segmented rule |

## 10. Open questions

1. Placement and navigation (README question 1).
2. When sign-in ships, one Recordings destination with "On this device" and "Cloud"
   sections, or two places? Recommended: decide then; this brief stays hosted-only.
3. Offer Download in list rows only, or also on cards? Recommended: rows only, as
   written, to keep one action per card.

## 11. Decisions (operator, 2026-11-18, `batch2-approval-web-conferencing-features`)

The open questions above are resolved; the brief stands as written.

1. **Placement:** `/recordings` in the hosted router, reached from the hosted adaptive
   navigation (Home, History, Recordings). Spec: DESIGN.md "Hosted build navigation".
2. **Cloud and device libraries:** decided when sign-in ships; this brief stays
   hosted-only.
3. **Download sits in list rows only**, one action per card.
