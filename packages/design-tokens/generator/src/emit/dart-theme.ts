// km_theme.g.dart: a light/dark ThemeData builder. The vendor emitted only
// constants and GoogleFonts text styles; this maps the prototype's rules
// (km.css body, h1-h3, .display, .eyebrow, .btn, .input, .card, .switch, .toast)
// onto Material, with Flat 2.0 defaults: no elevation, no dividers, no borders
// except the D-5 input ring.

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
    `    outline: ${c("ring-input")},`,
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
    `    fontFamily: ${n("font-body", "font-family")},`,
    "    textTheme: text,",
    `    extensions: <ThemeExtension<dynamic>>[p],`,
    "    // Flat 2.0: regions separate by fill; no dividers, borders or elevation.",
    "    dividerTheme: const DividerThemeData(color: none, thickness: 0, space: 0),",
    `    cardTheme: CardThemeData(color: ${c("surface")}, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${n("radius-tile", "radius")}))),`,
    "    filledButtonTheme: FilledButtonThemeData(",
    "      style: FilledButton.styleFrom(",
    `        backgroundColor: ${c("ember-btn")},`,
    `        foregroundColor: ${c("on-ember")},`,
    "        minimumSize: const Size(0, 44),",
    `        padding: EdgeInsets.symmetric(horizontal: ${n("s4", "space")}),`,
    "        shape: RoundedRectangleBorder(borderRadius: radius),",
    "        elevation: 0,",
    "        textStyle: text.labelLarge,",
    "      ),",
    "    ),",
    "    // D-5: the input ring is the one permitted line (input-only Flat 2.0 exception).",
    "    inputDecorationTheme: InputDecorationThemeData(",
    "      filled: true,",
    `      fillColor: ${c("card")},`,
    `      hintStyle: text.bodyLarge?.copyWith(color: ${c("fg-sub")}.withValues(alpha: 0.85)),`,
    "      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),",
    `      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: ${c("ring-input")})),`,
    `      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: ${c("ember")}, width: 2)),`,
    `      errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: ${c("red")}, width: 2)),`,
    `      focusedErrorBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: ${c("red")}, width: 2)),`,
    "    ),",
    "    switchTheme: SwitchThemeData(",
    "      thumbColor: WidgetStateProperty.resolveWith((Set<WidgetState> s) =>",
    `          s.contains(WidgetState.selected) ? ${c("switch-thumb-on")} : ${c("switch-thumb")}),`,
    "      trackColor: WidgetStateProperty.resolveWith((Set<WidgetState> s) =>",
    `          s.contains(WidgetState.selected) ? ${c("ember-btn")} : ${c("switch-track")}),`,
    "      trackOutlineColor: const WidgetStatePropertyAll<Color>(none),",
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
    "TextStyle _style(String family, double size, FontWeight weight, double height, double trackingEm, Color color) =>",
    "    TextStyle(fontFamily: family, fontSize: size, fontWeight: weight, height: height, letterSpacing: trackingEm * size, color: color);",
    "",
  ].join("\n");
}
