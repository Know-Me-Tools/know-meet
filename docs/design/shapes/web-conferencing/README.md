# Web conferencing shapes (batch 2)

Phase `web-conferencing-features`, change `wc01-conferencing-scenarios`, task 1.3.
Owner: design-lead. Status: **approved 2026-11-18** (operator decision
`batch2-approval-web-conferencing-features`, recommended defaults; see Decisions). UI
tasks 5.1, 5.2, 7.3, 9.4 and 10.5 build from these briefs once approved; WC-13
checks the built screens against them.

| Surface | Brief | Builds in | Scenarios |
|---|---|---|---|
| Background effects picker | [background-effects.md](background-effects.md) | 7.3 | WC-4, WC-13 |
| Device settings (lobby and room) | [device-settings.md](device-settings.md) | 5.1, 5.2 | WC-5, WC-6, WC-13 |
| Local meeting history | [local-history.md](local-history.md) | 9.4 | WC-7, WC-13 |
| Recordings on this device | [recordings-library.md](recordings-library.md) | 10.5 | WC-8, WC-13 |

Not shaped here: share control, chat panel and "Enable audio" (they follow the
existing `meet.html` prototype and do not wait for batch 2), and the consent dialog
and recording indicator (task 10.4; the prototype `#consent-dlg` and `.rec-ind` are
its reference, with D2 copy added there).

## How these were made

- Impeccable context step run from `apps/web` (PRODUCT.md and DESIGN.md resolved,
  platform `web`), then `impeccable shape` per surface. Mode: **Operate** for all
  four (dials 3-4 / 2-3 / 6-8 from `.agents/UI_UX_PROTOCOL.md`).
- Interview substitution: shape normally asks the owner one round of questions. This
  ran as a subagent with no way to ask, so every assumption is marked **Assumption**
  in the briefs and the material ones are listed under "Open questions" below.
- Routed through `prometheus-ui-ux` (route: Operate, skills impeccable,
  ui-ux-pro-max, React/Vercel guidance for the builders). `ui-ux-pro-max` was used
  for three focused lookups only (device settings, media player keyboard, destructive
  delete); its "focus ring" advice is overridden by DESIGN.md Flat 2.0.
  `design-taste-frontend` was **not** loaded: these surfaces extend an incumbent
  world with no redesign authority, so taste guidance has no decision to make.
- No new visual direction. Every surface reuses existing prototype grammar:
  the room side sheet (`meet.html .rsheet`), the lobby preview card, choice cards,
  `list-row`, the recordings library card grid and player (`recordings.html`),
  `Empty`, `AlertDialog`, toasts and notes on `-soft` fills.

## Rules every brief inherits (DESIGN.md, not restated in full)

1. **Flat 2.0:** no border, outline, ring, stroke, divider, `<hr>` or box-shadow on
   any element or pseudo-element. Regions differ by fill; floating layers by fill
   and scrim.
2. **State order:** focus wins, then invalid, then selected, then hover, then rest.
   Focus is the `focus` fill with `on-focus` content on the element that holds focus,
   >= 3:1 against its unfocused fill and the surface. Disabled is `opacity: 0.5`.
3. **Controls only on** `bg`, `bg-2`, `surface` or `card`. Never on `muted`,
   `card-hov` or `tile`.
4. **Selected is never colour alone:** a check icon, a radio dot or changed text
   travels with every `selected` fill.
5. **Targets:** 44px (`size-target`) for touch and primary actions; 36px `sm`
   buttons only under `pointer: fine` with 8px spacing; never below 24px.
6. **Reduced motion:** under `prefers-reduced-motion: reduce` every transition in
   these briefs is instant and the level meter shows no easing (values still update).
7. **Copy voice:** plain and calm; errors give the cause, then the fix; audiences are
   explicit ("only you see this", "only in this browser").
8. **Tokens only:** no hex values or font stacks in app code.
9. **Width classes** come from `window-medium` (600) and `window-expanded` (1024).
   The room keeps its prototype breakpoints (`bp-767`, `bp-899`, `bp-1199`).

## Shared accessibility acceptance (WC-13 checks these on every surface)

Run at 375, 768, 1024 and 1440 in dark and light.

- A-1 axe (WCAG 2.2 A and AA) reports zero violations on every state named in the
  brief's "States" table that the test can reach.
- A-2 Stroke scan (DESIGN.md "No strokes, shadows or rules anywhere") reports 0.
- A-3 Every control is reachable with Tab, operable with Enter/Space (and arrows for
  radio groups and sliders), and its focus fill differs >= 3:1 from its rest fill and
  from the surface (computed from tokens; the contrast record has these pairs).
- A-4 Focus order follows the visual order listed in each brief; no focus lands on a
  hidden or `inert` element; closing a sheet or dialog returns focus to its opener.
- A-5 `scrollWidth == clientWidth` on the page at every width (wide content scrolls
  in its own named region).
- A-6 With reduced motion emulated, no CSS transition or animation with a duration
  above 0 runs on the surface (checked through `getAnimations()`).
- A-7 Every new contrast pair in the brief's "Contrast pairs" table is added to
  `packages/design-tokens/scripts/contrast-pairs.mjs` and passes in the regenerated
  record before the boundary run.

## Alignment with the scenario UI contract

`tests/release/src/wc-test-ids.ts` (bdd-quality, written before these shapes) marks
its structure guesses as ASSUMPTION. These shapes match it except for two points,
which are requests to bdd-quality if the shapes are approved:

- **Effects entry point.** The contract has a separate room control
  `km-room-effects`. The shape puts Background inside the Settings pane, opened by
  `km-room-settings`, to keep the room bar to one new control. Request: point
  `EFFECTS.open` at `km-room-settings` (then the Background section).
- **Lobby speaker.** The contract lists `km-lobby-speaker-select`. The shape offers
  the speaker only in the room (the wc05 spec lists lobby mic and camera). Request:
  drop the lobby speaker id, or the operator adds a lobby speaker (device-settings
  question 1). WC-6 only needs the room path.

Matched as written: `km-speaker-unsupported` is a `role="status"` element; history
rows are the `entryOpen` link with a `<time datetime>`; delete and its confirm live in
the history detail; `km-nav-history` and `km-nav-recordings` are the navigation items
of README question 1; `km-recording-item` is the library card, `km-recording-play` the
player's play button and `km-recording-player` the `<video>`.

## Open questions for the operator (batch 2, resolved below)

Each brief repeats its own. The ones that change layout or tokens:

1. **Where History and Recordings live in the hosted app.** The hosted build has no
   navigation (`HOSTED_BUILD` hides it) and only `/`, `/join` and `/meet` routes.
   Recommendation: add `/history` and `/recordings` to the hosted router and show the
   DESIGN.md adaptive navigation in the hosted build with **three** destinations,
   Home, History (`clock`), Recordings (`film`), using the same bar / rail / inline
   anatomy. This adds a History destination that DESIGN.md does not list, so it is a
   DESIGN.md amendment. Alternative with no nav change: links from the home page and
   the meeting-ended view only (harder to find again after a reload).
2. **Level meter contrast (existing defect).** The lobby meter fill `green` on its
   `muted` track is 2.28:1 in light (dark 5.41:1), below SC 1.4.11. The prototype has
   the same pair. Recommendation: a new role token `meter-fill` = dark `#22C55E`
   (green), light `#166534` (green-text), 4.94:1 on light `muted`. It is a token
   addition and a visible change in light theme, so it needs your approval.
3. **Room controls at 375.** With wc04's Share and Chat plus Settings, the room bar
   has seven controls (408px at 48px each); it no longer fits 375 in one row.
   Recommendation: the prototype's own behaviour below 768 (the bar scrolls
   sideways). Alternative: a "More" overflow menu at compact width (not in the
   prototype).
4. **Background images.** PRODUCT.md forbids invented or licensed photography that
   is not on hand. Recommendation: three abstract backgrounds drawn from the brand
   (token colours and the Gathering ring motif, no text), produced by design-lead.
   Custom image upload is left out of this phase.
5. **New icons.** The kit has no speaker, background or image glyph. Request to
   ui-engineer (owner of `packages/ui`): `speaker`, `speaker-off`, `background`,
   `image`, drawn on the existing 24px grid in the same style as `km-icon`.

## Decisions (operator, 2026-11-18, `batch2-approval-web-conferencing-features`)

1. **Shapes approved as briefed**, with the recommended defaults: three brand abstract
   backgrounds Ground, Dusk, Tide ([sources](../../backgrounds/README.md)); one blur
   strength; speaker and effects room-only; device choices not remembered; stored-chat
   links not clickable. Each brief's section 11 records its own answers.
2. **`/history` and `/recordings`** join the hosted router, with the shared adaptive
   navigation in the hosted build: three destinations (Home, History, Recordings),
   bottom bar on phones, rail on medium widths, inline links on desktop, animating
   with token motion on resize. Spec: DESIGN.md "Hosted build navigation".
3. **`meter-fill` token added** (tokens v1.6.0): dark `#22C55E`, light `#166534`
   (4.94:1 on light `muted`). Regeneration of the token outputs is pending (VLBV
   boundary).
4. **Room bar scrolls sideways below 768px.** Spec: DESIGN.md "Room control bar
   below 768".
5. Icons `speaker`, `speaker-off`, `background`, `image` remain a request to
   ui-engineer (question 5); spec in DESIGN.md "Hosted build navigation" icon note.

The two bdd-quality requests above (effects entry point, lobby speaker id) stand.
