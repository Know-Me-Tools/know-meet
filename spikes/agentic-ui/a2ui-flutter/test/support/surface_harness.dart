import 'dart:convert';

import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_parity/a2ui/km_catalog.dart';
import 'package:a2ui_parity/a2ui/media_policy.dart';
import 'package:a2ui_parity/a2ui/surface_session.dart';
import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:a2ui_parity/surfaces/surface_loader.dart';
import 'package:a2ui_parity/theme/km_theme.dart';
import 'package:a2ui_parity/ui/surface_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:video_player_platform_interface/video_player_platform_interface.dart';

import 'fake_video_platform.dart';

const HarnessOrigins testOrigins = HarnessOrigins();
final MediaPolicy testMedia = MediaPolicy(
  allowedOrigins: {testOrigins.allowed},
);

/// Phone and tablet logical sizes used by the goldens.
const Size phoneSize = Size(390, 844);
const Size tabletSize = Size(1024, 1366);

final Map<String, GoldenSurface> _surfaces = {};

/// Loads every golden surface. Call from setUpAll: an asset future created
/// inside one testWidgets fake-async zone never completes in the next.
Future<void> preloadSurfaces() async {
  for (final s in await const SurfaceLoader(origins: testOrigins).loadAll()) {
    _surfaces[s.id] = s;
  }
}

/// Every preloaded surface, in harness manifest order.
List<GoldenSurface> allSurfaces() => [
  for (final id in goldenSurfaceIds) _surfaces[id]!,
];

/// A preloaded surface (async signature kept for call-site symmetry).
Future<GoldenSurface> loadSurface(String id) async =>
    _surfaces[id] ?? (throw StateError('call preloadSurfaces() first: $id'));

/// Loads the pinned brand fonts (assets/fonts, copied from apps/mobile) so
/// text renders with real glyphs instead of the test font.
Future<void> loadBrandFonts() async {
  const Map<String, List<String>> families = {
    'Inter': [
      'assets/fonts/inter-regular.ttf',
      'assets/fonts/inter-medium.ttf',
      'assets/fonts/inter-semibold.ttf',
    ],
    'Space Grotesk': ['assets/fonts/space-grotesk-variable.ttf'],
    // Bundled by `uses-material-design: true`.
    'MaterialIcons': ['fonts/MaterialIcons-Regular.otf'],
    'JetBrains Mono': [
      'assets/fonts/jetbrains-mono-medium.ttf',
      'assets/fonts/jetbrains-mono-semibold.ttf',
    ],
  };
  for (final MapEntry<String, List<String>> family in families.entries) {
    final FontLoader loader = FontLoader(family.key);
    for (final String path in family.value) {
      loader.addFont(rootBundle.load(path));
    }
    await loader.load();
  }
}

/// Installs the fake video platform and returns it.
FakeVideoPlatform installFakeVideo() {
  final FakeVideoPlatform fake = FakeVideoPlatform();
  VideoPlayerPlatform.instance = fake;
  return fake;
}

/// Pumps [surface]'s messages into a fresh session, rendered under the Know
/// Meet theme at [size]. Returns the session (disposed on teardown).
Future<SurfaceSession> pumpSurface(
  WidgetTester tester,
  GoldenSurface surface, {
  Brightness brightness = Brightness.light,
  Size size = phoneSize,
  bool useFallbackShim = true,
  bool applyMessages = true,
  CatalogImplementation? catalog,
}) async {
  tester.view
    ..physicalSize = size
    ..devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final SurfaceSession session = SurfaceSession(
    media: testMedia,
    useFallbackShim: useFallbackShim,
    catalog: catalog,
  );
  addTearDown(session.dispose);
  if (applyMessages) session.apply(surface.messages);
  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildKmTheme(brightness, viewportWidth: size.width),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: SurfaceView(session: session),
        ),
      ),
    ),
  );
  await pumpFrames(tester);
  return session;
}

/// Bounded settle: media progress indicators animate forever, so
/// pumpAndSettle would never return.
Future<void> pumpFrames(WidgetTester tester, {int frames = 10}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// The root widget of component [id] (web `[data-a2ui-id=id]`).
Finder a2ui(String id) => find.byKey(a2uiIdKey(id));

Finder a2uiFallback(String id) => find.byKey(a2uiFallbackKey(id));

Finder a2uiBlocked(String id) => find.byKey(a2uiBlockedKey(id));

/// The editable text inside TextField component [id].
Finder a2uiInput(String id) =>
    find.descendant(of: a2ui(id), matching: find.byType(EditableText));

/// JSON deep equality (maps by key, lists by order).
bool jsonEquals(Object? a, Object? b) => jsonEncode(_canon(a)) == jsonEncode(_canon(b));

Object? _canon(Object? v) => switch (v) {
  final Map<Object?, Object?> m => {
    for (final k in (m.keys.map((k) => k.toString()).toList()..sort()))
      k: _canon(m[k]),
  },
  final List<Object?> l => [for (final e in l) _canon(e)],
  _ => v,
};
