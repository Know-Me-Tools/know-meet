// The parity viewer app: phone width shows the surface list and pushes a
// surface; tablet width shows list and surface side by side.
import 'package:a2ui_parity/ui/parity_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  Future<void> pumpApp(WidgetTester tester, Size size) async {
    tester.view
      ..physicalSize = size
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ParityApp(surfaces: allSurfaces(), media: testMedia));
    await pumpFrames(tester);
  }

  testWidgets('phone: list, then a pushed surface page', (tester) async {
    await pumpApp(tester, phoneSize);
    expect(find.text('card-with-action'), findsOneWidget);
    expect(a2ui('add_btn'), findsNothing);
    await tester.tap(find.text('card-with-action'));
    await pumpFrames(tester);
    expect(a2ui('add_btn'), findsOneWidget);
    await tester.tap(a2ui('add_btn'));
    await pumpFrames(tester);
    expect(find.textContaining('"add_agent"'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tablet: two panes, selection switches surface', (tester) async {
    await pumpApp(tester, tabletSize);
    expect(a2ui('accept_btn'), findsOneWidget);
    await tester.tap(find.text('unknown-component-fallback'));
    await pumpFrames(tester);
    expect(a2uiFallback('hologram'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
