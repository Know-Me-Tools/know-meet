# @know-meet/design-tokens

The single token pipeline for every Know Meet surface (OpenSpec
`c04-token-generator`). Owner: design-lead.

```text
docs/design/tokens.json            THE source (hand-edited, design-owned; Q-A2)
  │  pnpm --filter @know-meet/design-tokens generate
  ├── generated/web/tokens.css         CSS variables, dark on :root, light on [data-theme="light"]
  ├── generated/web/fonts.css          @font-face for the self-hosted fonts in fonts/
  ├── generated/web/theme.css          Tailwind 4 @theme (literal scales + @theme inline colours)
  ├── generated/web/shadcn.css         shadcn/ui variables mapped onto Know Meet roles
  ├── generated/flutter/tokens.g.dart  KmPalette (ThemeExtension, both themes) + KmTokens
  ├── generated/flutter/km_theme.g.dart buildKmTheme(Brightness, {viewportWidth})
  ├── generated/manifest.json          source and output sha256s
  └── docs/design/tokens.css           brand documents' stylesheet, --km- prefix (D-4)
```

Never edit a generated file. Edit `tokens.json`, then run `generate`. `build`
runs `generate --check`, which exits 1 when an output is stale. Output folders
must exist; a missing one is a hard error (exit 73), and a malformed value
exits 65 before any file is written.

## Use

Web (Vite + Tailwind 4), in the app stylesheet:

```css
@import "tailwindcss";
@import "@know-meet/design-tokens/fonts.css";
@import "@know-meet/design-tokens/tokens.css";
@import "@know-meet/design-tokens/theme.css";
@import "@know-meet/design-tokens/shadcn.css";
```

Flutter: `ThemeData theme = buildKmTheme(Brightness.dark, viewportWidth: width);`
and `Theme.of(context).extension<KmPalette>()!` for any role ColorScheme lacks.
The Flutter app must register the font families in `pubspec.yaml` from TTFs of
the same releases (see `fonts/README.md`); that is mobile-engineer work.

## Rules the outputs encode

- Tailwind's default colour palette, font sizes and breakpoints are reset
  (`--color-*: initial`, …). Only token utilities exist, so shadcn defaults such
  as `bg-black/50` must be restyled with tokens (`bg-scrim`).
- `--card`, `--muted` and `--radius` keep their Know Meet meaning. The
  prototype's `.card` container is `surface`, so a Card primitive uses
  `bg-surface`; shadcn's `bg-card` is the raised fill (`.btn`, `.input`).
- Flat 2.0 (D-6, 2026-11-11): no lines at all. shadcn `--border` and
  `--sidebar-border` are `transparent`; `--input` is the control **fill**
  (`control`) and `--ring` is the focus **fill** (`focus`). Use `bg-input` and
  `bg-ring text-on-focus`; never `border-*`, `ring-*` or `outline-*`. Rules are in
  the root `DESIGN.md`.
- Sizes (`size-*`) become `--spacing-size-*` (`px-size-input-pad-x`,
  `w-size-dialog-w`), `measure-*` becomes `--container-measure-*`, and the adaptive
  window classes become min-width variants `medium:` (600) and `expanded:` (1024).
  Flutter gets `KmTokens.size*`, `KmTokens.windowMedium/windowExpanded` and the
  `kmControlFill`/`kmControlText`/`kmControlPlaceholder` resolvers in
  `km_theme.g.dart`.
- Breakpoints become min-width Tailwind breakpoints one pixel above the
  prototype's max-width queries: `max-bp768:` reproduces `@media (max-width: 767px)`.
- The radius token `radius` (12px) is `rounded-base`.

## Tokens a target can't express directly

| Target   | Tokens                                                                  | How to use them                                                             |
| -------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tailwind | shadows (vary by theme; Tailwind would freeze them)                     | `shadow-(--shadow-float)`                                                   |
| Tailwind | `z-*`, `dur*`, `dot-*`, `anim-*`, `orb-*` (no theme namespace)          | `z-(--z-menu)`, `duration-(--dur)`, plain `var()`                           |
| CSS      | `bp-*` inside `@media` (custom properties don't work there)             | Tailwind breakpoints, or the literal value                                  |
| Flutter  | `z-*`                                                                   | Emitted as ints for reference; Flutter uses Stack/Overlay order             |
| Flutter  | `radius-round` (50%)                                                    | `radiusRoundFraction`; use CircleBorder or StadiumBorder                    |
| Flutter  | `tracking-*` (em), `text-code-inline` (em), `leading-18px`/`-20px` (px) | Emitted as `…Em` factors / absolute px; multiply or divide by the font size |
| Flutter  | `clamp()` sizes                                                         | A function of viewport width plus constants at 375, 768, 1024 and 1440      |
| Flutter  | CSS blur radii                                                          | Converted to Flutter `blurRadius` for the same Gaussian softness            |
| Flutter  | `.eyebrow` uppercase                                                    | Not a TextStyle property; uppercase the string                              |

## Layout

- `generator/vendor/`: the hybrid-mobile-architecture generator, unmodified,
  with provenance and licence ([README](generator/vendor/README.md)).
- `generator/src/`: the extensions that replace it (each file is 500 lines or fewer).
- `scripts/`: the c02 contrast record (`contrast-record.mjs`).
- `fonts/`: self-hosted fonts and licences (c02 task 2.2).
- `token-generator.config.json`: source, fonts, fluid viewports and outputs.
