// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_bar.dart';
import 'package:sovereign_hybrid_mobile/app/frame/km_app_frame.dart';
import 'package:sovereign_hybrid_mobile/shared/ui/ui.dart';

import '../support/km_a11y.dart';
import '../support/km_test_app.dart';

const ValueKey<String> _skip = ValueKey<String>('km-skip-link');
const ValueKey<String> _brand = ValueKey<String>('km-brand');
const ValueKey<String> _start = ValueKey<String>('km-start-meeting');
const ValueKey<String> _theme = ValueKey<String>('km-theme-toggle');
const ValueKey<String> _signIn = ValueKey<String>('km-sign-in');
const ValueKey<String> _account = ValueKey<String>('km-account-button');
const ValueKey<String> _railMeetings = ValueKey<String>('km-nav-/dashboard');

Future<void> _tab(WidgetTester tester) async {
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.pump();
}

void main() {
  group('a11y gate: frame states', () {
    kmA11yGate('frame.appbar-signed-out');
    kmA11yGate('frame.appbar-signed-in', signedIn: true);
    kmA11yGate(
      'frame.account-menu-open',
      signedIn: true,
      overlay: KmFrameOverlay.accountMenu,
    );
    kmA11yGate('frame.nav-bar', signedIn: true);
    kmA11yGate('frame.nav-rail', signedIn: true, width: 768);
    kmA11yGate('frame.nav-inline', signedIn: true, width: 1024);
    kmA11yGate('frame.appbar-signed-out', width: 768);
  });

  group('focus traversal order', () {
    testWidgets('guest: skip link, brand, start, theme, sign in', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'index.default');
      for (final ValueKey<String> key in <ValueKey<String>>[
        _skip,
        _brand,
        _start,
        _theme,
        _signIn,
      ]) {
        await _tab(tester);
        expect(focusIsWithin(key), isTrue, reason: 'expected focus on $key');
      }
    });

    testWidgets('signed in: the account button replaces sign in', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'dashboard.upcoming', signedIn: true);
      for (final ValueKey<String> key in <ValueKey<String>>[
        _skip,
        _brand,
        _start,
        _theme,
        _account,
      ]) {
        await _tab(tester);
        expect(focusIsWithin(key), isTrue, reason: 'expected focus on $key');
      }
    });

    testWidgets('medium: the rail follows the app bar, before the page', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 768);
      await pumpKmApp(tester, stateId: 'dashboard.upcoming', signedIn: true);
      for (final ValueKey<String> key in <ValueKey<String>>[
        _skip,
        _brand,
        _start,
        _theme,
        _account,
        const ValueKey<String>('km-nav-/'),
        _railMeetings,
      ]) {
        await _tab(tester);
        expect(focusIsWithin(key), isTrue, reason: 'expected focus on $key');
      }
    });

    testWidgets('the skip link is hidden until focused and moves focus to main', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'index.default');
      expect(tester.getTopLeft(find.byKey(_skip)).dy, lessThan(0));
      await _tab(tester);
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(find.byKey(_skip)).dy, greaterThanOrEqualTo(0));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'km-main');
    });

    testWidgets('Escape closes the account menu and returns focus', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'dashboard.upcoming', signedIn: true);
      await tester.tap(find.byKey(_account));
      await tester.pumpAndSettle();
      expect(find.byType(KmAccountMenu), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.byType(KmAccountMenu), findsNothing);
      expect(focusIsWithin(_account), isTrue);
    });
  });

  // Placement, anatomy, targets and the resize morph: adaptive_nav_test.dart.

  group('reduced motion (MediaQuery.disableAnimations)', () {
    testWidgets('the account menu appears without animation when disabled', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'settings.account', signedIn: true);
      await tester.tap(find.byKey(_account));
      await tester.pump();
      expect(find.byType(KmAccountMenu), findsOneWidget);
      expect(kmHasRunningAnimations(tester), isFalse);
    });

    testWidgets('the account menu pops in when animations are allowed', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375, disableAnimations: false);
      // A page with no looping animation (Home's dots breathe), so the
      // initial settle completes.
      await pumpKmApp(tester, stateId: 'settings.account', signedIn: true);
      await tester.tap(find.byKey(_account));
      await tester.pump();
      expect(kmHasRunningAnimations(tester), isTrue);
      await tester.pumpAndSettle();
    });
  });

  testWidgets('the account button shows open by the selected fill, not a ring', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'dashboard.upcoming', signedIn: true);
    await tester.tap(find.byKey(_account));
    await tester.pumpAndSettle();
    final KmAvatar avatar = tester.widget<KmAvatar>(
      find.descendant(of: find.byKey(_account), matching: find.byType(KmAvatar)),
    );
    expect(avatar.tone, KmAvatarTone.selected);
  });

  testWidgets('theme toggle switches theme and icon (sun in dark, moon in light)', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'index.default');
    expect(
      find.descendant(of: find.byKey(_theme), matching: find.byIcon(LucideIcons.sun)),
      findsOneWidget,
    );
    await tester.tap(find.byKey(_theme));
    await tester.pumpAndSettle();
    expect(
      Theme.of(tester.element(find.byKey(_theme))).brightness,
      Brightness.light,
    );
    expect(
      find.descendant(of: find.byKey(_theme), matching: find.byIcon(LucideIcons.moon)),
      findsOneWidget,
    );
  });
}
