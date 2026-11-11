# Vendored: hybrid-mobile-architecture `gen-design-tokens` (unmodified)

Plan c04, task 4.1 (operator decision Q-A8: vendor the package generator and extend
it; not Style Dictionary). **Do not edit these files.** Change behaviour in
`../src/`, which wraps or replaces the vendor functions listed below. Vendored
code is exempt from the 500-line rule (AGENTS.md, exception E-L3) and is excluded
from Biome.

## Provenance

| Field | Value |
|---|---|
| Upstream | `hybrid-mobile-architecture` plugin by Travis James / Prometheus Agentic Growth Solutions |
| Version | `2.0.0-alpha.5` (`plugin.json`). Reference checkout `/Users/gqadonis/Projects/hybrid-mobile-architecture-src` at `f34584ae9c646889f947e92bed0f1d7f5854a784` (`v2.0.0-alpha.5-2-gf34584a`). The generator files are unchanged between the tag and that commit. |
| Last upstream change to the bundle | `0bb71dd69d9b8ea773273c6e77cc4f29eaed1af0` (2026-09-26) |
| Licence | MIT, `license.txt` (upstream `LICENSE.txt`, byte-identical, renamed for kebab-case). The bundle also embeds `smol-toml` 1.9.0 (BSD-3-Clause); its notice is kept at the end of `gen-design-tokens.mjs`. |
| Vendored | 2026-11-09 by design-lead, copied with `cp`; sha256 checked against the source |

| File | Upstream path | Lines | sha256 |
|---|---|---|---|
| `gen-design-tokens.mjs` | `scripts/gen-design-tokens.mjs` (esbuild bundle, the shipped generator) | 874 | `dbd6af71fac1d543dd4182b20571fac562aa7860ee5e2d346e5c4e6493825bc0` |
| `gen-design-tokens.mts` | `runtime/src/native-helpers/gen-design-tokens.mts` (its source) | 34 | `48855c36f3cb4b063aade832e32d0a7a70e2a5132e558738326878a1eb6f47ae` |
| `common.mts` | `runtime/src/native-helpers/common.mts` (`ToolError`, `assert`, `main`, `text`) | 49 | `d34b5a79817931aebf84dbc23c3ade3ee81850d7324b050597fe2464c013d19e` |
| `tokens.toml` | `assets/templates/design-tokens/tokens.toml` (its default input, placeholder palette) | 126 | `b40bb5be9b1e7d1e9d83eec132513e9fb464979ff798d3572f99f4846f3a8761` |
| `license.txt` | `LICENSE.txt` | 21 | `43bb7b358c01f21bdc54b59d5cae07b9cbddcb75040d33fca6ea0a59b41573ec` |

The bundle `gen-design-tokens.mjs` is byte-identical to the copy in the installed
`knowme-builder/hybrid-mobile-architecture/2.0.0-alpha.5` plugin cache.

## Why it is wrapped rather than imported

The bundle runs `await main(...)` at module top level and exports nothing, so
importing it would execute it against its own placeholder TOML. The extensions
therefore replace its functions one for one, keeping its model: one source, both
themes under the same names, role-based names, a `GENERATED … DO NOT EDIT` banner,
and Dart colour constants.

| Vendor behaviour | Gap for Know Meet | Replaced by |
|---|---|---|
| `parse(text(source))`, smol-toml reader of `tokens.toml` with fixed groups `surface/text/accent/status` | Source of truth is the design-owned `docs/design/tokens.json` (Q-A2), flat keys, light inherits from dark | `src/tokens-json-adapter.ts`, `src/classify.ts` |
| `assert(/^#[0-9a-fA-F]{6}$/)` on Dart colours only | Rejects `rgba()` and `transparent`; CSS output was never validated | `src/colour.ts` (hex 3/4/6/8, `rgb()`/`rgba()`, `transparent`; malformed values are a hard error for every output) |
| No `clamp()` handling (sizes are plain numbers) | Fluid type such as `clamp(36px, 3.6vw + 18px, 64px)` | `src/clamp.ts` (passes through to CSS; resolves to Dart functions and per-viewport constants) |
| Hard-coded `fonts` map and `GoogleFonts.*` calls | Self-hosted fonts (CSP `font-src 'self'`), three families | `src/fonts.ts` (faces from `token-generator.config.json`; `@font-face` for web, family names for Flutter) |
| `if (existsSync(dirname(path)))` silently skips missing surfaces | A missing output silently ships stale tokens | `src/output.ts` (missing output directory is a hard error; `--check` reports drift) |
| One `@theme` block with literal dark values plus a light override | Needs runtime theme switching, shadcn names and both themes as variables | `src/emit/web-css.ts`, `src/emit/shadcn-css.ts`, `src/emit/tailwind-theme.ts` |
| `abstract final class T` with `…OnLight` constants, `GoogleFonts` text styles, `blockDecoration` | Needs a `ThemeExtension` palette and a light/dark `ThemeData` builder | `src/emit/dart-tokens.ts`, `src/emit/dart-theme.ts` |
| `ToolError`, `assert`, `main` (`common.mts`) | Same contract kept | `src/errors.ts` |

Dropped on purpose: the vendor's deprecated colour-word aliases (`red` →
`danger`), because Know Meet's token names are the prototype's CSS custom
property names; the `blockDecoration` left accent bar, because the Know Meet
prototype has no edge-bar treatment; and the `prose` serif family, which Know
Meet doesn't use.
