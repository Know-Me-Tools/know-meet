// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../theme/generated/km_theme.g.dart';
import '../theme/generated/tokens.g.dart';
import '../shared/ui/km_font_axis.dart';

part 'app_theme.g.dart';

/// Builds the ThemeData for one brightness at one logical viewport width.
typedef KmThemeFactory =
    ThemeData Function(Brightness brightness, double viewportWidth);

/// The generated Know Meet themes (packages/design-tokens). The golden suite
/// overrides this provider for the VS-3 negative control
/// (`KM_GOLDEN_THEME_OVERRIDE=stock-dark`); production never does.
@Riverpod(keepAlive: true)
KmThemeFactory kmThemeFactory(Ref ref) =>
    (Brightness brightness, double viewportWidth) => withKmInteraction(
      withDisplayFontVariations(buildKmTheme(brightness, viewportWidth: viewportWidth)),
      viewportWidth: viewportWidth,
    );

/// App-level interaction rules the generated theme does not carry
/// (DESIGN.md, Flat 2.0): no ink ripples or translucent focus/hover
/// overlays anywhere (the kit swaps fills instead), and tooltips in the
/// toast style (operator 2026-11-11). Toasts are `size-toast-w` wide, never
/// wider than the window less 32 (DESIGN.md "Sizes").
ThemeData withKmInteraction(ThemeData theme, {double viewportWidth = 375}) {
  final KmPalette? p = theme.extension<KmPalette>();
  if (p == null) return theme;
  final double toastW = viewportWidth - 2 * KmTokens.s4 < KmTokens.sizeToastW
      ? viewportWidth - 2 * KmTokens.s4
      : KmTokens.sizeToastW;
  return theme.copyWith(
    snackBarTheme: theme.snackBarTheme.copyWith(width: toastW),
    splashFactory: NoSplash.splashFactory,
    splashColor: const Color(0x00000000),
    highlightColor: const Color(0x00000000),
    hoverColor: const Color(0x00000000),
    tooltipTheme: TooltipThemeData(
      waitDuration: const Duration(milliseconds: 500),
      constraints: const BoxConstraints(maxWidth: KmTokens.sizeTooltipMaxW),
      padding: const EdgeInsets.symmetric(
        horizontal: KmTokens.sizeTooltipPadX,
        vertical: KmTokens.sizeTooltipPadY,
      ),
      decoration: BoxDecoration(
        color: p.fg,
        borderRadius: BorderRadius.circular(KmTokens.radius),
        boxShadow: p.shadowFloat,
      ),
      textStyle: theme.textTheme.bodyMedium?.copyWith(
        color: p.bg,
        fontWeight: KmTokens.fontWeightMedium,
      ),
    ),
  );
}

/// Space Grotesk ships as one variable file (wght 300-700, pubspec.yaml).
/// Flutter does not map `fontWeight` onto the `wght` axis of a variable font,
/// so without an explicit [FontVariation] every display weight would render
/// at the file's default instance (decision-log carry-over from c07). This
/// adds the matching `wght` variation to every display-family text style.
ThemeData withDisplayFontVariations(ThemeData theme) {
  TextStyle? fix(TextStyle? style) => style == null ? null : kmDisplayAxis(style);
  final TextTheme t = theme.textTheme;
  return theme.copyWith(
    textTheme: t.copyWith(
      displayLarge: fix(t.displayLarge),
      displayMedium: fix(t.displayMedium),
      displaySmall: fix(t.displaySmall),
      headlineLarge: fix(t.headlineLarge),
      headlineMedium: fix(t.headlineMedium),
      headlineSmall: fix(t.headlineSmall),
      titleLarge: fix(t.titleLarge),
      titleMedium: fix(t.titleMedium),
      titleSmall: fix(t.titleSmall),
    ),
  );
}
