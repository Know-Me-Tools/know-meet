// km_theme.g.dart: a light/dark ThemeData builder. The vendor emitted only
// constants and GoogleFonts text styles; this maps the prototype's rules
// (km.css body, h1-h3, .display, .eyebrow, .btn, .input, .card, .switch, .toast)
// onto Material, with Flat 2.0 defaults: no elevation, no dividers and, from
// D-6 (operator 2026-11-11), no borders, outlines or rings at all. Control
// boundaries come from fills (>= 3:1) and keyboard focus swaps the fill to
// `focus` with `on-focus` content; see DESIGN.md "Flat 2.0 controls".

import type { Category } from "../classify.ts";
import type { GeneratorConfig } from "../config.ts";
import { ToolError } from "../errors.ts";
import { type TokenSet, tokenValue } from "../tokens-json-adapter.ts";
import { isClamp } from "../values/clamp.ts";
import { dartIdent } from "./dart-values.ts";

interface TextRole {
  readonly role: string;
  readonly source: string;
  readonly family: string;
  readonly size: string;
  readonly weight: string;
  readonly leading: string;
  readonly tracking: string;
  readonly colour: string;
}

// biome-ignore format: one prototype rule per line reads as a table.
const TEXT_ROLES: readonly TextRole[] = [
  { role: "displayLarge", source: ".display", family: "font-display", size: "text-display", weight: "font-weight-bold", leading: "leading-display", tracking: "tracking-display", colour: "fg" },
  { role: "headlineLarge", source: "h1", family: "font-display", size: "text-2xl", weight: "font-weight-bold", leading: "leading-heading", tracking: "tracking-heading", colour: "fg" },
  { role: "headlineMedium", source: "h2", family: "font-display", size: "text-xl", weight: "font-weight-semibold", leading: "leading-heading", tracking: "tracking-heading", colour: "fg" },
  { role: "titleLarge", source: "h3", family: "font-display", size: "text-lg", weight: "font-weight-semibold", leading: "leading-heading", tracking: "tracking-heading", colour: "fg" },
  { role: "bodyLarge", source: "body", family: "font-body", size: "text-base", weight: "font-weight-regular", leading: "leading-body", tracking: "tracking-none", colour: "fg" },
  { role: "bodyMedium", source: ".small", family: "font-body", size: "text-sm", weight: "font-weight-regular", leading: "leading-body", tracking: "tracking-none", colour: "fg" },
  { role: "bodySmall", source: ".xsmall", family: "font-body", size: "text-xs", weight: "font-weight-regular", leading: "leading-body", tracking: "tracking-none", colour: "fg" },
  { role: "labelLarge", source: ".btn", family: "font-body", size: "text-15", weight: "font-weight-semibold", leading: "leading-heading", tracking: "tracking-none", colour: "fg" },
  { role: "labelMedium", source: ".chip", family: "font-body", size: "text-xs", weight: "font-weight-semibold", leading: "leading-heading", tracking: "tracking-none", colour: "fg" },
  { role: "labelSmall", source: ".eyebrow (render uppercase)", family: "font-mono", size: "text-11", weight: "font-weight-semibold", leading: "leading-body", tracking: "tracking-eyebrow", colour: "ember-text" },
];

function need(tokens: TokenSet, key: string, category: Category): string {
  if (tokens.categories[key] !== category) {
    throw new ToolError(`ThemeData builder needs ${category} token "${key}"`);
  }
  return dartIdent(key);
}

function textStyle(tokens: TokenSet, cls: string, r: TextRole): string {
  const t = cls;
  const sizeKey = need(tokens, r.size, "font-size");
  const size = isClamp(tokenValue(tokens, "dark", r.size))
    ? `${t}.${sizeKey}(viewportWidth)`
    : `${t}.${sizeKey}`;
  const args = [
    `${t}.${need(tokens, r.family, "font-family")}`,
    size,
    `${t}.${need(tokens, r.weight, "font-weight")}`,
    `${t}.${need(tokens, r.leading, "leading")}`,
    `${t}.${need(tokens, r.tracking, "tracking")}Em`,
    `p.${need(tokens, r.colour, "colour")}`,
  ];
  return `    ${r.role}: _style(${args.join(", ")}), // ${r.source}`;
}

export function dartTheme(
  tokens: TokenSet,
  config: GeneratorConfig,
  header: readonly string[],
): string {
  const P = config.paletteClass;
  const T = config.tokensClass;
  const c = (key: string): string => `p.${need(tokens, key, "colour")}`;
  const n = (key: string, category: Category): string => `${T}.${need(tokens, key, category)}`;
  return [
    ...header.map((line) => `// ${line}`),
    "// ignore_for_file: public_member_api_docs, lines_longer_than_80_chars",
    "",
    "import 'package:flutter/material.dart';",
    "",
    "import 'tokens.g.dart';",
    "",
    "/// Material ThemeData for one Know Meet theme. [viewportWidth] resolves the",
    "/// fluid (CSS clamp) type sizes; rebuild the theme when the width class changes.",
    `ThemeData buildKmTheme(Brightness brightness, {double viewportWidth = ${config.fluidViewports[0] ?? 375}}) {`,
    `  final ${P} p = brightness == Brightness.dark ? ${P}.dark : ${P}.light;`,
    `  final BorderRadius radius = BorderRadius.circular(${n("radius", "radius")});`,
    "  const Color none = Color(0x00000000);",
    "  final OutlineInputBorder noStroke = OutlineInputBorder(borderRadius: radius, borderSide: BorderSide.none);",
    "  final ColorScheme scheme = ColorScheme(",
    "    brightness: brightness,",
    `    primary: ${c("ember-btn")},`,
    `    onPrimary: ${c("on-ember")},`,
    `    secondary: ${c("card")},`,
    `    onSecondary: ${c("fg")},`,
    `    error: ${c("danger-btn")},`,
    `    onError: ${c("on-danger")},`,
    `    surface: ${c("bg")},`,
    `    onSurface: ${c("fg")},`,
    `    onSurfaceVariant: ${c("fg-sub")},`,
    `    surfaceContainerLowest: ${c("bg")},`,
    `    surfaceContainerLow: ${c("bg-2")},`,
    `    surfaceContainer: ${c("surface")},`,
    `    surfaceContainerHigh: ${c("card")},`,
    `    surfaceContainerHighest: ${c("muted")},`,
    "    outline: none,",
    "    outlineVariant: none,",
    "    shadow: none,",
    `    scrim: ${c("scrim")},`,
    `    inverseSurface: ${c("fg")},`,
    `    onInverseSurface: ${c("bg")},`,
    "  );",
    "  final TextTheme text = TextTheme(",
    ...TEXT_ROLES.map((r) => textStyle(tokens, T, r)),
    "  );",
    "  return ThemeData(",
    "    useMaterial3: true,",
    "    brightness: brightness,",
    "    colorScheme: scheme,",
    `    scaffoldBackgroundColor: ${c("bg")},`,
    `    canvasColor: ${c("bg")},`,
    `    focusColor: ${c("focus")},`,
    `    fontFamily: ${n("font-body", "font-family")},`,
    "    textTheme: text,",
    `    extensions: <ThemeExtension<dynamic>>[p],`,
    "    // Flat 2.0: regions separate by fill; no dividers, borders or elevation.",
    "    dividerTheme: const DividerThemeData(color: none, thickness: 0, space: 0),",
    `    cardTheme: CardThemeData(color: ${c("surface")}, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${n("radius-tile", "radius")}))),`,
    "    filledButtonTheme: FilledButtonThemeData(",
    "      style: FilledButton.styleFrom(",
    `        minimumSize: const Size(0, ${n("size-target", "size")}),`,
    `        padding: EdgeInsets.symmetric(horizontal: ${n("s4", "space")}),`,
    "        shape: RoundedRectangleBorder(borderRadius: radius),",
    "        elevation: 0,",
    "        textStyle: text.labelLarge,",
    "      ).copyWith(",
    `        backgroundColor: _states(${c("focus")}, ${c("ember-btn")}, ${c("ember-btn")}),`,
    `        foregroundColor: _states(${c("on-focus")}, ${c("on-ember")}, ${c("on-ember")}),`,
    "        overlayColor: const WidgetStatePropertyAll<Color>(none),",
    "      ),",
    "    ),",
    "    // D-6: the fill is the boundary; focus and error change the fill, never a stroke.",
    "    inputDecorationTheme: InputDecorationThemeData(",
    "      filled: true,",
    "      fillColor: kmControlFill(p),",
    `      hintStyle: text.bodyLarge?.copyWith(color: ${c("control-placeholder")}),`,
    `      contentPadding: const EdgeInsets.symmetric(horizontal: ${n("size-input-pad-x", "size")}, vertical: ${n("size-input-pad-y", "size")}),`,
    "      border: noStroke,",
    "      enabledBorder: noStroke,",
    "      focusedBorder: noStroke,",
    "      errorBorder: noStroke,",
    "      focusedErrorBorder: noStroke,",
    "      disabledBorder: noStroke,",
    "    ),",
    "    switchTheme: SwitchThemeData(",
    `      thumbColor: _states(${c("on-focus")}, ${c("switch-thumb-on")}, ${c("switch-thumb")}),`,
    `      trackColor: _states(${c("focus")}, ${c("ember-btn")}, ${c("switch-track")}),`,
    "      trackOutlineColor: const WidgetStatePropertyAll<Color>(none),",
    "      overlayColor: const WidgetStatePropertyAll<Color>(none),",
    "    ),",
    "    checkboxTheme: CheckboxThemeData(",
    "      side: BorderSide.none,",
    `      fillColor: _states(${c("focus")}, ${c("selected")}, ${c("control")}),`,
    `      checkColor: _states(${c("on-focus")}, ${c("on-selected")}, ${c("on-control")}),`,
    "      overlayColor: const WidgetStatePropertyAll<Color>(none),",
    `      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${n("radius-4", "radius")})),`,
    "    ),",
    "    // Material's Radio strokes its outer ring; the fill-only radio (DESIGN.md) is a",
    "    // kit widget. These colours keep the stock widget on the same roles meanwhile.",
    "    radioTheme: RadioThemeData(",
    `      fillColor: _states(${c("focus")}, ${c("selected")}, ${c("control")}),`,
    "      overlayColor: const WidgetStatePropertyAll<Color>(none),",
    "    ),",
    "    segmentedButtonTheme: SegmentedButtonThemeData(",
    "      style: ButtonStyle(",
    `        backgroundColor: _states(${c("focus")}, ${c("selected")}, ${c("control")}),`,
    `        foregroundColor: _states(${c("on-focus")}, ${c("on-selected")}, ${c("on-control")}),`,
    "        side: const WidgetStatePropertyAll<BorderSide>(BorderSide.none),",
    "        overlayColor: const WidgetStatePropertyAll<Color>(none),",
    "      ),",
    "    ),",
    "    sliderTheme: SliderThemeData(",
    `      trackHeight: ${n("size-slider-track-h", "size")},`,
    `      activeTrackColor: ${c("selected")},`,
    `      inactiveTrackColor: ${c("control")},`,
    `      thumbColor: ${c("slider-thumb")},`,
    "      overlayColor: none,",
    "    ),",
    "    snackBarTheme: SnackBarThemeData(",
    `      backgroundColor: ${c("fg")},`,
    `      contentTextStyle: text.bodyMedium?.copyWith(color: ${c("bg")}, fontWeight: ${n("font-weight-medium", "font-weight")}),`,
    "      shape: RoundedRectangleBorder(borderRadius: radius),",
    "      behavior: SnackBarBehavior.floating,",
    "    ),",
    "  );",
    "}",
    "",
    "/// Resolves a control colour: focused wins, then selected, then rest.",
    "WidgetStateProperty<Color> _states(Color focused, Color selected, Color rest) =>",
    "    WidgetStateProperty.resolveWith((Set<WidgetState> s) =>",
    "        s.contains(WidgetState.focused) ? focused : s.contains(WidgetState.selected) ? selected : rest);",
    "",
    "/// D-6 text-control fill: focus, then error, then hover, then rest (DESIGN.md).",
    `WidgetStateColor kmControlFill(${P} p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {`,
    "      if (s.contains(WidgetState.focused)) return p.focus;",
    "      if (s.contains(WidgetState.error)) return p.controlInvalid;",
    "      if (s.contains(WidgetState.hovered)) return p.controlHov;",
    "      return p.control;",
    "    });",
    "",
    "/// Text colour that pairs with [kmControlFill]; pass to TextField.style through",
    "/// WidgetStateTextStyle.resolveWith so typed text follows the fill.",
    `WidgetStateColor kmControlText(${P} p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {`,
    "      if (s.contains(WidgetState.focused)) return p.onFocus;",
    "      if (s.contains(WidgetState.error)) return p.onControlInvalid;",
    "      return p.onControl;",
    "    });",
    "",
    "/// Placeholder colour that pairs with [kmControlFill] (>= 4.5:1 in every state).",
    `WidgetStateColor kmControlPlaceholder(${P} p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {`,
    "      if (s.contains(WidgetState.focused)) return p.focusPlaceholder;",
    "      if (s.contains(WidgetState.error)) return p.onControlInvalid;",
    "      return p.controlPlaceholder;",
    "    });",
    "",
    "TextStyle _style(String family, double size, FontWeight weight, double height, double trackingEm, Color color) =>",
    "    TextStyle(fontFamily: family, fontSize: size, fontWeight: weight, height: height, letterSpacing: trackingEm * size, color: color);",
    "",
  ].join("\n");
}
