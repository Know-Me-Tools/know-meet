// Goldens per surface at phone and tablet sizes, light and dark, with the
// pinned brand fonts and the design-token ThemeData. Pixels are host-specific
// (macOS arm64, Flutter 3.47.5); regenerate deliberately with
// `flutter test --tags golden --update-goldens`.
@Tags(['golden'])
library;

import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  const sizes = {'phone': phoneSize, 'tablet': tabletSize};
  for (final String id in goldenSurfaceIds) {
    if (id == 'incremental-update-delete') continue; // ends deleted: blank
    for (final size in sizes.entries) {
      for (final brightness in Brightness.values) {
        final name = '${id}_${size.key}_${brightness.name}';
        testWidgets('golden $name', (tester) async {
          final surface = await loadSurface(id);
          await pumpSurface(
            tester,
            surface,
            brightness: brightness,
            size: size.value,
          );
          await expectLater(
            find.byType(MaterialApp),
            matchesGoldenFile('goldens/$name.png'),
          );
        });
      }
    }
  }
}
