// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_frame.dart';

import '../support/km_golden.dart';

/// VS-3 goldens for the app frame states (`frame.*`). The prototype frame
/// baselines are viewport captures, so these are not full-page.
void main() {
  kmGolden('frame.appbar-signed-out', fullPage: false);
  kmGolden('frame.appbar-signed-in', signedIn: true, fullPage: false);
  kmGolden(
    'frame.account-menu-open',
    signedIn: true,
    overlay: KmFrameOverlay.accountMenu,
    fullPage: false,
  );
  // frame.nav-collapsed and frame.nav-open are retired (ADJ-2; listed in
  // coverage_test.dart). Their replacements, one per width class, on an app
  // page with a current destination (DESIGN.md "Adaptive layout"):
  kmGolden('frame.nav-bar', signedIn: true, fullPage: false, widths: const <double>[375]);
  kmGolden('frame.nav-rail', signedIn: true, fullPage: false, widths: const <double>[768]);
  kmGolden('frame.nav-links', signedIn: true, fullPage: false, widths: const <double>[1024]);
  // Keyboard focus on the current bar item: the D-6 focus fill.
  kmGolden(
    'frame.nav-bar-focused',
    signedIn: true,
    fullPage: false,
    widths: const <double>[375],
    interact: (WidgetTester tester) async {
      for (int i = 0; i < 60; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        final BuildContext? c = FocusManager.instance.primaryFocus?.context;
        bool hit = false;
        c?.visitAncestorElements((Element e) {
          hit = e.widget.key == const ValueKey<String>('km-nav-/dashboard');
          return !hit;
        });
        if (hit) return;
      }
    },
  );
  kmGolden(
    'frame.skip-link-focused',
    fullPage: false,
    interact: (WidgetTester tester) =>
        tester.sendKeyEvent(LogicalKeyboardKey.tab),
  );
  // Sun icon in dark, moon icon in light: the two themes are the two states.
  kmGolden('frame.theme-toggle', fullPage: false);
}
