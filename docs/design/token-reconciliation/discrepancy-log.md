# Token discrepancy log (c02, task 2.1)

Every difference found between `docs/design/tokens.json` (v1.0.0, before this
change) and what the prototype renders, with its resolution. Rule (operator
decision Q-A2, 2026-11-09): **the rendered value wins**, and it is written into
the hand-edited `tokens.json`. No rendered colour was changed.

"Rendered CSS" means `docs/design/prototype/assets/km.css`, the page `<style>`
blocks in `docs/design/prototype/*.html`, and `docs/design/live/assets/room.css`
and `live.css` (`room.css` is byte-identical to the `<style>` block of
`prototype/meet.html`). The root `live/` folder was not read (prohibited source).

Totals: **31 custom-property discrepancies** (30 missing tokens, 1 conflicting
value), **107 literal values** that had no token (103 base, 4 light-only), **8 source-level
discrepancies**. Result: dark 51 → 172 keys, light 19 → 36 keys, and
`compare km.css → tokens.json` reports no missing key and no unequal value.

## A. km.css custom properties vs tokens.json

### A1. Missing in tokens.json, dark (`:root`), 16 + 1

| ID | Token | Rendered value | Resolution |
|---|---|---|---|
| TD-01 | `tile` | `#161D29` | Added |
| TD-02 | `tile-2` | `#1C2535` | Added |
| TD-03 | `ember-btn-hov` | `#FF8159` | Added |
| TD-04 | `green-text` | `#4ADE80` | Added |
| TD-05 | `green-soft` | `rgba(34, 197, 94, 0.14)` | Added |
| TD-06 | `amber-text` | `#FBBF24` | Added |
| TD-07 | `amber-soft` | `rgba(245, 158, 11, 0.14)` | Added |
| TD-08 | `red-text` | `#F87171` | Added |
| TD-09 | `red-soft` | `rgba(239, 68, 68, 0.16)` | Added |
| TD-10 | `danger-btn-hov` | `#B91C1C` | Added |
| TD-11 | `scrim` | `rgba(5, 8, 12, 0.64)` | Added |
| TD-12 | `shadow-float` | `0 24px 64px rgba(0, 0, 0, 0.48)` | Added |
| TD-13 | `shadow-card` | `none` | Added |
| TD-14 | `ring-input` | `transparent` | Added |
| TD-15 | `header-h` | `64px` | Added |
| TD-16 | `page-max` | `1200px` | Added |
| TD-17 | `rs-w` | `400px` (`.room-body`, room sheet width) | Added |

### A2. Conflicting value

| ID | Token | tokens.json | Rendered (km.css) | Resolution |
|---|---|---|---|---|
| TD-18 | `text-display` | `clamp(40px, 4vw + 16px, 72px)` | `clamp(36px, 3.6vw + 18px, 64px)` | Rendered value wins. The old value is kept as `text-display-brand`, because the brand documents still render it through `tokens.css` (see S-01). |

### A3. Missing in tokens.json, light (`[data-theme="light"]`), 13 + 4 light-only literals

`tile` `#E9ECF1`, `tile-2` `#DDE2E9`, `ember-btn-hov` `#A93518`, `green-text`
`#15803D`, `green-soft` `rgba(22, 163, 74, 0.12)`, `amber-text` `#B45309`,
`amber-soft` `rgba(217, 119, 6, 0.12)`, `red-text` `#B91C1C`, `red-soft`
`rgba(220, 38, 38, 0.1)`, `scrim` `rgba(11, 15, 20, 0.4)`, `shadow-float`
`0 24px 64px rgba(11, 15, 20, 0.16)`, `shadow-card` `0 1px 2px rgba(11, 15, 20, 0.06), 0 1px 1px rgba(11, 15, 20, 0.03)`,
`ring-input` `#D5DAE1` (IDs TD-19 to TD-31, all added), plus four light values
that live as literals in light-only rules (TD-32 to TD-35 below).

| ID | Token (light) | Rendered value | Where |
|---|---|---|---|
| TD-32 | `switch-track` | `#D5DAE1` | km.css `[data-theme="light"] .switch .track` |
| TD-33 | `switch-thumb` | `#FFFFFF` | km.css `[data-theme="light"] .switch .thumb` |
| TD-34 | `switch-thumb-shadow` | `0 1px 2px rgba(11, 15, 20, 0.2)` | same rule |
| TD-35 | `drop-outline` | `#CBD2DB` | room.css `[data-theme="light"] .drop` |
| TD-36 | — | `danger-btn`, `danger-btn-hov`, `on-danger` | Not overridden in light by km.css; tokens.json light also inherits them. No change. |

### A4. Keys only in tokens.json

Kept, because the rendered CSS confirms their values as literals:
`radius-pill` (`999px`, used 20+ times), `dot-breathe` (`3.2s`), `dot-think`
(`0.9s`), `dot-ripple` (`1.6s`), all in km.css orb animations.

## B. Rendered literals that had no token (now tokenized)

Each value below appears literally in the rendered CSS. Names are by role where
the role is clear, by value where it is a scale step. Light overrides are in A3.

| Group | Count | Tokens (value) |
|---|---|---|
| Colour, dark base | 13 | `on-danger` #FFFFFF, `switch-track` #253044 (= muted), `switch-thumb` #E8EDF3 (= fg), `switch-thumb-on` #FFFFFF, `switch-thumb-shadow` none, `seg-pressed-shadow` 0 1px 2px rgba(0, 0, 0, 0.2), `drop-outline` #253044, `media-bg` #000000, `on-media` #FFFFFF, `media-foot-scrim` rgba(0, 0, 0, 0.55), `media-tag-bg` rgba(11, 15, 20, 0.66), `media-tag-host` #FFB59E, `media-quality-poor` #FCA5A5 |
| Orb gradient parameters | 6 | `orb-center` 34% 30%, `orb-highlight-mix` 45%, `orb-mid-stop` 56%, `orb-shade-mix` 68% (km.css `.orb`); `orb-mini-mid-stop` 58%, `orb-mini-shade-mix` 70% (room.css `.mini-orb`, live.css `.agent-face`) |
| Font weight | 4 | `font-weight-regular` 400, `-medium` 500, `-semibold` 600, `-bold` 700 |
| Font size | 10 | `text-10`, `text-11`, `text-13`, `text-15`, `text-22`, `text-34`, `text-stat` clamp(24px, 2vw + 12px, 32px), `text-glyph` clamp(16px, 1.2vw + 8px, 22px), `text-tile-avatar` clamp(22px, 2vw + 8px, 36px), `text-code-inline` 0.88em |
| Line height | 12 | `leading-none` 1, `leading-display` 1.04, `leading-105` 1.05, `leading-stat` 1.15, `leading-heading` 1.2, `leading-140` 1.4, `leading-145` 1.45, `leading-body` 1.5, `leading-bubble` 1.55, `leading-code` 1.6, `leading-18px`, `leading-20px` |
| Letter spacing | 8 | `tracking-display` -0.025em, `tracking-heading` -0.01em, `tracking-none` 0, `tracking-code` 0.04em, `tracking-label` 0.08em, `tracking-table` 0.1em, `tracking-eyebrow` 0.12em, `tracking-masked` 0.18em |
| Radius | 14 | `radius-1` … `radius-28` (1, 2, 3, 4, 5, 6, 8, 9, 10, 14, 18, 22, 28 px), `radius-round` 50%; composite radii (`16px 16px 16px 4px`, `18px 18px 18px 4px`, `18px 18px 18px 6px`, `8px 8px 0 0`) are compositions of these |
| Breakpoints | 8 | `bp-380`, `bp-420`, `bp-480`, `bp-599`, `bp-767`, `bp-899`, `bp-1023`, `bp-1199` (all `max-width`) |
| Z-index | 10 | `z-raised` 1, `z-sticky-tools` 5, `z-room-scrim` 15, `z-room-sheet` 20, `z-appbar` 50, `z-menu` 60, `z-scrim` 69, `z-sheet` 70, `z-toast` 80, `z-skip-link` 100 |
| Motion | 18 | `dur-meter` 80ms, `dur-progress` 180ms, `dur-bar` 200ms, `ease-standard` ease, `ease-in-out`, `ease-linear`, `dot-think-breathe` 1.2s, `dot-speak` 0.9s, `dot-ripple-offset` 0.8s, `anim-spin` 0.9s, `anim-spin-fast` 0.8s, `anim-spin-slow` 1s, `anim-voice-bar` 0.7s, `anim-typing` 1s, `anim-rec-blink` 1.6s, `anim-live-ring` 1.8s, `anim-wait-ring` 2.4s, `dur-reduced-motion` 0.001ms |

Breakpoint and z-index tokens are emitted for documentation and for Flutter and
Tailwind consumers; CSS custom properties cannot be used inside `@media`.

## C. Source-level discrepancies

| ID | Between | Finding | Resolution |
|---|---|---|---|
| S-01 | `tokens.css` vs `tokens.json` | `tokens.css` (prefix `--km-`) is the brand documents' stylesheet. It lacks every token added here and renders `text-display` at 40–72px in the brand guide. | **Resolved by D-4:** the c04 generator now regenerates `tokens.css` from `tokens.json` with the `--km-` prefix, mapping `--km-text-display` to `text-display-brand` so the brand hero keeps 40–72px. The brand documents render unchanged apart from the two D-5 light tints they use (`--km-ember-soft`, `--km-cyan-soft`); evidence in `packages/design-tokens/README.md`. |
| S-02 | Brand guide motion copy vs km.css | The guide says "thinking (0.9s sweep), speaking (1.6s ripple)". km.css also pulses the speaking orb at 0.9s and breathes the thinking orb at 1.2s. | Rendered wins: `dot-speak` and `dot-think-breathe` added. The guide's copy is incomplete, not wrong; no edit. |
| S-03 | Brand guide contrast table vs computed | All eight claimed ratios recomputed: 16.33, 7.02, 6.76, 6.76, 17.95, 5.28, 5.36, 3.97. | Consistent (the guide rounds). |
| S-04 | Prototype vs `docs/design/live` | `km.css` identical; `km.js` differs only in two `meet.html#start` → `room.html#start` links; page diffs are link targets, live-only copy and the live settings panel. | No token impact. Prototype is canonical for static screens; `live/room.html` is a layout reference for the room only. |
| S-05 | `docs/design/live` vs root `live/` | Six files differ (`README.md`, `live-lobby.js`, `room.html`, `screens.html`, `settings.html`, `start.sh`). | Root `live/` is a prohibited source and was not read for values. It stays under the operator's temporary exception (decision 2026-11-09T11:35); not deleted. |
| S-06 | Font loading vs CSS weights | Pages load JetBrains Mono 500/600 only, but `.masked`, `code` and `.count` request 400, so they render at 500. Inter loads 400/500/600; `b`/`strong` request 700 and render at 600 (nearest loaded face, no synthesis). | Self-host exactly the loaded weights (task 2.2) so rendering stays identical. Do not add Mono 400 or Inter 700. |
| S-07 | Page-local literals | Page `<style>` blocks use one-off sizes for illustrations and decorative posters, e.g. `clamp(13px, 1.4vw, 20px)` (index), `clamp(18px, 3vw, 30px)`, `clamp(10px, 1.4vw, 14px)` (recordings posters). | **Resolved by D-3:** they stay component-local, recorded in the component specs, not in `tokens.json`. |
| S-08 | `km.css` comment vs shells | km.css says fonts are loaded from Google Fonts by each page. | Shells self-host (task 2.2) with CSP `font-src 'self'`; same families and weights. |

## D. Operator decision D-5: contrast fixes (tokens.json v1.2.0, c04)

D-5 accepted the fixes proposed in the v1.1.0 contrast record. These are the only
values in `tokens.json` that intentionally differ from what the frozen prototype
renders. The prototype itself is not edited, so the c03 fidelity rubric must treat
these states as logged design-lead exceptions. **Superseded by section F: prototype
v2 renders these values.** Ratios are in
[contrast-record.md](contrast-record.md).

| ID | Theme | Token | Prototype renders | v1.2.0 | Why |
|---|---|---|---|---|---|
| TD-37 | light | `ember-soft` | `#FBE8E1` | `#FCECE7` | ember-text on chip-ember 4.46 → 4.60 |
| TD-38 | light | `cyan-soft` | `rgba(8, 145, 178, 0.12)` | `rgba(8, 145, 178, 0.1)` | cyan-text on chip-cyan 4.49 → 4.60 |
| TD-39 | dark, light | `cyan-text-on-tile` (new role) | `cyan-text` (`#00C2DC` / `#0E7490`) | `#00C2DC` / `#0B6680` | Agent glyph on a light room tile 3.97 → 4.93; dark unchanged |
| TD-40 | light | `green-text` | `#15803D` | `#166534` | Completed step on green-soft 4.24 → 6.04 |
| TD-41 | dark (light inherits) | `media-tag-bg` | `rgba(11, 15, 20, 0.66)` | `rgba(11, 15, 20, 0.74)` | Host name tag over bright video 3.68 → 4.96 |
| TD-42 | light | `switch-track` | `#D5DAE1` | `#858F9E` | Off switch thumb vs track 1.40 → 3.27 |
| TD-43 | dark | `switch-thumb-on` | `#FFFFFF` | `#0B0F14` | On thumb vs ember 2.84 → 6.75 (matches `on-ember`) |
| TD-44 | light | `switch-thumb-on` | `#FFFFFF` (inherited) | `#FFFFFF` (explicit) | Keeps light unchanged once dark changed (5.28) |
| TD-45 | dark | `ring-input` | `transparent` | `#64718A` | Input boundary 3.12–3.90 |
| TD-46 | light | `ring-input` | `#D5DAE1` | `#858F9E` | Input boundary 3.05–3.27 |

**Flat 2.0 exception:** TD-45 and TD-46 make the 1px inset input ring the one
permitted line in the system. It is input-only: it applies to `.input`, the
shadcn `--input` variable and Flutter's `InputDecorationTheme`, and must not be
reused for cards, dividers or other components. **Superseded on 2026-11-11 by D-6
(section E): there is no ring at all; the ring colours became the `control` fill.**

Result (v1.2.0): dark 173 keys, light 38 keys.

## E. Operator design answers of 2026-11-11 (tokens.json v1.3.0)

Decision log: `.kbd-orchestrator/phases/hybrid-shell-foundation/decision-log.md`,
"operator design answers (round-5 questions)". D-6 = Flat 2.0 with no strokes and
fill-only WCAG (supersedes the D-5 input-ring exception, section D, TD-45/TD-46);
D-7 = size tokens; D-8 = adaptive layout and its motion. Rules in `DESIGN.md`;
ratios in [contrast-record.md](contrast-record.md). The frozen prototype is not
edited, so each prototype-visible change below is logged as a fidelity adjudication
in `tests/fidelity/oracle/thresholds.json`. **Superseded by section F: prototype v2
renders every change below, so ADJ-1 to ADJ-3 are no longer exceptions.**

### E1. Removed tokens

| ID | Token | Was | Why |
|---|---|---|---|
| TD-48 | `ring-input` | dark `#64718A`, light `#858F9E` | D-6 bans the input ring. The two values live on as the `control` fill. |
| TD-49 | `seg-pressed-shadow` | `0 1px 2px rgba(0, 0, 0, 0.2)` | Pressed segment is now a `selected` fill with a check icon. |
| TD-50 | `drop-outline` | dark `#253044`, light `#CBD2DB` | Dashed outline removed; the drop zone is a `control` fill. |

### E2. Changed values

| ID | Theme | Token | v1.2.0 | v1.3.0 | Why |
|---|---|---|---|---|---|
| TD-47 | dark | `ember-btn` | `#FF6A3D` | `#FA5F30` | White focus fill on a primary button 2.84 -> 3.11; `on-ember` label 6.75 -> 6.17. Brand `ember` (`#FF6A3D`) is unchanged for the mark, orb and graphics. |
| TD-51 | dark | `switch-track` | `#253044` | `#64718A` | Off track vs row 1.27 -> 3.43 (= `control`) |

### E3. New colour roles (D-6)

| ID | Token(s) | Dark | Light |
|---|---|---|---|
| TD-52 | `control`, `control-hov`, `on-control`, `control-placeholder` | `#64718A`, `#5C6880`, `#FFFFFF`, `#F5F7FA` | `#858F9E`, `#7C8696`, `#0B0F14`, `#1C2230` |
| TD-53 | `control-invalid`, `on-control-invalid` | `#DC2626`, `#FFFFFF` | inherited |
| TD-54 | `selected`, `on-selected` | `#FA5F30`, `#0B0F14` | `#C13E1E`, `#FFFFFF` |
| TD-55 | `focus`, `on-focus`, `focus-placeholder` | `#FFFFFF`, `#0B0F14`, `#4B5563` | `#0B0F14`, `#FFFFFF`, `#C3CAD4` |
| TD-56 | `slider-thumb` | `#FFFFFF` | `#0B0F14` |
| TD-57 | `pip-green`, `pip-amber`, `pip-red` | `#22C55E`, `#F59E0B`, `#EF4444` | `#166534`, `#B45309`, `#DC2626` |
| TD-58 | `speak-person`, `speak-agent`, `speak-phone`, `on-speak` | `#E8532A`, `#0891B2`, `#15803D`, `#0B0F14` | inherited (theme-invariant) |

### E4. New size, window and motion tokens (D-7, D-8)

| ID | Tokens |
|---|---|
| TD-59 | `size-target-min` 24, `size-target` 44, `size-control-h` 48, `size-control-h-sm` 36, `size-input-pad-x` 14, `size-input-pad-y` 12, `size-select-pad-end` 40, `size-textarea-min-h` 96, `size-check` 20 (prototype literals in km.css `.input`, `.btn-sm`, `.check-row`) |
| TD-60 | `size-switch-w` 48, `size-switch-h` 28, `size-switch-thumb` 22, `size-switch-thumb-inset` 3, `size-switch-travel` 20 (km.css `.switch`) |
| TD-61 | `size-dialog-w` 560, `size-sheet-w` 440, `size-toast-w` 440 (km.css `dialog`, `.sheet`, `.toasts`); `size-tooltip-max-w` 320, `size-tooltip-pad-x` 12, `size-tooltip-pad-y` 8 (new: tooltip = toast style, operator) |
| TD-62 | `size-slider-track-h` 6, `size-slider-thumb` 20, `size-pip` 8, `size-speak-badge` 24 (new components with no prototype source) |
| TD-63 | `size-nav-bar-h` 64, `size-nav-rail-w` 80, `size-nav-indicator-w` 56, `size-nav-indicator-h` 32; `window-medium` 600, `window-expanded` 1024 (min-width) |
| TD-64 | `measure-empty` 46ch (km.css `.empty p`; S-07/D-3 kept one-off decorative sizes local, this one is a reusable measure) |
| TD-65 | `dur-nav-morph` 280ms, `dur-nav-label` 150ms, `dur-reflow` 200ms, `ease-layout` `cubic-bezier(0.2, 0, 0, 1)` |

The generator gained three categories for these (`size` -> `--spacing-*`, `measure`
-> `--container-*`, `window` -> `--breakpoint-medium` / `--breakpoint-expanded`;
Flutter `KmTokens.size*`, `KmTokens.window*`, `KmTokens.measureEmptyCh`).

### E5. Prototype lines removed by D-6 (rules, not tokens)

App bar bottom rule, tab-list rule and 2px tab underline, table header and row rules,
sheet-footer and account-menu rules, code-block ring, avatar-stack cut-out ring,
account-button expanded ring, paused/offline glyph ring, input/checkbox/radio rings,
switch focus outline, drop-zone dashed outline, room tile speaking rings (3px inset
ember/cyan/green), knowledge-row flash ring. Replacements are in `DESIGN.md`.
Room side-panel rings (`.recips`, `.pipe-step`, `.opt`) are out of this phase's scope
(D-2) and follow the same rules when they come in.

Result: dark 224 keys, light 49 keys.

## F. Reference revision v2: the prototype renders the current design (2026-11-11)

Operator approval (2026-11-11, "Yes, go ahead"): update the design reference so the
fidelity oracle compares against the current design; then bdd-quality recaptures the
baselines and delivery-lead records the contract amendment. Rule for this revision:
**change only what tokens v1.3.0 and DESIGN.md (D-6, D-7, D-8, tooltip) require;
layout, copy and structure stay as v1.** No new CHANGELOG: this section is the
change summary.

### F1. History

v1 is copied byte-for-byte to `docs/design/prototype-v1-archive/` (frozen, history
only) with `sha256-manifest.txt` (16 files: the nine prototype pages and four assets,
plus `live/assets/km.css`, `km.js` and `room.css`). Every digest matches the c02 read
in `screen-inventory/source-digests.json`; the c03 baselines (set digest `a3380e5f…b552`)
were captured from it.

### F2. What changed

| ID | Where | v1 | v2 |
|---|---|---|---|
| RV-01 | km.css section 1 | 52 hand-written tokens, D-5 values absent, `ring-input` | Verbatim copy of `packages/design-tokens/generated/web/tokens.css` (v1.3.0, 224 dark / 49 light keys). Refresh by re-copying, never by editing |
| RV-02 | Focus, everywhere | 2px ember outline (`:focus-visible`), ember inset ring on inputs, switch outline, choice-card outline | Fill: the whole control takes `focus` + `on-focus` (inner fills drop out). Tab panels: `card-hov` fill. Error summary (programmatic focus): none |
| RV-03 | `.input`, select, textarea, `.recips` | `card` + 1px `ring-input` | `control` / `control-hov` / `control-invalid` / `focus`, placeholders `control-placeholder` / `focus-placeholder`; size tokens; readonly keeps the control fill (v1 `surface` would vanish on a surface card without the ring) |
| RV-04 | Checkbox, radio | Native, `accent-color` | Fill-only (`appearance: none`): `control` box, `selected` + `on-selected` tick or 8px dot, `focus` box |
| RV-05 | Slider (`.scrub`) | Native, `accent-color` | Track `control`, range `selected` (km.js sets `--pct`), thumb `slider-thumb`; focus track `focus`, thumb `on-focus` |
| RV-06 | Switch | `muted` track (light `#D5DAE1` literal), outline on focus | `switch-track`, `switch-thumb(-on)`, hover `control-hov`, focus track `focus` + thumb `on-focus`, size tokens |
| RV-07 | Segmented | `muted` track, `card` pressed segment + shadow | `control` track, `on-control` text, pressed `selected` + leading check icon |
| RV-08 | Tabs, side nav, app-bar links | 2px ember underline; `ember-soft` / `ember-text` pills | `selected` / `on-selected` pill; hover `card-hov` |
| RV-09 | Lines | App bar rule, tab-list rule, table rules, sheet-foot and menu rules, `.divider`, home section and footer rules, compare-table, wizard-foot, auth-foot, dashboard (calendar, switch, mail, delivery, agent rows), settings (switch, capability, permission rows), recordings to-do rows, screens tools bar, room options rule, transcript mark underline | Removed; separation by the existing spacing. Table: header row `bg-2`, even body rows `surface`, wrap transparent |
| RV-10 | Rings | Code-block ring, avatar-stack cut-out, account-button ring, paused/offline glyph ring, input ring, file-drop ring, danger-panel ring, pipeline running/skipped rings, knowledge-row flash ring, join "waiting" rings | Removed or filled: avatars 4px apart; account avatar `selected` when open; paused/offline = filled 8px `fg-sub` square; running step `amber-soft`; flash `cyan-soft`; waiting pulse = filled `ember-soft` disc |
| RV-11 | Speaking | 3px inset ember/cyan/green ring on room tiles; 2px rings on the home mini room, recording posters and player tiles | 24px `size-speak-badge` with three `on-speak` voice bars at the end of the tile head (`speak-person`, `speak-agent` for dots/agents, `speak-phone`); top-right on mini tiles, posters and player tiles |
| RV-12 | Drop zone | `surface` + 2px dashed outline (light literal `#CBD2DB`) | `control` + `on-control`, drag-over `selected` + `on-selected`, keyboard focus `focus` |
| RV-13 | Choice cards (`.option`) | 2px ember ring when checked | Indicator carries state; checked card `ember-soft`; hover `card-hov`; focus whole card `focus` with the indicator inverted |
| RV-14 | Status pips | `green` / `amber` / `red` | `pip-green` / `pip-amber` / `pip-red`, `size-pip` |
| RV-15 | Navigation | Inline links >= 900; hamburger + dropdown <= 899 | Adaptive (D-8): km.js sets `html[data-nav-class]` from `--window-medium` / `--window-expanded`. Bar < 600 (fixed bottom, `bg-2`, 64 + safe area, five 56x32 indicators with 12px labels), rail 600-1023 (fixed leading, 80 wide, items 80x64), inline pills >= 1024. Content clears the bar (body padding) and starts after the rail (`#main` margin); toasts sit `s4` above the bar. Hamburger and `.appnav-toggle` removed |
| RV-16 | Resize motion | None | One View Transition per class crossing (`km-nav`, `km-nav-current`, `km-main`; `dur-nav-morph` 280, `dur-nav-label` 150, `dur-reflow` 200, `ease-layout`); fallback nav crossfade; a crossing during a transition skips it; instant under reduced motion; focus is kept (same DOM) |
| RV-17 | Tooltip | None | `.tooltip` = toast style (`fg` fill, `bg` text, 14px medium, radius 12, `size-tooltip-*`); km.js shows it for `[data-tooltip]` after 500ms hover or on focus, Escape dismisses. No page uses it yet, so no capture changes |
| RV-18 | Literals | `#FFFFFF` on danger buttons and video tile footers, `rgba(0,0,0,.55)` scrim | `on-danger`, `on-media`, `media-foot-scrim` |

Pages touched: `km.css`, `km.js`, and the `<style>` blocks of index, auth, join,
dashboard, agents, recordings, settings, screens and meet (room). `live/assets/km.css`
is a copy of the prototype's, `live/assets/km.js` the prototype's with its two
`room.html#start` links, `live/assets/room.css` stays identical to meet.html's style
block. The other `docs/design/live/*.html` page style blocks were not revised (out of
scope; prototype is canonical for static screens, S-04).

### F3. Verification (design-lead, ad hoc, not baselines)

- Rendered with the c03 capture environment (frozen clock, self-hosted fonts):
  index, dashboard, schedule, register step 3, room, recording detail, settings,
  join waiting, account menu, skip link and keyboard focus, both themes, 375 to 1440.
  No page errors. Computed-style sweep of every link, button, field, tab, card, tile,
  list row, chip, table cell, app bar and nav: **0 non-zero borders, outlines or
  ring/rule box-shadows.**
- Resize 1200 -> 1100 -> 1000 -> 900 -> 700 -> 500 -> 400 -> 1300: classes inline,
  inline, rail, rail, rail, bar, bar, inline; 4 view transitions with motion, 0 under
  `prefers-reduced-motion: reduce`; the focused nav link keeps focus across a crossing.
- v1 vs v2 at `agents.register.3` 1024 dark: identical layout; only fills and lines differ.

### F4. Consequences for the oracle

- `screen-inventory/route-inventory.json` v2.0.0: `frame.nav-collapsed` and
  `frame.nav-open` retired (`inScope: false`, IDs kept); `frame.nav-bar` (375),
  `frame.nav-rail` (768), `frame.nav-inline` (1024, 1440) added as bdd-quality
  proposed. In scope **71 states** (frame 8), matrix **568 cells**, 16 not applicable,
  **552 captures** (v1: 70, 560, 8, 552). `routeSource.sha256` refreshed (screens.html
  lost its tools-bar rule).
- `tests/fidelity/oracle/thresholds.json`: ADJ-1 to ADJ-3 `superseded` by this
  revision (not exceptions); ADJ-4 `resolved by contract amendment (pending)`. No
  threshold, default, rubric or matrix value was edited.
- Driver changes needed (bdd-quality): listed in
  `tests/fidelity/oracle/proposed-nav-states.json` `driverChangesNeeded`.
- Request to the repo-rules owner: add `docs/design/prototype-v1-archive/**` to line
  exception E-L6 (frozen design prototypes) in `tooling/repo-rules/src/line-exceptions.ts`;
  the archived pages exceed 500 lines exactly as `docs/design/prototype/**` does.
- Open (owner decision, not blocking): tab-panel focus uses a `card-hov` fill, which is
  below 3:1 for a large region; the danger panel lost its only distinguishing ring and
  now relies on its copy and danger button; readonly fields take the control fill.

### F5. Reference revision v2.1: two prototype defects found at recapture (2026-11-11)

bdd-quality's v2 recapture found the reference itself breaking DESIGN.md, so the
reference was corrected before the contract amendment. No token, copy or layout
value changed; `km.css` and `km.js` in `prototype/assets/` and `live/assets/` (kept
identical in the touched blocks).

| ID | Defect (v2) | Cause | Fix (v2.1) |
|---|---|---|---|
| RV-19 | Each class crossing animated `width`/`height`; snapshots animated `mix-blend-mode`; nav links/indicators ran their 150ms `color`/`background-color` fades. DESIGN.md allows transform and opacity only | Browser defaults: the UA `::view-transition-group` keyframes tween size; the UA old/new pair adds a blend-mode animation; the class commit restyled links that carry state transitions | km.js `compositorOnlyGroups()` rewrites every group animation to `transform` only on `transition.ready`; km.css names own `km-vt-out` / `km-vt-in` opacity keyframes for `::view-transition-old/new(*)` with static `mix-blend-mode: plus-lighter`; `commit()` sets `html[data-nav-committing]` (km.css: `transition: none !important` on the nav), flushes style, then removes it. Durations, easing and reduced-motion rules unchanged |
| RV-20 | Horizontal overflow in the rail class: 104 full-page captures at 768 were 848 wide | `#main.page` is `width: 100%` and the rail rule added `margin-left: 80px` | Rail rule now `margin-inline-start: var(--km-rail-w); width: auto; min-width: 0` on `#main`, so the column is `viewport - rail` |
| RV-21 | Three states still overflowed at 600, 768 and 1023 once their state was driven: `dashboard.invites` (`#main` 80 to 1222px, document 1222), `dashboard.meeting.*` (pricing-review 779px at 768, 763px at 600; also partner-onboarding, cohort-kickoff, product-sync at 600) and `recordings.detail.partner-onboarding-1014.delivery` (793px). Page-load checks (RV-20) never reached them | Four stacked causes. `.app` (and the `.card`/`.panel`/`.section` grids) have an implicit `auto` column, so the column took the table's min-content. `.page` carries `margin: 0 auto` and the rail rule only reset the start margin; an auto end margin disables grid stretch, so `#main` fit its widest table (1142px). The absolutely placed `.sr-only` header span had no positioned ancestor inside the scroller, so it escaped the `.table-wrap` clip and widened the document | `.app`, `.card`, `.panel` and `.section` get `grid-template-columns: minmax(0, 1fr)` (cards held the meeting-detail invitee table in an implicit `auto` column: 779px at 768, 763px at 600); the rail rule adds `margin-inline-end: 0`; `.table-wrap` gets `position: relative`; km.js `markScrollRegions()` makes an overflowing `.table-wrap` a named, focusable region (`role="region"`, `aria-label` from the caption, `tabindex=0`) with a `card-hov` fill focus. No token, copy or visible layout value changed |

DESIGN.md "Rail (medium)" and "Resize motion" carry the same correction for web and
Flutter.

DESIGN.md carries the rule as "No horizontal page overflow, with wide tables in their own scroller (rule RV-21)". Verification: every in-scope state (71 inventory entries) driven with `planState`/`driveState` from `tests/fidelity/src/support/state-drivers.ts`, at 600, 768 and 1023, dark and light, asserting `documentElement.scrollWidth == clientWidth` and that each overflowing `.table-wrap` has `tabindex=0`, `role=region` and a name. Recapture needed: the three states at 768 (their columns were wider than the viewport).

Verification (design-lead, prototype only, `python3 -m http.server` on
`docs/design/prototype`, Playwright Chromium 1.65 via `tests/fidelity` node_modules,
probe functions from `tests/fidelity/src/motion/nav-morph-probe.ts` with the nav
selector `html`, because the prototype carries `data-nav-class` on `<html>`):

- `checkMorphTokens` (`dur-nav-morph`, `ease-layout`) on index and dashboard:
  1440->1000 rail, 1024->1023 rail, 1000->500 bar, 600->599 bar, 500->800 rail,
  800->1200 inline: **12/12 pass**. Observed per crossing: 4 groups (`km-nav`,
  `km-nav-current` 280ms; `km-main`, `root` 200ms) animating `transform` only, 8
  snapshots animating `opacity` only (`km-nav` 150ms), all `cubic-bezier(0.2, 0, 0, 1)`;
  no link or indicator transitions.
- `checkInstant`: 1440->1100 (inside inline) and 1440->500 under reduced motion, both
  pages: **4/4 pass**.
- `scrollWidth == clientWidth` for index, dashboard, agents, recordings, settings,
  screens, auth, join and meet at 320, 599, 600, 768, 1023 and 1024: **54/54, no
  overflow**.

Recapture needed: every rail-class capture (768 column, all in-scope states with the
app bar, both themes), since the content column moved 80px narrower inside the
viewport. Bar (375) and inline (1024, 1440) captures are unaffected by RV-20; RV-19
changes no static pixel.

Implementation notes (reported to the owners, not edited here):
- apps/web `nav-morph.ts` strips only `width`/`height` from the group keyframes
  (`backdrop-filter` stays if the UA adds it); `styles/frame.css` keeps the UA old/new
  keyframes (`mix-blend-mode` animates) and the 150ms `.km-nav-item` /
  `.km-nav-indicator` colour transitions run on the class commit. The rail uses
  `padding-left` on a flex `1 1 auto`, `min-width: 0` main, which matches RV-20.
- apps/mobile `km_app_frame.dart`: rail and page share a `Row` with the page in
  `Expanded`, which matches RV-20. The only implicit tween in the frame is the
  indicator `AnimatedContainer` in `km_nav_bars.dart` (fixed 56x32, `durFast` colour
  for state changes); its fill does not change across a class crossing, so RV-19
  holds, but mobile-engineer should confirm no size/colour tween fires on the switch.

#### F5 continued: focus fills below 3:1 (2026-11-11)

bdd-quality's focus-fill probe (`tests/fidelity/src/a11y/flat-controls-probe.ts`, run
over the v2 prototype by `tests/fidelity/src/cli/prototype-probes.ts flat`) reported
351 focus stops whose fill changed by < 3:1 (552 cells, 21,182 stops). Operator rule
(AGENTS.md "Flat 2.0 and WCAG"): every focusable element shows focus by a fill change
>= 3:1 against its unfocused state and the surface, with its content >= 4.5:1 on the
focus fill. Fixed in `prototype/assets/km.css` (copied byte-identical to
`live/assets/km.css`), `prototype/dashboard.html`, `prototype/agents.html`; no token,
copy or rest-state layout value changed (tokens.json stays v1.3.0). DESIGN.md "State
order" carries the rules.

| ID | Finding (probe, v2.1) | Cause | Fix (v2.2) |
|---|---|---|---|
| RV-22 | `input[Seek]` (recordings player scrubber, 40 stops) and every `input[type=range]`: 1.00:1 to rest and surface | The focus fill was drawn on the `::-webkit-slider-runnable-track` / `::-moz-range-track` pseudo-elements; the control box itself stayed transparent | The control box (44px target) takes a `focus` plate (`radius-pill`, `dur-fast` fill transition); on the plate range and thumb are `on-focus` and the rest of the track keeps `control`. Contrast record: track on plate 4.91 (dark) / 5.87 (light); thumb and range against track 3.90 / 3.27; thumb on plate 19.21 |
| RV-23 | `div#agent-panel` (agent detail tab panel, 64 stops): 1.36:1 (dark) and 1.03:1 (light); overflowing `.table-wrap` scrollers used the same `card-hov` focus | Focusable regions were excluded from the 7b focus rule and took `card-hov`, a hover tint, not a 3:1 change | `[role="tabpanel"]` and `.table-wrap[tabindex]` join the 7b rule: the whole region takes `focus`, all content `on-focus` (19.21), inner fills drop out while focused. `agents.html` `.tab-panel:focus-visible` card-hov override removed |
| RV-24 | "Fix in step N" (agents register step 4, 24 stops) and "connect Telnyx SMS" (settings delivery, 4 stops) text links: 2.15:1 (dark only) | Not a design defect: the probe takes the luminance of the translucent `amber-soft` note fill as if opaque (`#F59E0B`). Composited over the panel it is `#352F25`, and the focus fill is 13.23:1 against it (contrast record `focus-fill-vs-amber-soft-over-surface`) | Text links in running copy (no class, outside `nav`) now show focus as a highlight: `focus` fill behind the text run, 3px past the glyphs, radius 4, `box-decoration-break: clone`, padding offset by an equal negative margin (28 links measured: 0 px of text movement). Probe correction requested (below) |
| RV-25 | `input#d-files` (meeting detail "Add" pre-reads, 32 stops): 1.00:1; same pattern unreached on `#f-files` (schedule form, past the 40-stop probe limit) | The visually hidden file input had no fill of its own; a page-local rule filled the label | `km.css` rule for every file input: the input takes `focus` + `on-focus` itself and hands the same fill to its stand-in `input + label` (and `.drop:has(input:focus-visible)` in the room); a native file input takes `focus` and inverts its `::file-selector-button`. Page-local rule in `dashboard.html` removed |
| RV-26 | `button#kb-chip` (room "Sources" chip, 15 stops): 2.21:1 to rest (dark only) | Not a design defect: same opaque reading of translucent `cyan-soft`; composited over `bg` the chip is `#092830` and the focus change is 15.45:1 | None needed in the prototype. Contrast record adds `focus-fill-vs-unfocused-cyan-soft-over-bg` and focus against `amber`/`red`/`green`/`cyan-soft` over `surface` (all >= 13.1:1) |
| RV-27 | `a[Skip to content]` (`frame.skip-link-focused`, 8 stops): 1.00:1 to rest | Not a design defect: that state is rendered by pressing Tab, so the probe's rest pass reads the skip link while it is already focused (rest fill = focus fill). Its real rest fill is `ember-btn`; focused it slides in with `focus` (19.21:1 against the page) | None needed. Probe correction requested (below) |
| RV-28 | `live/*.html` still carried four v1 outline rules (sign-in error summary, choice cards, agent tab panel, pre-read file label) | The live copy's pages predate D-6 | Replaced with the prototype's fill rules. Not in the fidelity scope; `live/meet.html` `.drop` keeps a v1 dashed outline (live room is a contract exclusion, VS-6) |

Probe corrections requested from bdd-quality (owner of `tests/fidelity/**`; not edited
here): (1) `fillOf` should alpha-composite every translucent layer down to the first
opaque ancestor, as `contrast-record.mjs` does, instead of returning the first
non-transparent colour; (2) `auditFlatControls` should blur before `readRest`, so a
state that is rendered with focus (`frame.skip-link-focused`) has a true rest fill.
With both corrections applied to a scratch copy, RV-24, RV-26 and RV-27 measure as
passes; the remaining official findings are only those three probe artefacts.

Verification (design-lead, 2026-11-11; prototype served by `tests/fidelity`'s static
server, Playwright Chromium 1.65, every in-scope state x dark/light x 375/768/1024/1440
= 552 cells, 21,182 focus stops; scratch runner and logs in `/tmp/kmdiag`, not tracked):

- Official `auditFlatControls`: **351 -> 79** findings, all RV-24/RV-26/RV-27 probe
  artefacts (48 "Fix in step", 8 "connect Telnyx SMS", 15 "Sources", 8 "Skip to
  content"). No-stroke (rest and focus): 0. Page overflow (`scrollWidth` >
  `clientWidth`): 0. `auditScrollRegions`: 0.
- Same audit with the two probe corrections above: **0 findings**.
- 28 text links across 8 states at 375 and 1440: the RV-24 highlight moves no glyph.
- Contrast record: 254 pairs (was 240), 0 failing.

Recapture needed only for captures that show a focused slider, file label, tab panel,
scroll region or text link (`frame.skip-link-focused` is unchanged); rest states are
pixel-identical.

### F5b. Reference revision v2.3: whole-page no-stroke scan (2026-11-11, tokens v1.4.0)

The v2.2 no-stroke probe only inspected controls. Building c10/c11 showed decorative
strokes elsewhere on the pages. `tests/fidelity/src/a11y/all-elements-stroke-probe.ts`
(`prototype-probes.ts strokes`) now walks every element and `::before` / `::after` of
every in-scope state x theme x viewport and reports non-zero borders and outlines, any
`box-shadow`, `<hr>` and thin-line pseudo-elements. First run: the light theme alone
had one `shadow-card` hairline shadow on every card, row and button; the dark theme
had float shadows, two inset rings and the `.or` rules. Fixed in
`prototype/**` and `live/**` (km.css stays byte-identical across both).

| ID | Finding | Cause | Fix |
|---|---|---|---|
| RV-29 | 4px (dashboard schedule error) and 3px (auth sign-in error) red stripe on `.err-summary` | `box-shadow: inset 4px 0 0 var(--red)` | Stripe removed. `red-soft` fill + alert icon in `red-text` + heading and text, as `.error-card` and the app's `ErrorSummary` (`bg-red-soft`, icon, text). Meaning is not carried by colour alone |
| RV-30 | "or with email" rules (auth) | `.or::before/::after` 1px lines | Label only, centred, `margin: s1 0`; matches the app's `<p aria-hidden>` |
| RV-31 | 1px amber ring on transcript search hits (recordings) | `mark { box-shadow: 0 0 0 1px var(--amber) }` | `amber-soft` fill, `color: inherit`; `fg` on it is 10.2-11.2:1 dark and 16.4-16.9:1 light (>= 4.5:1). Same as the app's `<mark class="bg-amber-soft">`, `screens`, `meet` |
| RV-32 | Hollow "Offline" pip (agents, 2px inset ring) and the "speaking" state glyph (two shadow copies) | `box-shadow: inset 0 0 0 2px` and `box-shadow: 6px 0 0 / -6px 0 0` | Filled `fg-sub` square (the not-live glyph); three filled bars as background gradients, 4px footprint kept by -6px margins. The app's offline pip needs the same change (request to ui-engineer) |
| RV-33 | Email and SMS preview inset 1px rings (settings) and the card hairline shadow | `inset 0 0 0 1px var(--muted)` | Rings removed; separation by the existing `card` / `bg-2` fills |
| RV-34 | Light `shadow-card` / `switch-thumb-shadow`, dark and light `shadow-float` (menus, sheet, toast, tooltip, big-play) | Elevation shadows were tokens | `docs/design/tokens.json` v1.4.0: all four are `none`; regenerated `tokens.css`, `generated/web/tokens.css`, `tokens.g.dart` (`shadowFloat`, `shadowCard` empty), manifest. Names stay so consumers compile. Floating layers rely on fill, radius and the scrim. `brand.css` (brand documents, not a prototype or app surface) keeps its own hairlines and is outside this scan |
| RV-35 | `live/*.html` still carried v1 hairlines, rings and a ring pulse (row and section rules, `auth-foot`, `.wiz-foot`, option ring, `.file-drop`, `.mtile.is-speaking`, `.wait .ring`, `.vt.speaking`, `.danger-panel`) | The live copy was forked before D-5 to D-8 and had not been resynced | Every live page is the prototype page plus only the LiveKit hunks (`room.html` links, live copy, the settings token-service panel, the lobby code redirect). Supersedes RV-28. `live/meet.html` `.drop` is fixed by the same resync |
| RV-36 | `recordings.processing.*` is timer-driven (5 steps, 1.3-2.0 s each) | Capture depended on wall-clock timing | `?km-processing-pin=N` (query before the hash) or `html[data-km-processing-pin=N]` freezes the frame: N done, step N 50% with a static icon, rest waiting, N=5 finished; no timers or toast. Documented in `tests/fidelity/oracle/proposed-nav-states.json` `notes.processingPin` |
| RV-37 | Probe gap | `auditFlatControls` reads controls only | `scanAllStrokes` added (`prototype-probes.ts strokes`); `text-decoration` (link underline, `line-through` on a done to-do) is reported as informational, not counted: an underlined in-copy link is the non-colour cue SC 1.4.1 needs and the strike carries the done state with its checked box |
| RV-38 | Light `bg` / `surface` / `card` 1.03 / 1.04:1 apart (1.07 page to raised) once shadows were `none` (RV-34); dark 1.14 / 1.10:1 | Hierarchy was carried by the hairline shadows | Operator decision 2026-11-12 ("do as you recommend"): fill steps of ~1.15-1.25:1, no strokes or shadows. `tokens.json` v1.5.0. Light: `bg` `#F7F7F8` -> `#DCDEE0`, `surface` `#FAFBFC` -> `#ECEEF1`, `card` `#FFFFFF` kept: **1.16 / 1.16**. Dark: `bg` `#0B0F14` kept, `surface` (and `tile`) `#161D29` -> `#181F2B`, `card` (and `tile-2`) `#1C2535` -> `#222B3B`: **1.16 / 1.16**. `muted` follows (dark `#253044` -> `#2A3548`, 1.15 above `card`; light `#EEF0F3` -> `#D4D7DC`, it had merged with the new `surface`, now 1.24 below it); dark `card-hov` `#202B40` -> `#252F41` (stays between `card` and `muted`). Contrast record gains kind `surface-step` (min 1.15, max 1.25), pairs `surface-step-surface-vs-bg` and `surface-step-card-vs-surface` in both themes |
| RV-39 | Control fills under 3:1 on the new levels: light `control` `#858F9E` 2.42:1 on `bg`; dark `control` `#64718A` would be 2.91:1 on `card`; dark `control-invalid` `#DC2626` 2.94:1 on `card` | The page (light) and raised level (dark) moved toward the control fill | Light `control` / `switch-track` -> `#757E8E` (3.03 on `bg`, `on-control` 4.69), `control-hov` `#7C8696` -> `#737C8B` (`on-control` 4.56; stays darker than rest), `control-placeholder` `#1C2230` -> `#0E1218` (4.58; the old value was 3.88). Dark `control` / `switch-track` -> `#68758E` (3.06 on `card`, `on-control` 4.64), `control-placeholder` `#F5F7FA` -> `#FBFCFD` (4.51; old 4.33), `control-invalid` (both themes) -> `#E12727` (3.06 on dark `card`, `on-control-invalid` 4.64). Focus fills unchanged: every focus pair still >= 3:1 against rest and surface |
| RV-40 | Light text under 4.5:1 on the deeper page / panel: `ember-text` `#C13E1E` 3.92 on `bg`, `cyan-text` `#0E7490` 3.97 on `bg`, `amber-text` `#B45309` 4.32 on `surface` | Same cause | `ember-text` -> `#B0391D` (4.51), `cyan-text` -> `#0B6680` (4.82, the existing `cyan-text-on-tile` value), `amber-text` -> `#A64C08` (4.93). Fills `ember-btn` and `selected` (`#C13E1E`) unchanged; `pip-amber` unchanged |
| RV-41 | Light brand graphics under 3:1 on the new page: `ember` `#E04E28` 2.94 (symbol core, orb), `cyan` `#0891B2` 2.73 (agent dot, `orb--cyan`) | Same cause | Light `ember` -> `#DC4D27` (3.03), light `cyan` -> `#0889A8` (3.02). Dark brand ember `#FF6A3D` and `speak-agent` `#0891B2` unchanged |

Resolved by RV-38 (operator 2026-11-12): the surface levels are 1.16:1 apart in both
themes (DESIGN.md "Surface hierarchy"). The verification block below is the v1.4.0 run;
the v1.5.0 run follows it.

Verification (design-lead, 2026-11-11; prototype served by `tests/fidelity`'s static
server, every in-scope state x dark/light x 375/768/1024/1440 = 552 cells; logs in
`/tmp/probe-*.txt`, not tracked):

- `strokes` (all elements): **0** findings over 102,947 elements and pseudo-elements
  (first run: hundreds, dominated by `shadow-card`/`shadow-float`). Informational:
  24 distinct text-decoration runs (underlined links, one `line-through`), not counted.
- `flat` (controls): 0 findings, 21,182 focus stops. `overflow`: 0 cells over
  viewport. `scroll`: 0 findings, 32 overflowing regions all focusable.
- `live/*.html` (10 pages and their start/lobby/ended/sign-in-error/sign-up hashes,
  dark/light x 375/1440, signed in): 0 findings with the same scan. `live/room.html`
  in-room states need a LiveKit connection and were not scanned.
- Contrast record: 254 pairs, 0 failing. Tokens: `generate --check` clean at 1.4.0.

Recapture needed (prototype and app): every light-theme cell (card, button and row
hairline shadows gone); dark cells of `frame.account-menu-open`, the recordings player
(`big-play`), the agents list/detail with an offline agent, any speaking-state glyph,
settings delivery previews (email and SMS), `auth.sign-in.error`, `auth.*` (the `or`
label), `dashboard` schedule error, recordings transcript search, and
`recordings.processing.*` (pinned, RV-36).

Verification of tokens v1.5.0 (RV-38 to RV-41; design-lead, 2026-11-12; prototype served by
`tests/fidelity`'s static server, Playwright Chromium, every in-scope state x dark/light x
375/768/1024/1440 = 552 cells; `prototype/assets/km.css` and `live/assets/km.css` token
block re-copied from `generated/web/tokens.css` and byte-identical to it; logs in
`/tmp/kmsurf/probe-*.log` and `/tmp/kmsurf/probes.log`, not tracked):

- Contrast record: **258 pairs, 0 failing** (120 text, 134 UI and graphic, 4 surface-step).
  `generate --check` clean at 1.5.0 (web, shadcn, Tailwind, Flutter, `docs/design/tokens.css`).
- `strokes`: **0** findings over 102,946 elements and pseudo-elements (24 informational
  text-decoration runs, unchanged). `flat` (focus fill): **0** findings over 21,179 focus
  stops. `overflow`: 0 of 552 cells. `scroll`: 0 findings, 32 overflowing regions, all
  focusable. `controls` negative controls: 4/4 still detected.
- Rendered check (dashboard and settings, light, 1440): page, panel and raised levels read
  as three fills; no layout change.

Recapture needed: **every cell in both themes** (the surface, card, muted, control and
light text values changed). Open for the owner: dark `bg-2` (app bar, nav, menus) is
1.06:1 above `bg`; `control-hov` is not in the record (dark hover fill is 2.54:1 on `card`,
was 2.74 in v1.4.0); light `control-placeholder` now sits within 1.2:1 of the value text
(placeholders keep the "e.g." rule).
