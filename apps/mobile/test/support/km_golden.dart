// TJ-ARCH-MOB-001 compliant
import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_frame.dart';
import 'package:sovereign_hybrid_mobile/app/know_meet_app.dart';

import 'km_test_app.dart';

/// Phone and tablet widths of the golden suite. 375 is the VS-3 oracle
/// viewport (flutter-golden-provenance.json); 768 is the tablet check.
const List<double> kmGoldenWidths = <double>[375, 768];

/// Tallest surface a full-page golden may grow to.
const double _maxFullPageHeight = 8000;

/// Golden path per the approvals README:
/// `test/goldens/<theme>/<viewport>/<stem>.png`, stem = state ID with `.`
/// replaced by `-`. Golden test files live in `test/goldens/`, so the path
/// passed to [matchesGoldenFile] is relative to that directory.
String kmGoldenPath(String stateId, KmTestTheme theme, double width) =>
    '${theme.name}/${width.toInt()}/${stateId.replaceAll('.', '-')}.png';

/// Declares one golden test per theme x width for [stateId], named
/// `<stateId> (<theme>, <width>)` as the approvals README requires. The
/// calling file must carry `@Tags(<String>['golden'])`.
///
/// [fullPage] grows the surface to the page's scroll height before the
/// snapshot, as the prototype baselines are full-page captures. [interact]
/// runs after the first settle (taps, key presses) for interaction states.
void kmGolden(
  String stateId, {
  bool signedIn = false,
  KmFrameOverlay overlay = KmFrameOverlay.none,
  bool fullPage = true,
  Future<void> Function(WidgetTester tester)? interact,
  List<double> widths = kmGoldenWidths,
}) {
  for (final KmTestTheme theme in KmTestTheme.values) {
    for (final double width in widths) {
      testWidgets('$stateId (${theme.name}, ${width.toInt()})', (
        WidgetTester tester,
      ) async {
        setKmViewport(tester, width: width);
        await pumpKmApp(
          tester,
          stateId: stateId,
          theme: theme,
          signedIn: signedIn,
          overlay: overlay,
        );
        if (interact != null) {
          await interact(tester);
          await tester.pumpAndSettle();
        }
        if (fullPage) await _growToContent(tester, width);
        await expectLater(
          find.byType(KnowMeetApp),
          matchesGoldenFile(kmGoldenPath(stateId, theme, width)),
        );
      });
    }
  }
}

/// Grows the surface by the main page's remaining vertical scroll extent so
/// the golden shows the whole page, like the full-page prototype captures.
Future<void> _growToContent(WidgetTester tester, double width) async {
  double extent = 0;
  for (final ScrollableState s in tester.stateList<ScrollableState>(
    find.byType(Scrollable),
  )) {
    if (s.position.axis != Axis.vertical || !s.position.hasContentDimensions) {
      continue;
    }
    extent = math.max(extent, s.position.maxScrollExtent);
  }
  if (extent <= 0) return;
  final double base = kmViewportHeights[width] ?? 812;
  tester.view.physicalSize = Size(
    width,
    math.min(base + extent, _maxFullPageHeight),
  );
  await tester.pumpAndSettle();
}
