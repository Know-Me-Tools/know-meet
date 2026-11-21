# WC-13 run 1 triage (2026-11-20)

Operator approved one run ("Yes" to opening the release hook). Candidate `11ecd347`,
packaged compose stack (proxy 127.0.0.1:18080). Log: `run-1.log` (LiveKit URLs redacted).
Screenshots: `screenshots/` (136, 17 surfaces x 2 themes x 4 widths).

## Result

4 of 5 tests failed. The negative control passed, so the axe oracle does detect a known
violation. WC-13 verdict for this run: **FAIL**. No repair budget remains (7 of 7 used),
so these are reported to the operator, not repaired.

Not run before: the spec was written for this review and had not executed. Its only
earlier check was `tsc --noEmit` (a VLBV deviation, disclosed).

## Findings by cause

| # | Finding | Where | Rule | Source | User impact |
|---|---|---|---|---|---|
| A | Secondary buttons have 1.16–1.27:1 fill against the surface (dark); the light consent "Decline" button is white on white (1.00:1) | Play test sound, Cancel, consent Decline, Keep recordings, recording Play | Flat 2.0 rule: control boundary by fill ≥ 3:1 (SC 1.4.11) | Shared kit `secondary` variant (`packages/ui/src/components/button.tsx`): raised card fill plus shadow, the incumbent `.btn`; 81 uses app-wide, not new in this phase | Text labels stay readable; the button's edge is weak. A design-system decision, not a per-screen fix |
| B | `aria-hidden-focus` (serious) while a modal is open at 375–1024 | recording consent, history delete confirm | WCAG 4.1.2 | Background (`#root`, nav, links) is aria-hidden but still focusable; plus Base UI focus-guard spans | Screen-reader users may tab into content that is announced as hidden. Absent at 1440 |
| C | `label-content-name-mismatch` (serious) | rail Record button, rail Chat button (1024/1440); recording library tile | WCAG 2.5.3 Label in Name (A) | Accessible name differs from visible label | Voice-control users saying the visible word may not activate the control |
| D | Selected "Grid" toggle 1.49:1 (ember on grey) | recordings library | SC 1.4.11 | View toggle selected state | Selected state is hard to see |
| E | `color-contrast` (serious) on the delete-dialog action | history delete confirm, dark 375 only | SC 1.4.3 | Single cell; likely measured during the dialog's open animation (unconfirmed) | Possibly none; unconfirmed |
| F | Keyboard: a focus stop with no accessible name | consent dialog | SC 4.1.2 | Base UI focus-guard span took focus | Screen reader announces nothing for one Tab stop (if the guard does not redirect) |
| G | Keyboard: a focused element with no visible change (1.00:1) | history | SC 2.4.7 | A focusable `div` (likely the list or detail region) without the focus fill | Keyboard users lose track of focus there |
| H | Reduced motion: recordings playback not reached (click timed out) | motion test | — | Test tour step; the same surface was reached in both theme tests | NOT_EXERCISED for that one surface; the motion check on the other 16 surfaces raised nothing |

## What this means

- A comes from the incumbent design system, which conflicts with the Flat 2.0 3:1 fill
  rule. Changing it touches every secondary button in the app and needs owner approval
  ("no redesign without owner approval").
- B, C, D, F and G are defects in this phase's new surfaces that affect assistive
  technology and keyboard users.
- E and H are measurement or tour limits, not established product defects.

## UI review (independent-reviewer, same model family, fresh context; prometheus-ui-review not offered in this harness)

Verdict: **BLOCK**. 52 of 136 screenshots opened (all 17 surfaces, both themes, 375 and 1440).

| # | Finding | Confirmed outside the WC-13 tour? | User impact |
|---|---|---|---|
| U1 | Room shell is not pinned to the viewport: the control bar floats above the bottom and the side sheet is only as tall as the stage row. In Meeting chat the message list collapses (bubbles hidden; only the meta line shows) and the composer overflows the sheet; in Audio and video, Speaker, Camera, preview and Background are clipped. 768, 1024, 1440, both themes. Prototype `docs/design/live/assets/room.css` pins `#v-room` to `100dvh` and the sheet to full room height. | **Yes.** r7 gate screenshot `boundary-2026-11-19-r7/.../wc-5-room-settings.png` (1280x720, viewport capture) shows the bar at y≈530 and the sheet cut after the microphone meter. | Chat can't be read in the room on tablet and desktop; most device settings are hidden. Core task of both surfaces. |
| U2 | With a share on stage, tiles push the control bar out of view (375, 1024, 1440). | Not checked separately; likely the same root as U1 (unverified in code). | Presenter can't reach Stop sharing, Mute or Leave without hunting. |
| U3–U9 | Non-blocking: missing "Settings" eyebrow; Play test sound unfilled in light 375; title truncation and elapsed time dropped on the 375 recording pill; full-screen button uses the share glyph; narrow scrubber at 1440; meter track faint in light 375. | — | Minor. |

Note: WC-13's own screenshots are `fullPage: true` (`tests/release/src/evidence.ts:21`); U1 is confirmed independently of that.

## Decision needed

No repair budget remains. U1/U2 and B, C, D, F, G affect users' core tasks or assistive technology on this phase's new surfaces. A is an incumbent design-system choice that needs owner approval.

## Repair 8 — diagnosis and changes (2026-11-20)

Diagnosis used read-only probes against the running r7 candidate (`11ecd347` images); scripts and output are in the session scratchpad (`diag/layout.diag.ts`, `dialog.diag.ts`, `histfocus.diag.ts`).

| Finding | Root cause (measured) | Change |
|---|---|---|
| U1, U2 room layout | The room grid declares 4 rows (head, notices, body, bar). The notices row used `empty:hidden`, so when empty it left the grid and auto-placement moved the body into the `auto` row and the bar into the `1fr` row. Measured at 1440x900: body 455 px, bar row 377 px. The sheet (absolute inside the body) was only as tall as the tiles; with a share the body grew with the tiles and pushed the bar out. | `room-view.tsx`: notices row stays in flow (`empty:pb-0`); body gets an explicit `minmax(0,1fr)` row as in the prototype's `.room-body`. |
| B, F dialogs | Base UI 1.9 hides outside nodes with `aria-hidden` only and traps focus with guards that refocus on the next animation frame. Probe: in the consent dialog, quick Shift+Tab reached Leave, Copy join link and Settings behind it; axe `aria-hidden-focus` on the same nodes. F was the keyboard walk reading focus on the guard before that frame. | Kit `alert-dialog.tsx` + new `lib/inert-outside.ts`: while open, every other body child is `inert` (lifted in the same commit that closes it). WC-13 walk reads focus after it settles (two frames). |
| C label in name | Chat: visible text "Chat1" (label and badge with no space) vs name "Chat, 1 unread". Record: visible "Stop rec" vs name "Stop recording". Recording card: `aria-label` "Meeting …, 20 Nov 12:57, 4 seconds" vs visible title, facts and chips. | Space between label and badge, name uses the drawn badge text; "Stop rec" name equals the prototype's visible label; recording links named by their visible content (unused name helpers removed). |
| G focus with no change | The "Meeting deleted" toast: Base UI 1.9 makes the toast root `tabIndex=0`; no focus fill can pass 3:1 against both the toast's `fg` fill and the page. The prototype's `.toast` is not a tab stop. | Kit `toast.tsx`: root `tabIndex=-1` (its close/action buttons keep their stops; Base UI's F6 shortcut can still focus it). |
| A, D fill contrast | DESIGN.md D-6: "Text-identified components … keep the prototype fills. SC 1.4.11 does not require a boundary when the text identifies the control"; selected segments add a check icon (present in the screenshot). The WC-13 probe applied the boundary rule to every control. | No product change. `a11y-probes.ts` gains an opt-in `exemptTextIdentified` (WC-13 only; WR-8 unchanged): text-identified buttons and links are measured and recorded, not failed. Inputs, selects, switches and controls whose label is visually hidden still need 3:1. |
| E delete-dialog contrast | Audited two frames after the dialog opened, during its fade-in. | WC-13 cells are audited after running finite animations end (capped 2 s); the reduced-motion check is unchanged. |
| H playback unreached | The reduced-motion pass stopped recording within ~1 s; the file had 0 B, so Play could not start. | Tour records at least 4 s before stopping. |

Oracle additions: `wc-room-layout.ts` checks in every in-room cell that the bar's bottom is the viewport's bottom, an open sheet reaches the bar, and the newest chat message and the composer sit inside the sheet with a real size. WC-13 screenshots are now viewport captures (what is on screen), not full-page.

Not changed (recorded): the "Settings" eyebrow (documented choice in `room-sheet-pane.tsx`), the share glyph on the player's full-screen button, the 1440 scrubber width, the 375 recording pill. Product edge case for follow-up: a recording stopped within about a second is kept as a 0-byte file whose player says the browser can't play it. Residual: Base UI can still focus a toast through its F6 shortcut, where no focus fill shows.
