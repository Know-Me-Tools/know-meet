// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../theme/generated/km_theme.g.dart';

part 'app_theme.g.dart';

/// Builds the ThemeData for one brightness at one logical viewport width.
typedef KmThemeFactory =
    ThemeData Function(Brightness brightness, double viewportWidth);

/// The generated Know Meet themes (packages/design-tokens). The golden suite
/// overrides this provider for the VS-3 negative control
/// (`KM_GOLDEN_THEME_OVERRIDE=stock-dark`); production never does.
@Riverpod(keepAlive: true)
KmThemeFactory kmThemeFactory(Ref ref) =>
    (Brightness brightness, double viewportWidth) =>
        buildKmTheme(brightness, viewportWidth: viewportWidth);
