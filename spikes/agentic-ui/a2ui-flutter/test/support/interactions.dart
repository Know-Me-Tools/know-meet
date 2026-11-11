import 'package:a2ui_parity/a2ui/agui_action.dart';
import 'package:a2ui_parity/a2ui/surface_session.dart';
import 'package:a2ui_parity/surfaces/golden_surface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'surface_harness.dart';

/// Drives one golden interaction (fill, toggle, click) and asserts the action
/// it emits, or that none is emitted. Mirrors runInteraction in
/// harness/checks/a2ui-surfaces.spec.ts.
Future<void> runInteraction(
  WidgetTester tester,
  SurfaceSession session,
  GoldenSurface surface,
  GoldenInteraction interaction,
) async {
  final int before = session.actions.length;
  for (final MapEntry<String, String> e in interaction.fill.entries) {
    await tester.enterText(a2uiInput(e.key), e.value);
    await pumpFrames(tester, frames: 2);
  }
  for (final String id in interaction.toggle) {
    await tester.tap(
      find.descendant(of: a2ui(id), matching: find.byType(Checkbox)),
    );
    await pumpFrames(tester, frames: 2);
  }
  await tester.ensureVisible(a2ui(interaction.click).first);
  await tester.tap(a2ui(interaction.click).first, warnIfMissed: false);
  await pumpFrames(tester, frames: 4);
  for (final String text in interaction.expectVisibleText) {
    expect(find.textContaining(text), findsWidgets, reason: text);
  }
  final ExpectedAction? wanted = interaction.expectAction;
  if (wanted == null) {
    expect(
      session.actions.length,
      before,
      reason: '"${interaction.description}" must not send an action',
    );
    return;
  }
  expect(session.actions.length, before + 1, reason: interaction.description);
  final sent = session.actions[before];
  expect(
    jsonEquals(actionCore(sent), {
      'name': wanted.name,
      'surfaceId': surface.surfaceId,
      'sourceComponentId': wanted.sourceComponentId,
      'context': wanted.context,
    }),
    isTrue,
    reason: 'sent ${actionCore(sent)}',
  );
  final user =
      (toAgUiForwardedProps(sent)['a2uiAction']! as Map)['userAction']! as Map;
  expect(
    user.keys.toSet().containsAll(
      ['name', 'surfaceId', 'sourceComponentId', 'timestamp', 'context'],
    ),
    isTrue,
    reason: 'forwardedProps.a2uiAction.userAction shape: ${user.keys}',
  );
}
