# WCAG 2.2 AA contrast record (c02 task 2.1, updated for D-5 in c04)

Computed, not estimated. `packages/design-tokens/scripts/contrast-record.mjs`
reads `docs/design/tokens.json`, composites translucent fills over the surface
they sit on, and writes every pair to `contrast-record.json` (same folder). The
pairs, and where each one appears in the prototype, are listed in
`packages/design-tokens/scripts/contrast-pairs.mjs`. Rerun:

```sh
node packages/design-tokens/scripts/contrast-record.mjs
```

- Thresholds: SC 1.4.3 text 4.5:1 (large text 3:1); SC 1.4.11 UI components and
  graphics 3:1. Ratios are truncated to 2 decimals, so a borderline pair never
  passes by rounding.
- Input: `tokens.json` v1.2.0, sha256 `c872cf1d89266453afaf16fc7513476ec4f06f4bf8993dc0e0db2428a530af32`.
- v1.1.0 (sha256 `453302c7…f779e8`) had 26 failing pairs. v1.2.0 applies operator
  decision **D-5**: every proposed text fix, both switch fixes and the input ring.
  The changed values are listed in [discrepancy-log.md](discrepancy-log.md),
  section D.

## Summary

| Theme | Text pairs pass / fail | UI and graphic pairs pass / fail |
|---|---|---|
| Dark | 53 / 0 | 25 / 4 |
| Light | 53 / 0 | 24 / 5 |
| **Total (164 pairs)** | **106 / 0** | **49 / 9** |

The pair list changed in two places, so the total stays 164. The agent glyph on a
room tile is now measured with its own `cyan-text-on-tile` role. The input
boundary is now measured as a ring against card, bg and surface in both themes;
the old "input fill vs page" pairs are gone, because the fill no longer carries
the boundary.

All body, secondary, link, button and toast text passes in both themes, including
every claim in the brand guide's contrast table (16.33, 7.02, 6.76, 6.76, 17.95,
5.28, 5.36 and 3.97 for the graphics-only ember). The focus ring passes on every
surface in both themes (lowest: light ember `#E04E28` on `#F7F7F8`, 3.70).

## D-5 fixes as applied

| Pair | Before | After |
|---|---|---|
| light ember-text on ember-soft (`ember-soft` `#FBE8E1` → `#FCECE7`) | 4.46 | 4.60 |
| light cyan-text on cyan-soft over surface / card (`cyan-soft` alpha 0.12 → 0.10) | 4.49 / 4.64 | 4.60 / 4.76 |
| light agent glyph on a room tile (new light-only `cyan-text-on-tile` `#0B6680`; dark keeps `#00C2DC`) | 3.97 | 4.93 |
| light green-text on green-soft over surface / card (`green-text` `#15803D` → `#166534`) | 4.24 / 4.39 | 6.04 / 6.24 |
| host name tag on a bright video frame, both themes (`media-tag-bg` alpha 0.66 → 0.74) | 3.68 | 4.96 |
| light switch off: thumb vs track (`switch-track` `#D5DAE1` → `#858F9E`) | 1.40 | 3.27 |
| light switch off: track vs row (surface / card) | 1.40 / 1.35 | 3.15 / 3.27 |
| dark switch on: thumb vs ember track (`switch-thumb-on` `#FFFFFF` → `#0B0F14`; light stays `#FFFFFF`) | 2.84 | 6.75 |
| input ring vs card / bg / surface, dark (`ring-input` `transparent` → `#64718A`) | n/a (no ring) | 3.12 / 3.90 / 3.43 |
| input ring vs card / bg / surface, light (`ring-input` `#D5DAE1` → `#858F9E`) | 1.40 / 1.31 / n/a | 3.27 / 3.05 / 3.15 |

**Flat 2.0 exception (D-5):** the 1px inset input ring is the only line the
design system allows. It applies to text inputs (`.input`, shadcn `--input`,
Flutter `InputDecorationTheme`) and nothing else; cards, panels, dividers and
other components still separate by fill alone.

## Still failing (SC 1.4.11), all outside D-5

None of these was proposed for a fix in v1.1.0. D-5 approved fixes only for the
pairs above.

| Component | Pairs and ratios | Assessment |
|---|---|---|
| Switch off, track vs row (dark) | `#253044` vs surface 1.27, vs card 1.16 | The off switch is identified by its thumb (`fg` on `muted`, 11.25), which passes. Low risk. A fix would need a dark track change, which D-5 did not include. |
| Segmented control, pressed | Fill vs track: dark 1.16, light 1.14 | Pressed state is also shown by text colour (`fg-sub` → `fg`) and `aria-pressed`. Low risk; none proposed. |
| Status pips in chips (light) | Green 2.88, amber 2.80 | The chip text names the status, so the pip is supplementary. Optional fix: `green-text` / `amber-text` for pips. |
| Speaking ring on a room tile (light) | Green `#16A34A` vs tile 2.78 | The speaking state also shows audio bars. Optional fix: `green-text`. |
| Knowledge drop zone outline | Dark 1.27, light 1.47 | Identified by its fill and "Drop files" text. Low risk; none proposed. |

## Not measured (and why)

- Disabled controls (`opacity 0.5`) are exempt under SC 1.4.3 and 1.4.11.
- Text over live video depends on the video; the tag and footer pairs above use
  white and black frames as bounds.
- Hover fills (`card-hov`) are measured for text; hover is not a state that
  needs 3:1 against the default.
