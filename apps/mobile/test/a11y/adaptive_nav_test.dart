// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_destinations.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_nav_bars.dart';
import 'package:sovereign_hybrid_mobile/shared/ui/ui.dart';

import '../support/km_contrast.dart';
import '../support/km_test_app.dart';

/// DESIGN.md "Adaptive layout" (D-8): one navigation spec shared with the
/// web. Bottom bar < 600, rail 600 to 1023, inline app-bar links >= 1024;
/// same five destinations, labels and order in every class; the current
/// item derived from the route; targets >= 44; resize morph once per
/// crossing, instant under reduced motion; focus survives the morph.
void main() {
  const ValueKey<String> meetings = ValueKey<String>('km-nav-/dashboard');

  // With motion allowed, a page without looping animations (Home's dots
  // breathe, live pips pulse) so pumpAndSettle completes.
  Future<void> pumpAt(WidgetTester tester, double width, {bool motion = false}) async {
    setKmViewport(tester, width: width, disableAnimations: !motion);
    await pumpKmApp(
      tester,
      stateId: motion ? 'settings.account' : 'dashboard.upcoming',
      signedIn: true,
    );
  }

  List<String> labelsIn(WidgetTester tester, Type nav) => <String>[
    for (final KmDestination d in kmDestinations)
      if (find
          .descendant(of: find.byType(nav), matching: find.byKey(ValueKey<String>('km-nav-${d.path}')))
          .evaluate()
          .isNotEmpty)
        d.label,
  ];

  group('placement by width class', () {
    for (final (double width, Type shown) in <(double, Type)>[
      (375, KmBottomBar),
      (599, KmBottomBar),
      (600, KmNavRail),
      (768, KmNavRail),
      (1023, KmNavRail),
      (1024, KmInlineNav),
      (1440, KmInlineNav),
    ]) {
      testWidgets('$shown at $width', (WidgetTester tester) async {
        await pumpAt(tester, width);
        for (final Type t in <Type>[KmBottomBar, KmNavRail, KmInlineNav]) {
          expect(find.byType(t), t == shown ? findsOneWidget : findsNothing, reason: '$t');
        }
        expect(labelsIn(tester, shown), <String>['Home', 'Meetings', 'Recordings', 'Agents', 'Settings']);
      });
    }
  });

  group('anatomy and states', () {
    testWidgets('bar: bg-2, 64 tall, items >= 48 x 44, current is selected', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpAt(tester, 375);
      final KmPalette p = KmPalette.dark;
      expect(tester.getSize(find.byType(KmBottomBar)).height, KmTokens.sizeNavBarH);
      expect(
        tester.widget<ColoredBox>(find.descendant(of: find.byType(KmBottomBar), matching: find.byType(ColoredBox)).first).color,
        p.bg2,
      );
      final Size item = tester.getSize(find.byKey(meetings));
      expect(item.width, greaterThanOrEqualTo(48));
      expect(item.height, greaterThanOrEqualTo(KmTokens.sizeTarget));
      expect(
        tester.getSemantics(find.descendant(of: find.byType(KmBottomBar), matching: find.bySemanticsLabel('Meetings'))),
        isSemantics(label: 'Meetings', isButton: true, isSelected: true),
      );
      final Iterable<Color?> fills = tester
          .widgetList(find.descendant(of: find.byKey(meetings), matching: find.byKey(const ValueKey<String>('km-nav-current'))))
          .map(kmDecorationFill);
      expect(fills, contains(p.selected));
      semantics.dispose();
    });

    testWidgets('rail: 80 wide, 80 x 64 items', (WidgetTester tester) async {
      await pumpAt(tester, 768);
      expect(tester.getSize(find.byType(KmNavRail)).width, KmTokens.sizeNavRailW);
      expect(tester.getSize(find.byKey(meetings)), const Size(KmTokens.sizeNavRailW, KmTokens.sizeNavBarH));
    });

    testWidgets('inline links: 44 tall pills', (WidgetTester tester) async {
      await pumpAt(tester, 1024);
      expect(tester.getSize(find.byKey(meetings)).height, greaterThanOrEqualTo(KmTokens.sizeTarget));
    });

    testWidgets('keyboard focus fills the whole item with focus (>= 3:1 vs bar)', (WidgetTester tester) async {
      await pumpAt(tester, 375);
      final KmPalette p = KmPalette.dark;
      for (int i = 0; i < 60 && !focusIsWithin(meetings); i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
      }
      expect(focusIsWithin(meetings), isTrue);
      final Iterable<Color?> fills = tester
          .widgetList(find.descendant(of: find.byKey(meetings), matching: find.byType(AnimatedContainer)))
          .map(kmDecorationFill);
      expect(fills, contains(p.focus));
      expect(kmContrast(p.focus, p.bg2), greaterThanOrEqualTo(3));
      expect(kmContrast(p.onFocus, p.focus), greaterThanOrEqualTo(4.5));
    });

    testWidgets('the bar hides while the on-screen keyboard is open', (WidgetTester tester) async {
      await pumpAt(tester, 375);
      tester.view.viewInsets = const FakeViewPadding(bottom: 300);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();
      expect(find.byType(KmBottomBar), findsNothing);
    });
  });

  group('resize motion', () {
    testWidgets('reduced motion: crossing 600 is instant', (WidgetTester tester) async {
      await pumpAt(tester, 375);
      tester.view.physicalSize = const Size(768, 1024);
      await tester.pump();
      expect(find.byType(KmNavRail), findsOneWidget);
      expect(find.byType(KmBottomBar), findsNothing);
      expect(find.byKey(const ValueKey<String>('km-nav-outgoing-bar')), findsNothing);
      expect(kmHasRunningAnimations(tester), isFalse);
    });

    testWidgets('motion allowed: the bar leaves and the rail enters once', (WidgetTester tester) async {
      await pumpAt(tester, 375, motion: true);
      tester.view.physicalSize = const Size(768, 1024);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(kmHasRunningAnimations(tester), isTrue);
      expect(find.byKey(const ValueKey<String>('km-nav-outgoing-bar')), findsOneWidget);
      expect(find.byType(KmNavRail), findsOneWidget);
      await tester.pump(KmTokens.durNavMorph);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey<String>('km-nav-outgoing-bar')), findsNothing);
      // Resizing inside the class does not animate again.
      tester.view.physicalSize = const Size(900, 1024);
      await tester.pump();
      expect(kmHasRunningAnimations(tester), isFalse);
    });

    testWidgets('focus survives the morph (rail -> inline links)', (WidgetTester tester) async {
      await pumpAt(tester, 768);
      // The Meetings item is the current one on this page; focus it anyway
      // and check the same destination holds focus after the crossing.
      for (int i = 0; i < 60 && !focusIsWithin(meetings); i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
      }
      expect(focusIsWithin(meetings), isTrue);
      tester.view.physicalSize = const Size(1024, 768);
      await tester.pumpAndSettle();
      expect(find.byType(KmInlineNav), findsOneWidget);
      expect(focusIsWithin(meetings), isTrue);
    });
  });
}
