// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sovereign_hybrid_mobile/app/app_theme.dart';

/// `--dart-define=KM_GOLDEN_THEME_OVERRIDE=<value>` for the golden suite
/// (tests/fidelity/oracle/flutter-golden-provenance.json, VS-3).
const String kmGoldenThemeOverride = String.fromEnvironment(
  'KM_GOLDEN_THEME_OVERRIDE',
);

/// The only accepted override: stock `ThemeData.dark()` for every brightness.
/// Run with it, the goldens must FAIL (VS-3 negative control).
const String kmGoldenStockDark = 'stock-dark';

/// Provider overrides every golden test passes to its ProviderScope.
///
/// Empty define: no override, the generated Know Meet themes render.
/// `stock-dark`: [kmThemeFactoryProvider] returns `ThemeData.dark()`.
/// Any other value throws, so a mistyped define cannot quietly render the
/// generated themes and let the negative control pass the goldens.
List<Override> goldenThemeOverrides({String value = kmGoldenThemeOverride}) {
  if (value.isEmpty) return <Override>[];
  if (value == kmGoldenStockDark) {
    return <Override>[
      kmThemeFactoryProvider.overrideWithValue(
        (Brightness brightness, double viewportWidth) => ThemeData.dark(),
      ),
    ];
  }
  throw ArgumentError.value(
    value,
    'KM_GOLDEN_THEME_OVERRIDE',
    'unknown value; the only override is "$kmGoldenStockDark"',
  );
}
