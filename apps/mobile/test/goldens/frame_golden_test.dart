// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter/services.dart';
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
  kmGolden('frame.nav-collapsed', fullPage: false);
  kmGolden('frame.nav-open', overlay: KmFrameOverlay.nav, fullPage: false);
  kmGolden(
    'frame.skip-link-focused',
    fullPage: false,
    interact: (WidgetTester tester) =>
        tester.sendKeyEvent(LogicalKeyboardKey.tab),
  );
  // Sun icon in dark, moon icon in light: the two themes are the two states.
  kmGolden('frame.theme-toggle', fullPage: false);
}
