// incremental-update-delete flutterNotes: assert intermediate frames.
// After message 5: 'Yes: 3' / 'No: 1'. After message 6: question ends with
// '(closed)'. After message 7: the surface is gone. Also list-template rows.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/surface_harness.dart';

void main() {
  setUpAll(() async {
    await loadBrandFonts();
    await preloadSurfaces();
  });

  testWidgets('incremental-update-delete intermediate frames', (tester) async {
    final surface = await loadSurface('incremental-update-delete');
    final session = await pumpSurface(tester, surface, applyMessages: false);
    final m = surface.messages;
    session.apply(m.sublist(0, 3));
    await pumpFrames(tester);
    expect(find.text('Yes: 0'), findsOneWidget);
    session.apply(m.sublist(3, 5));
    await pumpFrames(tester);
    expect(find.text('Yes: 3'), findsOneWidget);
    expect(find.text('No: 1'), findsOneWidget);
    session.applyOne(m[5]);
    await pumpFrames(tester);
    expect(find.text('Ship the hybrid runtime? (closed)'), findsOneWidget);
    expect(find.text('Yes: 3'), findsOneWidget, reason: 'siblings survive');
    session.applyOne(m[6]);
    await pumpFrames(tester);
    expect(find.textContaining('Ship the hybrid runtime'), findsNothing);
    expect(session.surfaces.value, isEmpty);
    expect(session.rejected, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('list-template rows render in order and grow', (tester) async {
    final surface = await loadSurface('list-template');
    final session = await pumpSurface(tester, surface, applyMessages: false);
    session.apply(surface.messages.sublist(0, 3));
    await pumpFrames(tester);
    expect(find.text('Concierge'), findsNothing);
    session.applyOne(surface.messages[3]);
    await pumpFrames(tester);
    final names = ['Ana', 'Ben', 'Concierge'];
    final ys = [for (final n in names) tester.getTopLeft(find.text(n)).dy];
    expect(ys[0] < ys[1] && ys[1] < ys[2], isTrue, reason: 'order $ys');
    expect(find.byType(Text), findsWidgets);
  });
}
