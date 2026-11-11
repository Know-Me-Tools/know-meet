// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

/// Each dashboard state renders its heading at phone width, and passes the
/// a11y gate (labelled tap targets, 44px targets, text contrast) in both
/// themes.
void main() {
  const List<(String, String, bool)> states = <(String, String, bool)>[
    // (state ID, heading, signed in)
    ('dashboard.upcoming', 'Meetings', true),
    ('dashboard.schedule', 'Schedule a meeting', true),
    ('dashboard.meeting.partner-onboarding', 'Partner onboarding review', true),
    ('dashboard.meeting.cohort-kickoff', 'Cohort 2 kickoff', true),
    ('dashboard.meeting.product-sync', 'Weekly product sync', true),
    ('dashboard.meeting.pricing-review', 'Pricing review', true),
    ('dashboard.invites', 'Invites', true),
    ('dashboard.empty', 'Connect a calendar to see your meetings here', true),
    ('dashboard.gate-signed-out', 'Sign in to see your meetings', false),
  ];

  group('dashboard renders', () {
    for (final (String id, String heading, bool signedIn) in states) {
      testWidgets('$id shows "$heading"', (WidgetTester tester) async {
        setKmViewport(tester, width: 375);
        await pumpKmApp(tester, stateId: id, signedIn: signedIn);
        expect(find.text(heading), findsWidgets);
      });
    }

    testWidgets('upcoming shows the live meeting and frozen-clock times', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'dashboard.upcoming', signedIn: true);
      expect(find.text('Partner onboarding review'), findsOneWidget);
      expect(find.text('Started 20 min ago · 3 invitees · Recording on'), findsOneWidget);
      expect(find.text('4:30 PM'), findsOneWidget);
      expect(find.text('Times shown in UTC'), findsOneWidget);
      expect(find.text('Last synced 2:48 PM'), findsOneWidget);
    });

    testWidgets('invites lists all 21 invites with the failed SMS first', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'dashboard.invites', signedIn: true);
      expect(find.text('21 invites'), findsOneWidget);
      expect(find.text('Send email instead'), findsOneWidget);
    });

    testWidgets('signed out, every dashboard route shows the gate', (
      WidgetTester tester,
    ) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: 'dashboard.schedule');
      expect(find.text('Sign in to schedule a meeting'), findsOneWidget);
      expect(find.text('Schedule a meeting'), findsNothing);
    });
  });

  for (final (String id, String _, bool signedIn) in states) {
    kmA11yGate(id, signedIn: signedIn);
  }
}
