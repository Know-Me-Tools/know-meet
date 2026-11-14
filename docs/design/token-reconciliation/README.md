# Token reconciliation (OpenSpec c02-design-token-reconciliation)

`docs/design/tokens.json` now holds every colour, type, spacing, radius, layout and
motion value the prototype renders, for dark and light. It stays hand-edited and
design-owned (operator decision Q-A2, 2026-11-09); the c04 generator turns it into
web CSS, the Tailwind 4 theme and Flutter `ThemeData`.

| File | What it holds |
|---|---|
| [discrepancy-log.md](discrepancy-log.md) | Every difference between the old `tokens.json`, the rendered CSS and the other design sources, with its resolution |
| [contrast-record.md](contrast-record.md) | Readable WCAG 2.2 AA summary: D-5 fixes as applied and the pairs still failing |
| [contrast-record.json](contrast-record.json) | All 164 computed pairs (generated; don't edit) |
| [../screen-inventory/](../screen-inventory/README.md) | Route/screen/state inventory, theme behaviour and source hierarchy (task 2.3) |
| `packages/design-tokens/fonts/` | Self-hosted fonts, licences and sha256s (task 2.2) |

## Shape of tokens.json (v1.3.0)

- `themes.dark` is the complete base set and the default theme (224 keys).
- `themes.light` lists only overrides (49 keys); every other key inherits from
  dark, as `[data-theme="light"]` does in km.css.
- Each key maps one-to-one to a CSS custom property `--<key>`. The 63 dark and 32
  light custom properties in km.css, plus `--rs-w`, keep their exact names.
- Values are raw CSS values: hex, `rgba()`, `clamp()`, shadows, durations and
  easings. Nothing refers to another token, so a generator never has to resolve
  references. Where a token equals another today (`switch-track` = `muted` in
  dark), the log says so.
- `fonts` names each family, the weights the prototype loads and the font folder.

## Check

The OpenSpec scenario "Prototype values are covered": comparing km.css `:root`
and `[data-theme="light"]` with `tokens.json` gives no missing property and no
unequal value, except the logged ones: `text-display` (TD-18) and, from v1.2.0,
the D-5 contrast fixes (TD-37 to TD-46).

## Operator decisions (resolved)

| ID | Question | Decision |
|---|---|---|
| D-3 | Page-local one-off sizes in page `<style>` blocks (decorative posters, illustrations) stay component-local, not tokens? | Yes. They stay component-local (log S-07). |
| D-4 | Should c04 also regenerate `docs/design/tokens.css` (the brand documents' stylesheet) from `tokens.json`? | Yes, with the `--km-` prefix and `text-display-brand` for the brand hero. Done in c04 (log S-01). |
| D-5 | Accept the contrast fixes in `contrast-record.md`? | Yes: all five text fixes, both switch fixes, and the input ring (light `#858F9E`, dark `#64718A`) as a documented input-only exception to Flat 2.0. Applied in v1.2.0 (log section D). |

| D-6 | (2026-11-11) Flat 2.0 with no borders or outlines anywhere; WCAG 2.2 AA by fill | Applied in v1.3.0: fill-only control boundaries, fill-based focus, every UI failure fixed (log section E). Supersedes the D-5 input ring. |
| D-7 | (2026-11-11) Tokenise input padding, switch, dialog/sheet/toast widths; tooltip = toast style | Applied in v1.3.0 (`size-*`, `measure-*`, log TD-59 to TD-64). |
| D-8 | (2026-11-11) Adaptive layout shared by web and Flutter, animated resize | `window-*` and layout motion tokens (TD-63, TD-65); spec in the root `DESIGN.md`. |

These answers reached design-lead in the c04 dispatch on 2026-11-09. At the time
of writing they were not yet in the phase `decision-log.md`.

D-1 and D-2 (scope) are in [../screen-inventory/README.md](../screen-inventory/README.md).
