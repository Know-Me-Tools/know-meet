// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

/// Each recordings state renders its distinctive content through the real
/// app (router, frame, providers) and passes the a11y gate in both themes.
void main() {
  const Map<String, String> signedIn = <String, String>{
    'recordings.library': 'KnowMe-managed storage',
    'recordings.detail.partner-onboarding-1014': '6,910 words · speaker-attributed',
    'recordings.detail.partner-onboarding-1014.transcript': '6,910 words · speaker-attributed',
    'recordings.detail.partner-onboarding-1014.summary': 'Action items',
    'recordings.detail.partner-onboarding-1014.delivery': 'Delivery settings',
    'recordings.detail.partner-onboarding-1014.storage': 'Egress type',
    'recordings.detail.design-crit-1009': '4,380 words · speaker-attributed',
    'recordings.detail.vendor-call-1002': '7,720 words · speaker-attributed',
    'recordings.processing.partner-onboarding-1014': 'Step 1 of 5: Finalize composite',
    'recordings.empty': 'No recordings yet',
  };

  for (final MapEntry<String, String> e in signedIn.entries) {
    testWidgets('${e.key} renders "${e.value}"', (WidgetTester tester) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: e.key, signedIn: true);
      expect(find.text(e.value), findsWidgets);
    });
    kmA11yGate(e.key, signedIn: true);
  }

  testWidgets('recordings.gate-signed-out renders the sign-in gate', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'recordings.gate-signed-out');
    expect(find.text('Sign in to see your recordings'), findsOneWidget);
    expect(find.text('Your recordings'), findsOneWidget);
  });
  kmA11yGate('recordings.gate-signed-out');

  testWidgets('a detail tab is selected from the route and navigates on tap', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle semantics = tester.ensureSemantics();
    setKmViewport(tester, width: 375);
    await pumpKmApp(
      tester,
      stateId: 'recordings.detail.partner-onboarding-1014.storage',
      signedIn: true,
    );
    expect(find.text('Egress type'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Summary'));
    await tester.pumpAndSettle();
    expect(find.text('Action items'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('a chapter chip seeks the stubbed player', (WidgetTester tester) async {
    final SemanticsHandle semantics = tester.ensureSemantics();
    setKmViewport(tester, width: 375);
    await pumpKmApp(
      tester,
      stateId: 'recordings.detail.partner-onboarding-1014',
      signedIn: true,
    );
    expect(find.text('00:00 / 46:00'), findsOneWidget);
    await tester.ensureVisible(
      find.bySemanticsLabel(RegExp(r'^Jump to 07:00, Integration timeline$')),
    );
    await tester.tap(find.bySemanticsLabel(RegExp(r'^Jump to 07:00, Integration timeline$')));
    await tester.pumpAndSettle();
    expect(find.text('07:00 / 46:00'), findsOneWidget);
    semantics.dispose();
  });
}
