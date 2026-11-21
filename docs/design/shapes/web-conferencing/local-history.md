# Shape: local meeting history

Task 9.4. Scenarios WC-7, WC-13. Decisions D1, D3, D5. Mode: Operate.
Status: approved 2026-11-18 (batch 2, decision `batch2-approval-web-conferencing-features`). Shared rules and acceptance A-1 to A-7 are in
[README.md](README.md).

## 1. Job and audience

- **Who:** anyone who has met on meet.know-me.tools in this browser, guests and
  invitees included (D1). No account exists.
- **Situation:** later the same day or week: "what was that link Priya pasted?",
  "when did we meet?", or "I want this off my laptop."
- **Primary job:** find a past meeting and read the chat this browser received; delete
  one meeting or everything.
- **Success:** after a reload the meeting is listed with its date and messages (WC-7);
  the page says plainly that this lives only in this browser and includes other
  people's messages (D5); delete removes it for good.

## 2. Selected direction

Incumbent world. A list page in the framed layout, built from the existing page head,
`list-row`, notes and `AlertDialog`, with a detail view on a hash route, the same
pattern the recordings screen uses (`#meeting:<id>`).

- **List** (`/history`): page head (eyebrow "On this device", title "History"), the
  D5 notice, then meetings grouped by day ("Today", "Yesterday", then dates), newest
  first.
- **Detail** (`/history#meeting:<id>`): meeting head (title, date and time, duration,
  people), then the received chat as a read-only message list, then delete.

Why grouping by day: people recall meetings by when they happened; there is no
search or calendar in the hosted app to lean on.

Route and navigation placement: README question 1 (recommended: hosted nav with
Home, History, Recordings).

**Assumption:** the meeting title is the room's display name (guest meetings show
"Meeting <code>" when no name was set). Participant names are those the device saw.

## 3. Scope and boundaries

- In: list, day groups, detail with chat, delete one, delete all, the D5 notice, the
  link to a recording of the same meeting, all states below.
- Untouched: the cloud Meetings dashboard (signed-in, not in the hosted build), the
  room, the chat panel.
- Not in this phase: search, export, transcripts (excluded), cross-device sync
  (excluded), editing titles.
- Anti-goals: implying the history is backed up; showing other people's messages
  without saying they were received by this device; a delete without confirmation;
  offering history to anyone else (D3).

## 4. Layout per breakpoint

| Width | List | Detail |
|---|---|---|
| 375 | Bottom nav (if Q1 approved). Page padding `s4`. Notice full width. Rows one column: title (truncate), then a meta line (time, duration, people, messages) that wraps; trailing chevron. "Delete all history" is a ghost button under the notice. | Back link "History" at top; head; chat list full width; Delete button full width at the end. |
| 768 | Rail (if Q1). Rows: title and meta left, message count chip and chevron right. | Single column, max width 720. |
| 1024 | Inline nav in the app bar (if Q1). Page column `page-max`; notice and "Delete all" share a row (notice grows, button end-aligned). | Two columns: chat list (wide) left, a `surface` side card right with the meeting facts, the recording link and Delete. |
| 1440 | As 1024, centred in `page-max`. | As 1024. |

Row anatomy (`list-row`, interactive card rules): lead `muted` square with `calendar`
glyph; title 16px semibold; meta 14px `fg-sub` "14:30 · 42 min · 3 people ·
12 messages"; a `film` chip "Recording" when a local recording of that meeting
exists. Rows alternate nothing: they sit on `surface` with `s2` gaps (fill steps,
no rules).

Chat list in detail: prototype `.msgs` / `.bubble` grammar (own messages
`ember-soft`, others `card`), each with sender, time and an **audience label**:
"Everyone", "Private to Marcus" or "Private from Marcus" (same labels wc04 uses).
The list is a named, focusable scroll region only if it overflows the viewport at
1024+ (the side card stays visible); at 375 and 768 the page scrolls.

## 5. Components and tokens

| Part | Component | Tokens |
|---|---|---|
| Page head | kit `PageHead`, `PageEyebrow`, `PageTitle` | display type tokens |
| D5 notice | note: `surface` fill, `shield` icon, heading and text | `surface`, icon `fg-sub`, text `fg` |
| Day group | `section` with `h2` 14px `fg-sub` eyebrow style ("Today") | `font-mono` eyebrow, `tracking-eyebrow` |
| Row | link card (`list-row`) | rest `surface`, hover `card-hov`, focus `focus` + `on-focus` with inner fills dropped |
| Count / recording chip | kit `Badge` | `muted` / `fg` (`muted` is allowed: chips are not controls) |
| Delete one | kit `Button` `destructive` in detail | `danger-btn` / `on-danger` |
| Delete all | kit `Button` ghost with `trash` icon, then `AlertDialog` | transparent / `fg`, hover `card-hov`, focus `focus` |
| Confirm | kit `AlertDialog` | dialog `card` on scrim; destructive action `danger-btn` |
| Messages | `.msgs` / `.bubble` from the prototype chat | `card`, `ember-soft`, `fg`, `fg-sub` |
| Toast | kit `Toast` | `fg` fill, `bg` text |

## 6. States

| State | What shows |
|---|---|
| Loading (PGlite worker starting) | Page head and notice render at once; the list area shows nothing for 300 ms, then three `Skeleton` rows (`muted` fill, no shimmer under reduced motion) with `aria-busy="true"` on the list. |
| Empty | `Empty` region: `clock` media, heading "No meetings on this device yet", text "Meetings you join in this browser appear here with the chat you received. Nothing is uploaded.", primary button "Start a meeting" (to `/`). The D5 notice stays above. |
| Populated | Day groups as above. More than 50 meetings: the first 50 render, then a secondary button "Show 50 more". |
| Live update | A meeting ending in another tab appears at the top without reload (live query); no announcement unless the list was empty (then the empty state is replaced silently). |
| Detail, no chat | Head, then "No chat messages were sent in this meeting." in `fg-sub`. |
| Detail, long chat (hundreds) | All messages in order; long words wrap (`overflow-wrap: anywhere`); links are plain text, not live (**Assumption:** history never auto-links received text, to avoid phishing from stored messages). |
| Detail, unknown id (deleted or wrong link) | "Meeting not found" view: "This meeting isn't in this browser's history. It may have been deleted." Button "Back to History". |
| Storage unavailable (IndexedDB blocked, some private windows) | In place of the list: error note (`red-soft` fill, `alert` icon in `red-text`): heading "History isn't available in this window", text "This browser blocked local storage, which happens in some private windows. Meetings still work, but nothing is saved here." No delete controls. |
| Storage not persistent | One line inside the D5 notice: "Your browser may clear this history if the device runs low on space." (Shown when `navigator.storage.persisted()` is false.) |
| Deleting | The confirm button shows a spinner and "Deleting..." ; on success the dialog closes, the row is gone, focus moves to the next row (or the heading if none), toast "Meeting deleted from this browser." |
| Delete failed | Dialog stays open with an error line: "Couldn't delete. Close other Know Meet tabs and try again." |
| Delete all | Dialog: title "Delete all history?", text "Every meeting and chat message saved in this browser is removed. Recordings are kept in Recordings. This can't be undone." Action "Delete all history". After: empty state, focus on the empty heading, toast "History deleted from this browser." |
| Permission denied | Not applicable: history needs no browser permission. |

## 7. Copy

- Eyebrow "On this device"; title "History".
- D5 notice heading "Saved only in this browser"; text: "History keeps the meetings
  you joined here and every chat message this browser received, including messages
  from other people. It is never uploaded or shared, and other people can't see it.
  Delete a meeting, or all history, at any time. Clearing this site's data in your
  browser also deletes it."
- Row meta: "14:30 · 42 min · 3 people · 12 messages" (singulars handled; "1 message").
- Delete one dialog: title "Delete this meeting?", text "The meeting and its
  <n> chat messages are removed from this browser. A recording of this meeting, if
  any, stays in Recordings. This can't be undone." Actions "Cancel", "Delete meeting".
- Recording link in detail: "Recording saved on this device" with chevron, to
  `/recordings#recording:<id>`.

## 8. Interaction

- Row: the whole row is one link to the detail; no nested buttons in rows (delete
  lives in the detail, so a row has one action).
- Detail back: "History" back link and the browser Back both return to the list with
  focus restored to the row that was opened.
- Dialog: focus starts on Cancel (destructive actions are never the default); Escape
  cancels; focus returns to the opener on cancel.
- Hover only under `@media (hover: hover)`.

## 9. Accessibility acceptance (WC-13, in addition to A-1 to A-7)

- LH-1 One `h1` "History"; day groups are `h2`; in detail the meeting title is `h1`
  and "Chat" is `h2`.
- LH-2 The D5 notice is a `section` with an accessible name from its heading and is
  before the list in reading and focus order (it has no focusable content except
  Delete all).
- LH-3 Rows are `<a>` elements in a `<ul>`; each link's name contains the title, the
  date and the time ("Design sync, today 14:30"), not just the title. The visible
  date and time are a `<time datetime>` element.
- LH-4 List focus order: skip link, nav, Delete all, rows in visual order, Show more.
  Detail order: back link, chat region (if scrollable), recording link, Delete
  meeting.
- LH-5 Each message exposes sender, time and audience as text (audience is never
  only a colour or icon); private messages read "Private to Marcus".
- LH-6 Loading list has `aria-busy="true"`; skeletons are `aria-hidden`.
- LH-7 Deletion success is announced through the toast (polite `role="status"`);
  failure text is inside the dialog, referenced by `aria-describedby`.
- LH-8 AlertDialog: `role="alertdialog"`, labelled and described, background `inert`,
  focus trapped, initial focus on Cancel, focus returned after close.
- LH-9 Storage-unavailable note uses an `alert` icon plus heading text; it is static
  content, not `role="alert"` (it is the page's state, present on load).
- LH-10 Targets: rows at least 64px tall; buttons 44px.
- LH-11 Reduced motion: no skeleton shimmer, dialog appears without scale or fade.
- LH-12 Privacy (with WC-7): no history text or id appears in any URL other than
  the local hash `#meeting:<id>`; the hash is never sent to a server.

### Contrast pairs (add to the record, A-7)

| Pair | Required | Note |
|---|---|---|
| `fg` on `surface` (notice, rows) | 4.5:1 | in record |
| `fg-sub` on `surface` (meta) | 4.5:1 | 7.54 / 6.50 |
| `red-text` on `red-soft` composited over `bg` (storage error) | 4.5:1 | in record for panels; add the `bg` composite |
| `focus` vs `surface` row; `on-focus` text | 3:1 / 4.5:1 | in record |
| `fg` on `muted` chip | 4.5:1 | in record |

## 10. Open questions

1. Placement and navigation (README question 1).
2. Should deleting a meeting also offer to delete its recording? Recommended: no;
   keep them separate and say so in the dialog (shown above).
3. Should links in stored chat be clickable? Recommended: no in history (they were
   live in the room); confirm.

## 11. Decisions (operator, 2026-11-18, `batch2-approval-web-conferencing-features`)

The open questions above are resolved; the brief stands as written.

1. **Placement:** `/history` in the hosted router, reached from the hosted adaptive
   navigation (Home, History, Recordings). Spec: DESIGN.md "Hosted build navigation".
2. **Deleting a meeting does not offer to delete its recording.** They stay separate
   and the dialog says so.
3. **Stored chat links are not clickable** in history; they render as plain text.
