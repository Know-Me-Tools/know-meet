// TJ-ARCH-MOB-001 compliant
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/app_router.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_frame.dart';
import 'package:sovereign_hybrid_mobile/app/know_meet_app.dart';
import 'package:sovereign_hybrid_mobile/app/state_locations.dart';
import 'package:sovereign_hybrid_mobile/shared/theme_mode/theme_mode.dart';
import 'package:sovereign_hybrid_mobile/shared/clock/km_clock.dart';
import 'package:sovereign_hybrid_mobile/shared/session/session.dart';

import 'golden_theme_override.dart';

/// The frozen capture instant of the prototype baselines
/// (tests/fidelity/src/support/capture-environment.ts `frozenClockIso`).
final DateTime kmFrozenNow = DateTime.utc(2026, 11, 10, 15);

/// Riverpod 3's `ProviderScope` keeps exactly one transient frame callback
/// registered after every build, so `WidgetTester.hasRunningAnimations` is
/// always true under it. Any real animation (a ticker) adds a second callback.
const int kmScopeTransientCallbacks = 1;

/// True when an animation, not just the provider scope, is still running.
bool kmHasRunningAnimations(WidgetTester tester) =>
    tester.binding.transientCallbackCount > kmScopeTransientCallbacks;

/// Themes in the capture matrix.
enum KmTestTheme { dark, light }

/// Viewport heights paired with the adopted widths (capture environment).
final Map<double, double> kmViewportHeights = <double, double>{
  375: 812,
  768: 1024,
  1024: 768,
  1440: 900,
};

/// Fixed theme choice for tests; never persists.
final class KmFixedThemeStore implements ThemePreferenceStore {
  KmFixedThemeStore(this._preference);

  ThemePreference _preference;

  @override
  ThemePreference read() => _preference;

  @override
  Future<void> write(ThemePreference preference) async => _preference = preference;
}

class _SignedIn extends SessionController {
  @override
  KmUser? build() => SessionController.sampleUser;
}

class _SignedOut extends SessionController {
  @override
  KmUser? build() => null;
}

bool _fontsLoaded = false;

/// Loads every family in the app's FontManifest (Space Grotesk, Inter,
/// JetBrains Mono, Material and shadcn Lucide icons) so goldens never render
/// with the test font. Once per test isolate.
Future<void> loadKmFonts() async {
  if (_fontsLoaded) return;
  final String manifest = await rootBundle.loadString('FontManifest.json');
  final List<dynamic> families = _decode(manifest);
  for (final dynamic family in families) {
    final Map<String, dynamic> f = family as Map<String, dynamic>;
    final FontLoader loader = FontLoader(f['family'] as String);
    for (final dynamic font in f['fonts'] as List<dynamic>) {
      final String asset = (font as Map<String, dynamic>)['asset'] as String;
      loader.addFont(rootBundle.load(asset));
    }
    await loader.load();
  }
  _fontsLoaded = true;
}

List<dynamic> _decode(String json) => jsonDecode(json) as List<dynamic>;

/// Sets the test surface to [width] x the paired height at DPR 1, and the
/// accessibility features (reduced motion on by default: the baselines are
/// captured with animations disabled). Resets on tear-down.
void setKmViewport(
  WidgetTester tester, {
  required double width,
  double? height,
  bool disableAnimations = true,
}) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, height ?? kmViewportHeights[width] ?? 812);
  tester.platformDispatcher.accessibilityFeaturesTestValue =
      FakeAccessibilityFeatures(disableAnimations: disableAnimations);
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
}

/// Pumps the real [KnowMeetApp] at the location of [stateId] with the
/// production providers, except: the theme choice, the frozen clock, the
/// session, the initial frame popover, and the VS-3 theme seam.
Future<void> pumpKmApp(
  WidgetTester tester, {
  required String stateId,
  KmTestTheme theme = KmTestTheme.dark,
  bool signedIn = false,
  KmFrameOverlay overlay = KmFrameOverlay.none,
  List<Override> extraOverrides = const <Override>[],
}) async {
  await loadKmFonts();
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        themePreferenceStoreProvider.overrideWithValue(
          KmFixedThemeStore(
            theme == KmTestTheme.dark ? ThemePreference.dark : ThemePreference.light,
          ),
        ),
        kmClockProvider.overrideWithValue(() => kmFrozenNow),
        kmInitialLocationProvider.overrideWithValue(kmLocationForState(stateId)),
        kmInitialFrameOverlayProvider.overrideWithValue(overlay),
        sessionControllerProvider.overrideWith(
          () => signedIn ? _SignedIn() : _SignedOut(),
        ),
        ...goldenThemeOverrides(),
        ...extraOverrides,
      ],
      child: const KnowMeetApp(),
    ),
  );
  await tester.pumpAndSettle();
}

/// Whether the focused element is [key]'s widget or inside it.
bool focusIsWithin(Key key) {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) return false;
  if (context.widget.key == key) return true;
  bool found = false;
  context.visitAncestorElements((Element e) {
    if (e.widget.key == key) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}
