// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_frame.dart';

import 'km_test_app.dart';

/// WCAG 2.2 AA 2.5.8 (Target Size, Minimum): 24x24 CSS px. The prototype's
/// primary controls are 44px (`.btn`, `.icon-btn`), its small buttons 36px
/// and crumbs 24px, so 44px is a recommendation the a11y-gate skill states,
/// not the AA gate.
const MinimumTapTargetGuideline wcagTargetSizeGuideline = MinimumTapTargetGuideline(
  size: Size(24, 24),
  link: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum',
);

/// The a11y-gate checks every in-scope state must pass (WCAG 2.2 AA via the
/// flutter_test guidelines): every tappable node has a label, every target
/// is at least 24x24, and text meets contrast. Declares one test per theme
/// at phone width.
void kmA11yGate(
  String stateId, {
  bool signedIn = false,
  KmFrameOverlay overlay = KmFrameOverlay.none,
  double width = 375,
}) {
  for (final KmTestTheme theme in KmTestTheme.values) {
    testWidgets('$stateId meets the a11y gate (${theme.name}, ${width.toInt()})', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      setKmViewport(tester, width: width);
      await pumpKmApp(
        tester,
        stateId: stateId,
        theme: theme,
        signedIn: signedIn,
        overlay: overlay,
      );
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(wcagTargetSizeGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      semantics.dispose();
    });
  }
}
