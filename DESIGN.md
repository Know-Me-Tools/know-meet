# Know Meet design system

Owner: design-lead (know-meet-team). Shared by the React 19 web app, the Tauri
desktop app (same web build) and the Flutter app: **the same token, the same rule, the
same look on every surface.** Product context is in [PRODUCT.md](PRODUCT.md).

## Sources of truth (in precedence order)

1. `docs/design/tokens.json` (v1.5.0): every value. Generated outputs come only from
   `pnpm --filter @know-meet/design-tokens generate`: web `tokens.css`, `theme.css`
   (Tailwind 4), `shadcn.css`, Flutter `tokens.g.dart` (`KmPalette`, `KmTokens`) and
   `km_theme.g.dart` (`buildKmTheme`). Never hand-edit a generated file.
2. This file: rules that tokens alone cannot carry (control states, layout, motion).
3. `docs/design/brand-guide.html`, then `docs/design/prototype/` (visual reference,
   revision v2: renders tokens v1.5.0, the Flat 2.0 rules and the adaptive navigation
   below), then `docs/design/live/` (room layout reference). The root `live/` folder
   is not a source. `docs/design/prototype-v1-archive/` is the frozen pre-v2 copy
   (history only, never a source).

Every token change is logged in `docs/design/token-reconciliation/discrepancy-log.md`
(sections D and E; reference revision v2 in section F), and its contrast is in
`contrast-record.md` next to it.

## Identity in one paragraph

Dark-first, calm, precise. Near-black ground (`bg #0B0F14`) with a cool surface
ladder (`bg-2`, `surface`, `card`, `muted`), one warm accent (ember) for action and
selection, cyan only for agents and dots, Space Grotesk display over Inter body with
JetBrains Mono eyebrows. Light theme mirrors every role with the same names. Operate
mode: brand lives in precise details (the ember, the orb, the Gathering mark), not in
decoration. No redesign without owner approval.

## Flat 2.0 controls (operator decision D-6, 2026-11-11)

**No borders, outlines, rings, strokes or divider lines anywhere**, including focus.
Adjacent regions differ by fill. WCAG 2.2 AA is mandatory: control boundaries meet
SC 1.4.11 by fill (>= 3:1 against the surface), text on every fill meets SC 1.4.3
(>= 4.5:1), and keyboard focus is a fill change of >= 3:1 against both the
unfocused state and the surface (SC 2.4.7; the whole control changes, which exceeds
the SC 2.4.13 area guidance). Every pair is computed in the contrast record.

### No strokes, shadows or rules anywhere (RV-30..F5-7, tokens v1.4.0)

The scan covers **every element and every `::before` / `::after`**, not only controls.
It reports a non-zero border or outline, any `box-shadow`, an `<hr>`, and any
generated thin-line pseudo-element, and the count is 0 in every in-scope state.
`shadow-float`, `shadow-card` and `switch-thumb-shadow` are `none` in both themes (the
tokens stay so consumers keep compiling); floating layers (menu, sheet, dialog) are
told apart by fill and the scrim, never a shadow. Replacements, shared by prototype
and app:

| Was | Now |
|---|---|
| 3-4px red stripe on an error summary (sign-in, schedule) | `red-soft` fill + alert icon (`red-text`) + heading and text; the message is never carried by colour alone |
| "or with email" rules either side of the label | the label alone, centred, separated by spacing (`s1` above and below inside the form stack) |
| amber ring around a transcript search hit | `amber-soft` fill behind the text, text stays `inherit` (`fg` >= 4.5:1 on it); the match count in the search status line carries the same information |
| hollow ring "Offline" pip | filled square pip in `fg-sub` (the not-live glyph, as `.state-glyph`) |
| three-bar "speaking" glyph drawn with copies of a shadow | three filled bars drawn as backgrounds; the box keeps a 4px footprint |
| email and SMS preview inset rings, card hairline shadow | fill steps only (`card` / `bg-2` on the panel surface) |
| row, section, footer and header hairlines in `live/` | removed; `live/*.html` is the prototype plus only the LiveKit changes |

### Surface hierarchy (operator decision 2026-11-12, tokens v1.5.0)

With no strokes and no shadows, the three surface levels are told apart **by fill
alone**, and every adjacent step is **1.15-1.25:1** (luminance contrast) in both
themes. The contrast record checks it as kind `surface-step` (min 1.15, max 1.25), so
a token edit that flattens the hierarchy fails the record.

| Level | Token | Dark | Light | Used by | Step to the level below |
|---|---|---|---|---|---|
| Page | `bg` | `#0B0F14` | `#DCDEE0` | page ground, room stage | n/a |
| Panel | `surface` | `#181F2B` | `#ECEEF1` | `.card`, `.panel`, `.stat`, `.empty`, even table rows, code blocks | 1.16 / 1.16 |
| Raised | `card` | `#222B3B` | `#FFFFFF` | `.card-raised`, secondary button | 1.16 / 1.16 |

Rules:
- Light is lighter-is-higher, like dark: the page is the deepest fill and raised
  content is white. Never invert a level to make one screen read better.
- `muted` (chips, count pills, list-row leads, avatars, inline code) sits on a panel or
  raised level and is a recessed fill one step past the panel: dark `#2A3548`
  (1.15 above `card`), light `#D4D7DC` (1.24 below `surface`). `card-hov` stays a
  hover tint between levels and is never a level. `tile` / `tile-2` equal `surface` /
  `card` in dark; light tiles are unchanged.
- `bg-2` (app bar, nav bar and rail, menus, table header) is chrome, not a level:
  white in light; in dark it stays `#111620` (1.06:1 above `bg`), an open owner question.
- Every text role keeps 4.5:1 and every control fill 3:1 on every level. Moving the
  levels apart moved these with them (v1.5.0): `control`, `control-hov`,
  `control-placeholder`, `switch-track`, `control-invalid`, light `ember-text`,
  `cyan-text`, `amber-text`, and the light brand `ember` / `cyan` graphics (3:1 on the
  page). Values and ratios: discrepancy-log F5b, RV-38 to RV-41.

### Deterministic processing capture (RV-36)

`recordings.html?km-processing-pin=N#processing:<id>` (or `html[data-km-processing-pin=N]`
set before load) renders the pipeline frozen: N steps done, step N at 50% with a static
icon, the rest waiting; `N=5` is the finished state. No timers, no toast. The app's processing view
must honour the same parameter (request to ui-engineer and bdd-quality).

### Roles

| Token | Dark | Light | Job |
|---|---|---|---|
| `control` | `#68758E` | `#757E8E` | Resting fill of every control whose boundary must be seen |
| `control-hov` | `#5C6880` | `#737C8B` | Hover fill (`@media (hover: hover)` only) |
| `on-control` | `#FFFFFF` | `#0B0F14` | Value text, labels and glyphs on `control` |
| `control-placeholder` | `#FBFCFD` | `#0E1218` | Placeholder on `control` |
| `control-invalid` / `on-control-invalid` | `#E12727` / `#FFFFFF` | same | Invalid text control |
| `selected` / `on-selected` | `#FA5F30` / `#0B0F14` | `#C13E1E` / `#FFFFFF` | Checked, pressed, current, selected |
| `focus` / `on-focus` | `#FFFFFF` / `#0B0F14` | `#0B0F14` / `#FFFFFF` | Keyboard focus fill and its content |
| `focus-placeholder` | `#4B5563` | `#C3CAD4` | Placeholder in a focused empty field |
| `slider-thumb` | `#FFFFFF` | `#0B0F14` | Slider thumb |
| `switch-track` | `= control` | `= control` | Switch off track |
| `pip-green/amber/red` | status hues | darker text hues | Status pips inside chips |
| `speak-person/agent/phone`, `on-speak` | `#E8532A` `#0891B2` `#15803D`, `#0B0F14` | same | Speaking badge on a room tile |

Web: `bg-control text-on-control`, `bg-selected`, `bg-focus`, etc. (Tailwind
`@theme inline`), or shadcn `bg-input` (= control) and `bg-ring` (= focus). `--input`
and `--ring` are **fills**: `border-input`, `ring-*`, `outline-*` and `divide-*`
utilities are banned in components. Flutter: `Theme.of(context).extension<KmPalette>()`
plus the generated `kmControlFill`, `kmControlText` and `kmControlPlaceholder`
state resolvers.

### Where a control may sit

Controls sit on `bg`, `bg-2`, `surface` or `card` only (all measured). Never place a
control directly on `card-hov`, `muted` or `tile`: wrap it in a `surface` region.

### State order

One rule everywhere: **focus wins, then invalid, then selected, then hover, then
rest.** Disabled is `opacity: 0.5` on the resting look (exempt from 1.4.3/1.4.11)
and never takes focus fill.

| Component | Rest | Hover | Selected / on | Focus (`:focus-visible`) | Invalid |
|---|---|---|---|---|---|
| Text input, textarea, select | `control` + `on-control`; placeholder `control-placeholder` | `control-hov` | n/a | `focus` + `on-focus`; placeholder `focus-placeholder` | `control-invalid` + `on-control-invalid`, plus the error line (icon + text) below |
| Checkbox (20px, radius-4) | `control` box, no glyph | `control-hov` | `selected` box + `on-selected` tick | `focus` box + `on-focus` tick if checked | n/a |
| Radio (20px round) | `control` disc | `control-hov` | `selected` disc + 8px `on-selected` dot | `focus` disc (+ `on-focus` dot) | n/a |
| Switch (48x28, thumb 22) | track `switch-track`, thumb `switch-thumb` | track `control-hov` | track `ember-btn`, thumb `switch-thumb-on`, thumb at +20px | track `focus`, thumb `on-focus` (position still shows state) | n/a |
| Segmented control | track `control`, segments transparent with `on-control` text | segment `control-hov` | segment `selected` + `on-selected` text **and a leading check icon** | segment `focus` + `on-focus` | n/a |
| Slider (track 6, thumb 20, 44px control box) | track `control`, range `selected`, thumb `slider-thumb` | n/a | n/a | control box takes a `focus` plate (radius-pill); range and thumb `on-focus`, rest of track `control` (RV-22) | n/a |
| Toggle chip | `control` + `on-control` | `control-hov` | `selected` + `on-selected` + check icon | `focus` + `on-focus` | n/a |
| Tabs | transparent, `fg-sub` text (text identifies) | `card-hov` | pill `selected` + `on-selected` (replaces the 2px ember underline) | `focus` + `on-focus` | n/a |
| Nav item (bar, rail, app bar) | transparent, `fg-sub` | `card-hov` | indicator `selected` + `on-selected` (replaces `ember-soft`) | `focus` + `on-focus` | n/a |
| Primary button | `ember-btn` + `on-ember` | `ember-btn-hov` | n/a | `focus` + `on-focus` | n/a |
| Secondary button | `card` + `fg` (text identifies) | `card-hov` | n/a | `focus` + `on-focus` | n/a |
| Ghost / icon button | transparent, icon `fg` | `card-hov` | pressed: `selected` | `focus` + `on-focus` | n/a |
| Danger button | `danger-btn` + `on-danger` | `danger-btn-hov` | n/a | `focus` + `on-focus` | n/a |
| Interactive card, list row, link | surface ladder (text identifies) | `card-hov` | n/a | whole card `focus`, all text `on-focus` | n/a |
| Text link in running copy (no class, outside nav) | `ember-text` on the surrounding fill | n/a | n/a | highlight: `focus` fill behind the text run (3px past the glyphs, radius 4, per line fragment, no layout shift) + `on-focus` text (RV-24) | n/a |
| Focusable region (tab panel, overflowing table scroller) | its surface | n/a | n/a | whole region `focus`, all content `on-focus`, inner fills drop out (RV-23) | n/a |
| File input | hidden input + label button (`input + label.btn`) | as the button | n/a | input and its label button `focus` + `on-focus`; a native file input takes `focus` and inverts its button (RV-25) | n/a |
| Skip link | off-screen, `ember-btn` + `on-ember` | n/a | n/a | slides in at `s2` with the `focus` fill + `on-focus` (>= 3:1 against the page; its rest state is never seen) | n/a |
| Choice card | `surface` with a radio or checkbox indicator inside (the indicator carries state) | `card-hov` | indicator `selected`; card fill `ember-soft` (supplementary) | card `focus` | n/a |
| Drop zone | `control` + `on-control` ("Drop files or browse") | `control-hov` | drag-over: `selected` + `on-selected` ("Release to upload") | `focus` + `on-focus` | n/a |

Rules that follow from the table:

- **Text-identified components** (buttons with a label, link cards, list rows, tabs,
  nav items) keep the prototype fills. SC 1.4.11 does not require a boundary when the
  text identifies the control (W3C Understanding 1.4.11: "a button without a visual
  boundary - the button's text is sufficient"). Their selected and focus states are
  still fills that pass 3:1. If the owner wants every button on `control`, it is one
  mapping change (`--secondary`), not a component change.
- **State is never colour alone.** Selected segments and chips add a check icon;
  invalid fields add the error line; switches move the thumb.
- **Placeholders.** A 3:1 fill boundary leaves no room for a dim placeholder, so
  placeholder and value are close in tone. Fields always have a visible label;
  placeholder copy is an example starting "e.g." and is never required to understand
  the field.
- **Focus transitions** use `--dur-fast` on `background-color` and `color`; under
  reduced motion they are instant.
- **The focused element carries the fill itself** (RV-22..RV-25). Focus is measured on
  the element that holds keyboard focus: its own fill must differ from its unfocused
  fill and from the surface by >= 3:1, and every piece of content on it must keep
  >= 4.5:1 (text) or >= 3:1 (glyphs, thumbs, tracks) against the focus fill. A native
  control whose visible parts are pseudo-elements (range, file) takes the `focus`
  fill on its own box; a visually hidden input (file, switch, choice card) takes the
  fill itself and hands the same fill to the element that stands in for it. A
  translucent "-soft" fill under a focused control is measured composited over the
  surface it renders on (contrast record, RV-26).
- **Tooltip = toast style** (operator, 2026-11-11): `fg` fill, `bg` text, 14px medium,
  radius 12, padding `size-tooltip-pad-y` x `size-tooltip-pad-x`, max width
  `size-tooltip-max-w` (320), no shadow, appears after 500ms hover or on focus,
  dismisses on Escape (SC 1.4.13), never holds the only copy of information.
- **Lines that are removed**, with their fill replacement: app bar bottom rule
  (bar sits on `bg`, content on `bg`: separation by spacing); tab-list rule (none);
  table header/row rules (header row `bg-2`, body rows alternate transparent and
  `surface`); sheet footer and account-menu rules (spacing `s3`); code block ring
  (fill `surface` only); avatar-stack 2px cut-out (avatars sit 4px apart, no overlap);
  account button expanded ring (avatar fill `selected`); paused/offline state glyph
  ring (filled 8px `fg-sub` square, round dot means live); `Separator` renders as
  spacing, never a line.
- **Status pips** use `pip-green/amber/red` (light uses the darker text hues so they
  pass on their soft chip).
- **Speaking on a room tile** (replaces the 3px inset rings): a `size-speak-badge`
  (24px) solid badge in the tile head holding the voice bars in `on-speak`;
  `speak-person` for people, `speak-agent` for dots and agents, `speak-phone` for
  dial-in. The badge colours are theme-invariant and pass on a dark tile, a light
  tile and over white or black video.
- **A2UI catalog:** a `Text` inside a `Button` inherits the button's foreground
  (`on-ember` on `ember-btn`); it never sets its own `fg`. That was the 16.4 axe
  failure.

## Sizes (D-7)

Component sizes are tokens (`--size-*`, Tailwind `p-size-input-pad-x`, `w-size-dialog-w`;
Flutter `KmTokens.sizeInputPadX`):

| Token | Value | Use |
|---|---|---|
| `size-target-min` / `size-target` | 24 / 44 | WCAG 2.5.8 floor / preferred hit area |
| `size-control-h`, `size-control-h-sm` | 48, 36 | Text controls; small buttons (pointer: fine only) |
| `size-input-pad-x`, `size-input-pad-y`, `size-select-pad-end`, `size-textarea-min-h` | 14, 12, 40, 96 | Text controls |
| `size-check` | 20 | Checkbox and radio |
| `size-switch-w/h/thumb/thumb-inset/travel` | 48, 28, 22, 3, 20 | Switch |
| `size-slider-track-h`, `size-slider-thumb` | 6, 20 | Slider |
| `size-dialog-w`, `size-sheet-w`, `size-toast-w`, `size-tooltip-max-w` | 560, 440, 440, 320 | Overlay widths, always `min(token, 100vw - 32px)` |
| `size-pip`, `size-speak-badge` | 8, 24 | Status pip, speaking badge |
| `size-nav-bar-h`, `size-nav-rail-w`, `size-nav-indicator-w/h` | 64, 80, 56, 32 | Adaptive navigation |
| `measure-empty` | 46ch | Empty-state paragraph measure |

## Adaptive layout (D-8, operator 2026-11-11)

Web (including the narrow Tauri window) and Flutter share this spec and must look the
same at the same width. Width classes come from tokens, never from literals:

| Class | Width | Token (min-width) | Primary navigation |
|---|---|---|---|
| Compact | < 600 | (default) | Bottom bar |
| Medium | 600 to 1023 | `window-medium` 600 | Navigation rail |
| Expanded | >= 1024 | `window-expanded` 1024 | Inline links in the app bar (the prototype's desktop nav) |

Tailwind: `medium:` and `expanded:` variants. Flutter: `LayoutBuilder` /
`MediaQuery.sizeOf(context).width` against `KmTokens.windowMedium` and
`KmTokens.windowExpanded`. The prototype's 900px nav collapse and its hamburger
(`frame.nav-collapsed`, `frame.nav-open`) are retired; the other prototype `max-width`
breakpoints (`bp-*`) still drive grids and page padding inside each class.

Why these bounds: 600 and 1024 already exist in the prototype (`bp-599`, `bp-1023`),
600 is the Material compact/medium boundary Flutter users expect, and at 1024 the five
inline links plus the app-bar actions fit without truncation.

### Destinations

Five, in this order, same icons and labels on every surface: Home (`home`), Meetings
(`calendar`), Recordings (`film`), Agents (`agent-add`), Settings (`settings`).
Navigation appears wherever the app bar appears (home, dashboard, agents,
recordings, settings, including signed-out gates). It never appears in the meeting
room, sign-in or join flows.

### Anatomy and states

**App bar (all classes).** Height `header-h` (64) plus the top safe area, fill `bg`,
no bottom rule. Brand, then (expanded only) the inline links, then Start meeting,
theme toggle and account. At compact the Start meeting button is icon-only (44px)
and the wordmark hides below 381px, as in the prototype.

**Bottom bar (compact).** Fixed to the bottom, fill `bg-2`, height `size-nav-bar-h`
(64) plus `env(safe-area-inset-bottom)` (Flutter: `MediaQuery.padding.bottom`). Five
equal items, each at least 48 wide and the full bar height (>= 44 target). Item: 24px
icon centred in an indicator `size-nav-indicator-w` x `size-nav-indicator-h`
(56 x 32, radius-pill), label 12px semibold below, gap 4.

- Rest: icon and label `fg-sub`, indicator transparent.
- Hover (pointer only): indicator `card-hov`.
- Current (`aria-current="page"`): indicator `selected`, icon `on-selected`,
  label `fg`.
- Focus: the whole item (radius 12) takes `focus`; icon and label `on-focus`.
- Pressed: no ripple; the fill change is the feedback.
- Hidden while the on-screen keyboard is open and inside the room. Page content gets
  bottom padding equal to the bar height so nothing hides under it; toasts sit
  `s4` above the bar.

**Rail (medium).** Fixed to the leading edge under the app bar, width
`size-nav-rail-w` (80) plus `env(safe-area-inset-left)`, fill `bg-2`, full remaining
height. Items stacked from the top with `s4` top padding and `s1` gaps; each item is
80 x 64 with the same 56 x 32 indicator, icon and 12px label as the bar and the same
states. The page column starts after the rail; `page-max` and page padding are
unchanged. The rail *reserves* its width inside the viewport, it never adds to it:
the content column is `viewport - rail` (web: `margin-inline-start` or
`padding-inline-start` of `--km-rail-w` on a column that is `width: auto` /
flex `1 1 auto` with `min-width: 0`; never `width: 100%` or `100vw` plus an offset).
Nothing scrolls horizontally at any width from 600 to 1023 (checked at 600, 768
and 1023: `scrollWidth == clientWidth`). Flutter: rail and page share one `Row`,
the page in `Expanded`.

**No horizontal page overflow, with wide tables in their own scroller (rule RV-21).**
`scrollWidth == clientWidth` holds at 600, 768 and 1023 in both themes for every
in-scope *state*, not only page loads (invites, meeting detail and recording delivery
carry wide tables). Rules: (1) the page shell and every single-column grid container (`.app`, `.card`, `.panel`,
`.section`) is one shrinkable column (`grid-template-columns: minmax(0, 1fr)`), never an
implicit `auto` track, which grows to the min-content of a wide table;
(2) a grid or flex child that holds wide content has `min-width: 0` and no auto margin
on its stretch axis (the rail's `#main` zeroes `margin-inline-end`, because an auto
margin turns off stretch); (3) no fixed pixel widths on containers; (4) a wide table sits
in a `.table-wrap` with `overflow-x: auto` and `position: relative` (so absolutely placed
`.sr-only` header labels scroll with it); (5) while it overflows the wrapper is a
named region: `role="region"`, `aria-label` from the table caption, `tabindex="0"`
(arrow keys scroll it); its focus is the whole-region `focus` fill with `on-focus`
content (RV-23; `card-hov` was 1.03-1.36:1), never an outline or ring.
Flutter: a wide table is a horizontal `SingleChildScrollView` inside a `Semantics`
container with a label, focusable, with the same fill focus.

**Inline links (expanded).** The prototype's pill links (44px tall, 14px semibold,
radius-pill). States as the table above: current is `selected` / `on-selected`
(was `ember-soft` / `ember-text`).

**Semantics.** One `<nav aria-label="Primary">` with a list of links in every class;
the class changes layout only, never the DOM order. Skip link stays the first
focusable element. Flutter uses `NavigationBar`/`NavigationRail`-equivalent kit
widgets with `Semantics(selected: true)` on the current item.

### Safe areas and targets

- Web: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  and `env(safe-area-inset-*)` on the app bar (top), bar (bottom) and rail (left);
  never cap zoom. Flutter: `SafeArea` on the same three edges only.
- Every target is at least `size-target-min` (24, SC 2.5.8). Navigation items,
  primary actions and every touch target are `size-target` (44) or larger; 36px
  `sm` buttons are allowed only for `pointer: fine` and with 8px spacing.
- Content reflows at 320px with no horizontal scroll (SC 1.4.10).

### Resize motion

When a desktop window is resized across 600 or 1024 (or a tablet rotates), the
layout animates once per crossing; continuous resizing inside a class never animates.

| Token | Value | Use |
|---|---|---|
| `dur-nav-morph` | 280ms | Nav container morph: bar <-> rail <-> inline links |
| `dur-nav-label` | 150ms | Label fade out/in during the morph |
| `dur-reflow` | 200ms | Content column crossfade/slide when the rail appears or leaves |
| `ease-layout` | `cubic-bezier(0.2, 0, 0, 1)` | All three |

- Animate `transform` and `opacity` only; never width, height, padding, margins,
  colours or blend modes. This includes what the browser adds by default (correction
  2026-11-11, prototype v2.1):
  - The UA `::view-transition-group(*)` animation tweens `width`/`height` (and
    `backdrop-filter`) as well as `transform`. On `transition.ready`, rewrite each
    group animation's keyframes to `transform` only (`effect.setKeyframes`); the
    group snaps to its new box while the indicator still travels.
  - The UA `::view-transition-old/new(*)` pair also animates `mix-blend-mode`. Use
    own opacity-only keyframes (`km-vt-out` / `km-vt-in`) and hold
    `mix-blend-mode: plus-lighter` statically.
  - The class commit must not start state transitions (the 150ms link/indicator
    colour fades): disable transitions on the nav while the new class is applied
    and the style flushed (prototype: `html[data-nav-committing]`), so re-enabling
    them starts nothing. This also keeps reduced motion and in-class resizes at zero
    animations.
- Web: wrap the class change in `document.startViewTransition()` with
  `view-transition-name: km-nav` on the nav and `km-nav-current` on the current
  indicator, so the indicator travels to its new position; labels fade with
  `dur-nav-label`; `main` crossfades with `dur-reflow`. Without View Transitions,
  crossfade the nav (`opacity`, `dur-nav-label`) and swap instantly. If a crossing
  happens while a transition runs, call `skipTransition()` and apply the new class.
- Flutter: `AnimatedSwitcher` (or an implicit animation) keyed on the width class,
  `KmTokens.durNavMorph` with `KmTokens.easeLayout`; the current indicator uses a
  shared `Hero`-like tween; content uses `AnimatedSwitcher` with `durReflow`.
- Focus survives the morph: the focused destination keeps focus in its new position.
- **Reduced motion is instant:** `@media (prefers-reduced-motion: reduce)` skips the
  view transition entirely; Flutter checks `MediaQuery.disableAnimationsOf(context)`
  and uses `Duration.zero`.

## Verification hooks

- Contrast: `node packages/design-tokens/scripts/contrast-record.mjs` (258 pairs, including the four `surface-step` pairs).
- Fidelity: the oracle compares against baselines captured from prototype v2, so
  this file's rules are the reference, not exceptions (`thresholds.json` ADJ-1 to
  ADJ-3 superseded; ADJ-4 contract amendment pending).
- Checklist for reviews (also the Kimi Code fallback when Impeccable is unavailable):
  no stroke utilities; every control on an allowed surface; every state from the
  table; nav identical across web and Flutter at 375, 768 and 1024 in both themes;
  reduced motion instant.
