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
  final OutlineInputBorder noStroke = OutlineInputBorder(borderRadius: radius, borderSide: BorderSide.none);
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
    outline: none,
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
    focusColor: p.focus,
    fontFamily: KmTokens.fontBody,
    textTheme: text,
    extensions: <ThemeExtension<dynamic>>[p],
    // Flat 2.0: regions separate by fill; no dividers, borders or elevation.
    dividerTheme: const DividerThemeData(color: none, thickness: 0, space: 0),
    cardTheme: CardThemeData(color: p.surface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KmTokens.radiusTile))),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, KmTokens.sizeTarget),
        padding: EdgeInsets.symmetric(horizontal: KmTokens.s4),
        shape: RoundedRectangleBorder(borderRadius: radius),
        elevation: 0,
        textStyle: text.labelLarge,
      ).copyWith(
        backgroundColor: _states(p.focus, p.emberBtn, p.emberBtn),
        foregroundColor: _states(p.onFocus, p.onEmber, p.onEmber),
        overlayColor: const WidgetStatePropertyAll<Color>(none),
      ),
    ),
    // D-6: the fill is the boundary; focus and error change the fill, never a stroke.
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: kmControlFill(p),
      hintStyle: text.bodyLarge?.copyWith(color: p.controlPlaceholder),
      contentPadding: const EdgeInsets.symmetric(horizontal: KmTokens.sizeInputPadX, vertical: KmTokens.sizeInputPadY),
      border: noStroke,
      enabledBorder: noStroke,
      focusedBorder: noStroke,
      errorBorder: noStroke,
      focusedErrorBorder: noStroke,
      disabledBorder: noStroke,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: _states(p.onFocus, p.switchThumbOn, p.switchThumb),
      trackColor: _states(p.focus, p.emberBtn, p.switchTrack),
      trackOutlineColor: const WidgetStatePropertyAll<Color>(none),
      overlayColor: const WidgetStatePropertyAll<Color>(none),
    ),
    checkboxTheme: CheckboxThemeData(
      side: BorderSide.none,
      fillColor: _states(p.focus, p.selected, p.control),
      checkColor: _states(p.onFocus, p.onSelected, p.onControl),
      overlayColor: const WidgetStatePropertyAll<Color>(none),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KmTokens.radius4)),
    ),
    // Material's Radio strokes its outer ring; the fill-only radio (DESIGN.md) is a
    // kit widget. These colours keep the stock widget on the same roles meanwhile.
    radioTheme: RadioThemeData(
      fillColor: _states(p.focus, p.selected, p.control),
      overlayColor: const WidgetStatePropertyAll<Color>(none),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: _states(p.focus, p.selected, p.control),
        foregroundColor: _states(p.onFocus, p.onSelected, p.onControl),
        side: const WidgetStatePropertyAll<BorderSide>(BorderSide.none),
        overlayColor: const WidgetStatePropertyAll<Color>(none),
      ),
    ),
    sliderTheme: SliderThemeData(
      trackHeight: KmTokens.sizeSliderTrackH,
      activeTrackColor: p.selected,
      inactiveTrackColor: p.control,
      thumbColor: p.sliderThumb,
      overlayColor: none,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: p.fg,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.bg, fontWeight: KmTokens.fontWeightMedium),
      shape: RoundedRectangleBorder(borderRadius: radius),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

/// Resolves a control colour: focused wins, then selected, then rest.
WidgetStateProperty<Color> _states(Color focused, Color selected, Color rest) =>
    WidgetStateProperty.resolveWith((Set<WidgetState> s) =>
        s.contains(WidgetState.focused) ? focused : s.contains(WidgetState.selected) ? selected : rest);

/// D-6 text-control fill: focus, then error, then hover, then rest (DESIGN.md).
WidgetStateColor kmControlFill(KmPalette p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.focus;
      if (s.contains(WidgetState.error)) return p.controlInvalid;
      if (s.contains(WidgetState.hovered)) return p.controlHov;
      return p.control;
    });

/// Text colour that pairs with [kmControlFill]; pass to TextField.style through
/// WidgetStateTextStyle.resolveWith so typed text follows the fill.
WidgetStateColor kmControlText(KmPalette p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.onFocus;
      if (s.contains(WidgetState.error)) return p.onControlInvalid;
      return p.onControl;
    });

/// Placeholder colour that pairs with [kmControlFill] (>= 4.5:1 in every state).
WidgetStateColor kmControlPlaceholder(KmPalette p) => WidgetStateColor.resolveWith((Set<WidgetState> s) {
      if (s.contains(WidgetState.focused)) return p.focusPlaceholder;
      if (s.contains(WidgetState.error)) return p.onControlInvalid;
      return p.controlPlaceholder;
    });

TextStyle _style(String family, double size, FontWeight weight, double height, double trackingEm, Color color) =>
    TextStyle(fontFamily: family, fontSize: size, fontWeight: weight, height: height, letterSpacing: trackingEm * size, color: color);
