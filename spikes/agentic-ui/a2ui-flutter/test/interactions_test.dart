// Golden interactions: each click emits exactly the expected A2UI action
// (name, surfaceId, sourceComponentId, context; timestamp excluded), or none
// plus the validation text. Mirrors runInteraction in
// harness/checks/a2ui-surfaces.spec.ts.
import 'package:a2ui_parity/a2ui/agui_action.dart';
import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/interactions.dart';
import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });
  setUp(installFakeVideo);

  for (final String id in goldenSurfaceIds) {
    testWidgets('a2ui/$id golden interactions', (tester) async {
      final surface = await loadSurface(id);
      final session = await pumpSurface(tester, surface);
      for (final interaction in surface.interactions) {
        await runInteraction(tester, session, surface, interaction);
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('form-validation: submit is disabled (not click-and-block) '
      'while checks fail; reason is a tooltip', (tester) async {
    final surface = await loadSurface('form-validation');
    await pumpSurface(tester, surface);
    final submit = tester.widget<FilledButton>(
      find.descendant(of: a2ui('submit_btn'), matching: find.byType(FilledButton)),
    );
    expect(submit.onPressed, isNull);
    expect(
      find.byWidgetPredicate(
        (w) => w is Tooltip && w.message == 'Complete the form first',
      ),
      findsOneWidget,
    );
  });

  testWidgets('form-validation: field errors show before any input',
      (tester) async {
    final surface = await loadSurface('form-validation');
    await pumpSurface(tester, surface);
    final shown = <String>[
      for (final t in ['Name is required', 'Enter a valid email', 'Use 10-15 digits'])
        if (find.textContaining(t).evaluate().isNotEmpty) t,
    ];
    debugPrint('form errors visible on first render: $shown');
    expect(shown, contains('Name is required'));
  });

  testWidgets('nested-layout: Tabs switch and Modal opens', (tester) async {
    final surface = await loadSurface('nested-layout');
    final session = await pumpSurface(tester, surface);
    expect(find.text('Notes tab content'), findsNothing);
    await tester.tap(find.text('Notes'));
    await pumpFrames(tester);
    expect(find.text('Notes tab content'), findsOneWidget);
    await tester.tap(find.text('Agenda'));
    await pumpFrames(tester);
    await tester.tap(a2ui('modal_trigger').first);
    await pumpFrames(tester);
    expect(find.text('Decided: usage-based tiers.'), findsOneWidget);
    debugPrint('modal trigger actions: ${session.actions.map(actionCore)}');
  });
}
