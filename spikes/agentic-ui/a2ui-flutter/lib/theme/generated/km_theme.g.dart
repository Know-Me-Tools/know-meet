// GENERATED FROM docs/design/tokens.json by @know-meet/design-tokens. DO NOT EDIT.
// Edit the token source and run: pnpm --filter @know-meet/design-tokens generate
// ignore_for_file: public_member_api_docs, lines_longer_than_80_chars

import 'package:flutter/material.dart';

import 'tokens.g.dart';

/// Material ThemeData for one Know Meet theme. [viewportWidth] resolves the
/// fluid (CSS clamp) type sizes; rebuild the theme when the width class changes.
ThemeData buildKmTheme(Brightness brightness, {double viewportWidth = 375}) {
  final KmPalette p = brightness == Brightness.dark ? KmPalette.dark : KmPalette.light;
  final BorderRadius radius = BorderRadius.circular(KmTokens.radius);
  const Color none = Color(0x00000000);
  final ColorScheme scheme = ColorScheme(
    brightness: brightness,
    primary: p.emberBtn,
    onPrimary: p.onEmber,
    secondary: p.card,
    onSecondary: p.fg,
    error: p.dangerBtn,
    onError: p.onDanger,
    surface: p.bg,
    onSurface: p.fg,
    onSurfaceVariant: p.fgSub,
    surfaceContainerLowest: p.bg,
    surfaceContainerLow: p.bg2,
    surfaceContainer: p.surface,
    surfaceContainerHigh: p.card,
    surfaceContainerHighest: p.muted,
    outline: p.ringInput,
    outlineVariant: none,
    shadow: none,
    scrim: p.scrim,
    inverseSurface: p.fg,
    onInverseSurface: p.bg,
  );
  final TextTheme text = TextTheme(
    displayLarge: _style(KmTokens.fontDisplay, KmTokens.textDisplay(viewportWidth), KmTokens.fontWeightBold, KmTokens.leadingDisplay, KmTokens.trackingDisplayEm, p.fg), // .display
    headlineLarge: _style(KmTokens.fontDisplay, KmTokens.text2xl(viewportWidth), KmTokens.fontWeightBold, KmTokens.leadingHeading, KmTokens.trackingHeadingEm, p.fg), // h1
    headlineMedium: _style(KmTokens.fontDisplay, KmTokens.textXl, KmTokens.fontWeightSemibold, KmTokens.leadingHeading, KmTokens.trackingHeadingEm, p.fg), // h2
    titleLarge: _style(KmTokens.fontDisplay, KmTokens.textLg, KmTokens.fontWeightSemibold, KmTokens.leadingHeading, KmTokens.trackingHeadingEm, p.fg), // h3
    bodyLarge: _style(KmTokens.fontBody, KmTokens.textBase, KmTokens.fontWeightRegular, KmTokens.leadingBody, KmTokens.trackingNoneEm, p.fg), // body
    bodyMedium: _style(KmTokens.fontBody, KmTokens.textSm, KmTokens.fontWeightRegular, KmTokens.leadingBody, KmTokens.trackingNoneEm, p.fg), // .small
    bodySmall: _style(KmTokens.fontBody, KmTokens.textXs, KmTokens.fontWeightRegular, KmTokens.leadingBody, KmTokens.trackingNoneEm, p.fg), // .xsmall
    labelLarge: _style(KmTokens.fontBody, KmTokens.text15, KmTokens.fontWeightSemibold, KmTokens.leadingHeading, KmTokens.trackingNoneEm, p.fg), // .btn
    labelMedium: _style(KmTokens.fontBody, KmTokens.textXs, KmTokens.fontWeightSemibold, KmTokens.leadingHeading, KmTokens.trackingNoneEm, p.fg), // .chip
    labelSmall: _style(KmTokens.fontMono, KmTokens.text11, KmTokens.fontWeightSemibold, KmTokens.leadingBody, KmTokens.trackingEyebrowEm, p.emberText), // .eyebrow (render uppercase)
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: p.bg,
    canvasColor: p.bg,
    fontFamily: KmTokens.fontBody,
    textTheme: text,
    extensions: <ThemeExtension<dynamic>>[p],
    // Flat 2.0: regions separate by fill; no dividers, borders or elevation.
    dividerTheme: const DividerThemeData(color: none, thickness: 0, space: 0),
    cardTheme: CardThemeData(color: p.surface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KmTokens.radiusTile))),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: p.emberBtn,
        foregroundColor: p.onEmber,
        minimumSize: const Size(0, 44),
        padding: EdgeInsets.symmetric(horizontal: KmTokens.s4),
        shape: RoundedRectangleBorder(borderRadius: radius),
        elevation: 0,
        textStyle: text.labelLarge,
      ),
    ),
    // D-5: the input ring is the one permitted line (input-only Flat 2.0 exception).
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: p.card,
      hintStyle: text.bodyLarge?.copyWith(color: p.fgSub.withValues(alpha: 0.85)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: p.ringInput)),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: p.ember, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: p.red, width: 2)),
      focusedErrorBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: p.red, width: 2)),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((Set<WidgetState> s) =>
          s.contains(WidgetState.selected) ? p.switchThumbOn : p.switchThumb),
      trackColor: WidgetStateProperty.resolveWith((Set<WidgetState> s) =>
          s.contains(WidgetState.selected) ? p.emberBtn : p.switchTrack),
      trackOutlineColor: const WidgetStatePropertyAll<Color>(none),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: p.fg,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.bg, fontWeight: KmTokens.fontWeightMedium),
      shape: RoundedRectangleBorder(borderRadius: radius),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

TextStyle _style(String family, double size, FontWeight weight, double height, double trackingEm, Color color) =>
    TextStyle(fontFamily: family, fontSize: size, fontWeight: weight, height: height, letterSpacing: trackingEm * size, color: color);
