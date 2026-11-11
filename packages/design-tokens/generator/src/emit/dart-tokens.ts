// tokens.g.dart. Replaces the vendor's `abstract final class T` with
// `...OnLight` constants: theme-dependent colours and shadows become a
// ThemeExtension palette with a const instance per theme (same names, different
// values, so widgets never branch on theme); everything else is a constant.

import { THEMED } from "../classify.ts";
import type { GeneratorConfig } from "../config.ts";
import { type TokenSet, tokenValue } from "../tokens-json-adapter.ts";
import { isClamp, parseClamp, resolveFluid } from "../values/clamp.ts";
import { tryEm, tryNumber, tryPercent, tryPx } from "../values/css-values.ts";
import {
  dartAlignment,
  dartColor,
  dartCurve,
  dartDuration,
  dartIdent,
  dartNum,
  dartShadows,
  dartString,
} from "./dart-values.ts";

function themedKeys(tokens: TokenSet): string[] {
  return tokens.keys.filter((key) => THEMED.has(tokens.categories[key] ?? "colour"));
}

function paletteValue(tokens: TokenSet, theme: "dark" | "light", key: string): string {
  const value = tokenValue(tokens, theme, key);
  const where = `themes.${theme}.${key}`;
  return tokens.categories[key] === "shadow" ? dartShadows(value, where) : dartColor(value, where);
}

function palette(tokens: TokenSet, cls: string): string[] {
  const keys = themedKeys(tokens);
  const type = (key: string): string =>
    tokens.categories[key] === "shadow" ? "List<BoxShadow>" : "Color";
  const lerp = (key: string): string => {
    const id = dartIdent(key);
    return tokens.categories[key] === "shadow"
      ? `      ${id}: BoxShadow.lerpList(${id}, other.${id}, t) ?? const <BoxShadow>[],`
      : `      ${id}: Color.lerp(${id}, other.${id}, t) ?? ${id},`;
  };
  const instance = (theme: "dark" | "light"): string[] => [
    `  static const ${cls} ${theme} = ${cls}(`,
    ...keys.map((key) => `    ${dartIdent(key)}: ${paletteValue(tokens, theme, key)},`),
    "  );",
  ];
  return [
    "/// Theme-dependent colours and shadows. Read with",
    `/// \`Theme.of(context).extension<${cls}>()!\`. Names are the prototype's CSS`,
    "/// custom property names in lowerCamelCase.",
    "@immutable",
    `final class ${cls} extends ThemeExtension<${cls}> {`,
    `  const ${cls}({`,
    ...keys.map((key) => `    required this.${dartIdent(key)},`),
    "  });",
    "",
    ...instance("dark"),
    "",
    ...instance("light"),
    "",
    ...keys.map((key) => `  final ${type(key)} ${dartIdent(key)};`),
    "",
    "  @override",
    `  ${cls} copyWith({`,
    ...keys.map((key) => `    ${type(key)}? ${dartIdent(key)},`),
    "  }) {",
    `    return ${cls}(`,
    ...keys.map((key) => `      ${dartIdent(key)}: ${dartIdent(key)} ?? this.${dartIdent(key)},`),
    "    );",
    "  }",
    "",
    "  @override",
    `  ${cls} lerp(covariant ThemeExtension<${cls}>? other, double t) {`,
    `    if (other is! ${cls}) return this;`,
    `    return ${cls}(`,
    ...keys.map(lerp),
    "    );",
    "  }",
    "}",
  ];
}

function fontFamily(value: string): string {
  return /^'([^']+)'/.exec(value)?.[1] ?? value;
}

function fluidLines(
  id: string,
  value: string,
  where: string,
  viewports: readonly number[],
): string[] {
  const f = parseClamp(value, where);
  return [
    `  /// ${value}`,
    `  static double ${id}(double viewportWidth) =>`,
    `      _fluid(viewportWidth, ${dartNum(f.min)}, ${dartNum(f.vw)}, ${dartNum(f.px)}, ${dartNum(f.max)});`,
    ...viewports.map((w) => `  static const double ${id}At${w} = ${dartNum(resolveFluid(f, w))};`),
  ];
}

function invariantLines(key: string, tokens: TokenSet, viewports: readonly number[]): string[] {
  const value = tokenValue(tokens, "dark", key);
  const id = dartIdent(key);
  const where = `themes.dark.${key}`;
  const px = tryPx(value);
  switch (tokens.categories[key]) {
    case "font-family":
      return [`  static const String ${id} = ${dartString(fontFamily(value))};`];
    case "font-weight":
      return [`  static const FontWeight ${id} = FontWeight.w${value};`];
    case "font-size":
      if (isClamp(value)) return fluidLines(id, value, where, viewports);
      if (px !== null) return [`  static const double ${id} = ${dartNum(px)};`];
      return [
        `  /// Relative to the parent font size (${value}).`,
        `  static const double ${id}Em = ${dartNum(tryEm(value) ?? 1)};`,
      ];
    case "leading":
      if (px !== null)
        return [
          `  /// Absolute line box (${value}); TextStyle.height = ${id} / fontSize.`,
          `  static const double ${id} = ${dartNum(px)};`,
        ];
      return [`  static const double ${id} = ${dartNum(tryNumber(value) ?? 1)};`];
    case "tracking":
      return [
        `  /// letterSpacing = ${id}Em * fontSize.`,
        `  static const double ${id}Em = ${dartNum(tryEm(value) ?? 0)};`,
      ];
    case "radius":
      if (px !== null) return [`  static const double ${id} = ${dartNum(px)};`];
      return [
        `  /// ${value}: use CircleBorder or StadiumBorder.`,
        `  static const double ${id}Fraction = ${dartNum((tryPercent(value) ?? 0) / 100)};`,
      ];
    case "space":
    case "layout":
      return [`  static const double ${id} = ${dartNum(px ?? 0)};`];
    case "breakpoint":
      return [
        `  /// Prototype @media (max-width: ${value}).`,
        `  static const double ${id} = ${dartNum(px ?? 0)};`,
      ];
    case "z-index":
      return [`  static const int ${id} = ${value};`];
    case "duration":
      return [`  static const Duration ${id} = ${dartDuration(value, where)};`];
    case "easing":
      return [`  static const Curve ${id} = ${dartCurve(value, where)};`];
    case "gradient":
      if (value.trim().includes(" "))
        return [`  static const Alignment ${id} = ${dartAlignment(value, where)};`];
      return [`  static const double ${id} = ${dartNum((tryPercent(value) ?? 0) / 100)};`];
    default:
      return [];
  }
}

export function dartTokens(
  tokens: TokenSet,
  config: GeneratorConfig,
  header: readonly string[],
): string {
  const invariant = tokens.keys.filter((key) => !THEMED.has(tokens.categories[key] ?? "colour"));
  return [
    ...header.map((line) => `// ${line}`),
    "// ignore_for_file: public_member_api_docs, lines_longer_than_80_chars",
    "",
    "import 'package:flutter/material.dart';",
    "",
    ...palette(tokens, config.paletteClass),
    "",
    "/// Theme-invariant tokens: type, space, radius, layout, motion.",
    "/// Breakpoints are the prototype's max-width queries; z-index values document",
    "/// paint order (Flutter uses Stack and Overlay order instead).",
    `abstract final class ${config.tokensClass} {`,
    ...invariant.flatMap((key) => invariantLines(key, tokens, config.fluidViewports)),
    "",
    "  static double _fluid(double width, double min, double vw, double px, double max) =>",
    "      (width * vw / 100 + px).clamp(min, max).toDouble();",
    "}",
    "",
  ].join("\n");
}
