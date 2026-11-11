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
these states as logged design-lead exceptions. Ratios are in
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
reused for cards, dividers or other components.

Result: dark 173 keys, light 38 keys.
