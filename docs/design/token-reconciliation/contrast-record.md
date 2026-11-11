# WCAG 2.2 AA contrast record (c02 task 2.1; D-5 in c04; D-6 Flat 2.0 on 2026-11-11)

Computed, not estimated. `packages/design-tokens/scripts/contrast-record.mjs`
reads `docs/design/tokens.json`, composites translucent fills over the surface
they sit on, and writes every pair to `contrast-record.json` (same folder). The
pairs, and where each one appears, are listed in
`packages/design-tokens/scripts/contrast-pairs.mjs`. Rerun:

```sh
node packages/design-tokens/scripts/contrast-record.mjs
```

- Thresholds: SC 1.4.3 text 4.5:1 (large text 3:1); SC 1.4.11 UI components and
  graphics 3:1; operator rule D-6: focus fill >= 3:1 against the unfocused fill and
  against the surface. Ratios are truncated to 2 decimals, so a borderline pair never
  passes by rounding.
- Input: `tokens.json` v1.3.0, sha256 `3de612eee09651bf4fc15054f742ffadc266208530fb55a825d93aad5d0e8963`.
- History: v1.1.0 had 26 failing pairs, v1.2.0 (D-5) had 9. v1.3.0 applies the
  operator design answers of 2026-11-11 (no strokes anywhere, fill-only boundaries,
  fill-based focus, every UI-only failure fixed). Changed values are in
  [discrepancy-log.md](discrepancy-log.md), section E.

## Summary

| Theme | Text pairs pass / fail | UI and graphic pairs pass / fail |
|---|---|---|
| Dark | 60 / 0 | 67 / 0 |
| Light | 60 / 0 | 67 / 0 |
| **Total (254 pairs)** | **120 / 0** | **134 / 0** |

RV-22..RV-26 (discrepancy-log F5, 2026-11-11) added 14 UI pairs: the focused slider
plate (track on the plate, thumb and range against the track) and the focus fill against
translucent "-soft" fills composited over the surface they render on (Sources chip in
the room bar; text links inside amber, red, green and cyan notes on a panel). Tokens
unchanged (v1.3.0).

**Every pair passes. There are no accepted exceptions.** The pair list changed: the
ring pairs (focus ring, input ring, invalid ring, tile rings, drop-zone outline, tab
underline) are gone because those lines no longer exist, and fill pairs replace them.

## Flat 2.0 control fills (D-6)

| Requirement | Dark | Light |
|---|---|---|
| `control` fill vs bg / bg-2 / surface / card (1.4.11) | 3.90 / 3.68 / 3.43 / 3.12 | 3.05 / 3.27 / 3.15 / 3.27 |
| Value text `on-control` on `control` (1.4.3) | 4.91 | 5.87 |
| Placeholder `control-placeholder` on `control` | 4.58 | 4.86 |
| Invalid fill vs card; text on it | 3.18; 4.82 | 4.82; 4.82 |
| `selected` fill vs bg (lowest surface); label on it | 6.17; 6.17 | 4.93; 5.28 |
| Switch off: thumb vs track; track vs surfaces | 4.17; >= 3.12 | 3.27; >= 3.05 |
| Slider thumb vs range (`selected`) / track | 3.11 / 4.91 | 3.63 / 5.87 |

## Focus (fill, never an outline)

| Change | Dark | Light |
|---|---|---|
| `focus` vs unfocused `control` | 4.91 | 5.87 |
| `focus` vs unfocused `selected` and `ember-btn` | 3.11 | 3.63 |
| `focus` vs unfocused `danger-btn` / `control-invalid` | 4.82 | 3.97 |
| `focus` vs unfocused `card` (secondary button) | 15.37 | 19.21 |
| `focus` vs every surface (ghost buttons, links, cards) | >= 15.37 | >= 18.55 |
| `on-focus` text / `focus-placeholder` on `focus` | 19.21 / 7.55 | 19.21 / 11.64 |

Lowest focus change: 3.11 (dark, focus on a selected or primary control). That
margin is why dark `ember-btn` moved from `#FF6A3D` to `#FA5F30` (TD-47); white on
the old ember was 2.84.

## The previously failing pairs, fixed

| Pair (v1.2.0) | Before | Fix | After |
|---|---|---|---|
| Switch off track vs row, dark | 1.27 / 1.16 | `switch-track` = `control` `#64718A` | 3.43 / 3.12 |
| Pressed segment vs track | 1.16 / 1.14 | Track `control`, pressed segment `selected` + check icon (glyph `on-selected` 6.17 / 5.28) | pass |
| Status pips, light | 2.88 / 2.80 | `pip-green` `#166534`, `pip-amber` `#B45309` | 6.24 / 4.41 |
| Speaking ring on tile, light | 2.78 | Ring removed; solid speaking badge (`speak-*`), theme-invariant | >= 3.10 on tiles, >= 3.68 on video frames |
| Drop zone outline | 1.27 / 1.47 | Outline removed; drop zone fill `control`, drag-over `selected` | 3.43 / 3.15 |
| A2UI primary-button label (axe, gate 16.4) | fg on ember 2.41 | Label inherits `on-ember` (catalog rule, DESIGN.md) | 6.17 / 5.28 |

## Argued (measured, not exceptions)

- **Text-identified components** (labelled buttons, link cards, list rows, tabs, nav
  items) keep the prototype fills; W3C Understanding 1.4.11 passes a button whose
  text identifies it without a visible boundary. Their selected and focus fills are
  measured above and pass.
- **Placeholder vs value tone.** Both pass 4.5:1, but a 3:1 fill leaves them close in
  tone (dark: white value, `#F5F7FA` placeholder). Mitigation in DESIGN.md: visible
  labels always, "e.g." placeholder copy, a distinct `focus-placeholder` once focused.
- **Controls on `card-hov`, `muted` or `tile`** would fall below 3:1 (lowest light
  `control` on `tile` 2.76). DESIGN.md forbids that placement; it is a layout rule,
  not an accepted failure.

## Not measured (and why)

- Disabled controls (`opacity 0.5`) are exempt under SC 1.4.3 and 1.4.11.
- Text over live video depends on the video; tag, footer and badge pairs use white
  and black frames as bounds.
- Hover fills are measured for text only; hover is supplemental under 1.4.11.
