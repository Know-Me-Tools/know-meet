// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart' as m;
import 'package:shadcn_flutter/shadcn_flutter.dart' as shad;

import '../shared/ui/km_palette_of.dart';
import '../theme/generated/tokens.g.dart';

/// Derives the shadcn_flutter theme from the Material ThemeData that is in
/// force (the generated Know Meet theme, or the VS-3 stock override). Nothing
/// here holds a colour of its own: every value is read from [material] or its
/// [KmPalette], so the shadcn widgets cannot drift from the token output.
shad.ThemeData kmShadcnTheme(m.ThemeData material) {
  final KmPalette p = kmPaletteOf(material);
  final m.TextTheme t = material.textTheme;
  final shad.ColorScheme scheme = shad.ColorScheme(
    brightness: material.brightness,
    background: p.bg,
    foreground: p.fg,
    card: p.surface,
    cardForeground: p.fg,
    popover: p.bg2,
    popoverForeground: p.fg,
    primary: p.emberBtn,
    primaryForeground: p.onEmber,
    secondary: p.card,
    secondaryForeground: p.fg,
    muted: p.muted,
    mutedForeground: p.fgSub,
    accent: p.cardHov,
    accentForeground: p.fg,
    destructive: p.dangerBtn,
    destructiveForeground: p.onDanger,
    border: p.muted,
    input: p.ringInput,
    ring: p.ember,
    chart1: p.ember,
    chart2: p.cyan,
    chart3: p.green,
    chart4: p.amber,
    chart5: p.red,
  );
  final m.TextStyle body = t.bodyLarge ?? const m.TextStyle();
  return shad.ThemeData(
    colorScheme: scheme,
    // shadcn's radiusMd is `radius * 12`, so this factor makes radiusMd the
    // token radius (12px) and scales sm/lg/xl from it.
    radius: KmTokens.radius / 12,
    typography: shad.Typography.geist(
      sans: body,
      mono: body.copyWith(fontFamily: KmTokens.fontMono),
    ),
  );
}
