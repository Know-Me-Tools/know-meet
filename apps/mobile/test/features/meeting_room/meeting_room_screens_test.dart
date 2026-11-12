// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/app_router.dart';
import 'package:sovereign_hybrid_mobile/app/know_meet_app.dart';
import 'package:sovereign_hybrid_mobile/shared/theme_mode/theme_mode.dart';
import 'package:sovereign_hybrid_mobile/shared/clock/km_clock.dart';
import 'package:sovereign_hybrid_mobile/shared/session/session.dart';
import 'package:sovereign_hybrid_mobile/shared/ui/ui.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

const List<String> _sharedControls = <String>[
  'Mute',
  'Start video',
  'Share',
  'Captions',
  'Chat',
  'Transcript',
  'Knowledge',
  'Invite',
  'Leave',
  'Switch theme',
  'Know Meet home',
];

class _SignedIn extends SessionController {
  @override
  KmUser? build() => SessionController.sampleUser;
}

void main() {
  group('meet.room (signed in)', () {
    testWidgets('renders the title, roster and every named control', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'meet.room', signedIn: true);

      expect(find.text('Partner onboarding review'), findsOneWidget);
      expect(find.text('Avery Chen (you)'), findsOneWidget);
      for (final String label in <String>[
        ..._sharedControls,
        'Record',
        'Add agent',
        'My agent',
        'Pause Iris',
        'Remove Scribe from the room',
      ]) {
        expect(find.bySemanticsLabel(label), findsWidgets, reason: label);
      }
      expect(
        find.bySemanticsLabel('You joined. Captions and transcription are on.'),
        findsOneWidget,
      );
      semantics.dispose();
    });

    kmA11yGate('meet.room', signedIn: true);
  });

  group('meet.room-guest', () {
    testWidgets('renders the guest roster and locked controls', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'meet.room-guest');

      expect(find.text('Partner onboarding review'), findsOneWidget);
      expect(find.text('Guest (you)'), findsOneWidget);
      for (final String label in <String>[
        ..._sharedControls,
        'Record (sign in to unlock)',
        'Add agent (sign in to unlock)',
        'Concierge',
      ]) {
        expect(find.bySemanticsLabel(label), findsWidgets, reason: label);
      }
      semantics.dispose();
    });

    kmA11yGate('meet.room-guest');
  });

  group('reduced motion', () {
    testWidgets('the room is still when animations are disabled', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375, disableAnimations: true);
      await pumpKmApp(tester, stateId: 'meet.room', signedIn: true);
      expect(kmHasRunningAnimations(tester), isFalse);
    });

    testWidgets('the dots breathe when animations are allowed', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 768, disableAnimations: false);
      // The orbs loop, so pumpKmApp's pumpAndSettle would never settle:
      // pump the same app with plain frames instead.
      await loadKmFonts();
      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            themePreferenceStoreProvider.overrideWithValue(
              KmFixedThemeStore(ThemePreference.dark),
            ),
            kmClockProvider.overrideWithValue(() => kmFrozenNow),
            kmInitialLocationProvider.overrideWithValue('/meet/room'),
            sessionControllerProvider.overrideWith(_SignedIn.new),
          ],
          child: const KnowMeetApp(),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(KmOrb), findsWidgets);
      expect(kmHasRunningAnimations(tester), isTrue);
      await tester.pumpWidget(const SizedBox());
    });
  });
}
