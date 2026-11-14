// TJ-ARCH-MOB-001 compliant
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/generated/tokens.g.dart';

export '../../theme/generated/tokens.g.dart' show KmPalette, KmTokens;

/// The Know Meet palette carried by [theme] as a ThemeExtension.
///
/// When the extension is absent (only the VS-3 negative control, which swaps
/// in stock `ThemeData.dark()`), the palette is derived from the theme's own
/// ColorScheme instead of falling back to the generated values. That keeps
/// the control honest: a stock theme must render visibly different screens,
/// so its goldens fail.
KmPalette kmPaletteOf(ThemeData theme) =>
    theme.extension<KmPalette>() ?? _fromScheme(theme.colorScheme);

KmPalette _fromScheme(ColorScheme c) {
  return KmPalette(
    bg: c.surface,
    bg2: c.surfaceContainerLow,
    surface: c.surfaceContainer,
    card: c.surfaceContainerHigh,
    cardHov: c.surfaceContainerHighest,
    muted: c.surfaceContainerHighest,
    tile: c.surfaceContainer,
    tile2: c.surfaceContainerHigh,
    fg: c.onSurface,
    fgSub: c.onSurfaceVariant,
    ember: c.primary,
    emberBtn: c.primary,
    emberBtnHov: c.primary,
    onEmber: c.onPrimary,
    emberText: c.primary,
    emberSoft: c.primaryContainer,
    cyan: c.secondary,
    cyanText: c.secondary,
    cyanTextOnTile: c.secondary,
    cyanSoft: c.secondaryContainer,
    green: c.tertiary,
    greenText: c.tertiary,
    greenSoft: c.tertiaryContainer,
    amber: c.tertiary,
    amberText: c.tertiary,
    amberSoft: c.tertiaryContainer,
    red: c.error,
    redText: c.error,
    redSoft: c.errorContainer,
    dangerBtn: c.error,
    dangerBtnHov: c.error,
    onDanger: c.onError,
    control: c.surfaceContainerHighest,
    controlHov: c.surfaceContainerHigh,
    onControl: c.onSurface,
    controlPlaceholder: c.onSurfaceVariant,
    controlInvalid: c.error,
    onControlInvalid: c.onError,
    selected: c.primary,
    onSelected: c.onPrimary,
    focus: c.inverseSurface,
    onFocus: c.onInverseSurface,
    focusPlaceholder: c.onInverseSurface,
    sliderThumb: c.onSurface,
    pipGreen: c.tertiary,
    pipAmber: c.tertiary,
    pipRed: c.error,
    speakPerson: c.primary,
    speakAgent: c.secondary,
    speakPhone: c.tertiary,
    onSpeak: c.onPrimary,
    scrim: c.scrim,
    shadowFloat: const <BoxShadow>[],
    shadowCard: const <BoxShadow>[],
    switchTrack: c.surfaceContainerHighest,
    switchThumb: c.onSurface,
    switchThumbOn: c.onPrimary,
    switchThumbShadow: const <BoxShadow>[],
    mediaBg: c.surfaceContainerLowest,
    onMedia: c.onSurface,
    mediaFootScrim: c.scrim,
    mediaTagBg: c.surfaceContainerHigh,
    mediaTagHost: c.primary,
    mediaQualityPoor: c.error,
  );
}

/// Shorthand for widgets: `context.km.fg`, `context.kmText.bodyMedium`.
extension KmContext on BuildContext {
  KmPalette get km => kmPaletteOf(Theme.of(this));

  TextTheme get kmText => Theme.of(this).textTheme;

  /// True when the platform asks for reduced motion
  /// (`MediaQuery.disableAnimations`); every animation in the app checks it.
  bool get kmReduceMotion => MediaQuery.disableAnimationsOf(this);
}

/// WCAG contrast ratio of [text] over [fill], with [fill] composited on
/// [under] first when translucent.
double kmContrastRatio(Color text, Color fill, Color under) {
  double lum(Color c) {
    double ch(double v) => v <= 0.04045
        ? v / 12.92
        : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  final Color base = fill.a < 1 ? Color.alphaBlend(fill, under) : fill;
  final double a = lum(text), b = lum(base);
  return (math.max(a, b) + 0.05) / (math.min(a, b) + 0.05);
}

extension KmReadable on KmPalette {
  /// [text] when it reads at 4.5:1 (WCAG 1.4.3) on every one of [fills] over
  /// the page background; otherwise the body text colour. Soft tints over
  /// the light page background can fall just short for the coloured text
  /// roles, and the foreground must yield, not the guideline.
  Color readable(Color text, List<Color> fills) {
    for (final Color f in fills) {
      if (kmContrastRatio(text, f, bg) < 4.5) return fg;
    }
    return text;
  }
}
