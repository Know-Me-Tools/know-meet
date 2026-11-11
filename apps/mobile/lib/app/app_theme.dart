// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../theme/generated/km_theme.g.dart';
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
    (Brightness brightness, double viewportWidth) => withDisplayFontVariations(
      buildKmTheme(brightness, viewportWidth: viewportWidth),
    );

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
