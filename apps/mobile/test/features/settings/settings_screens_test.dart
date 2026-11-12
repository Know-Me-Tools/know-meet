// TJ-ARCH-MOB-001 compliant
// Settings screens: each in-scope state renders its heading at phone width,
// and passes the a11y gate (labels, 44px targets, contrast) in both themes.
@Tags(<String>['a11y'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

/// (state ID, h1 text) for every signed-in settings state.
const List<(String, String)> _states = <(String, String)>[
  ('settings.account', 'Account'),
  ('settings.livekit', 'LiveKit'),
  ('settings.telnyx-sms', 'Telnyx SMS'),
  ('settings.telnyx-voice', 'Telnyx voice dial-in'),
  ('settings.calendars', 'Calendars'),
  ('settings.calendar-connect.google', 'Connect Google Calendar'),
  ('settings.calendar-connect.outlook', 'Connect Microsoft 365 / Outlook'),
  ('settings.calendar-connect.caldav', 'Connect iCloud / CalDAV'),
  ('settings.storage', 'Storage'),
  ('settings.storage-s3', 'S3-compatible storage'),
  ('settings.storage-ipfs', 'IPFS pinning'),
  ('settings.storage-test-failed', 'Storage test failed'),
  ('settings.recording', 'Recording & transcription'),
  ('settings.delivery', 'Summary delivery'),
  ('settings.templates', 'Message templates'),
  ('settings.notifications', 'Notifications'),
];

/// The h1 is the only header-flagged Text with this exact string.
Finder _heading(String text) => find.byWidgetPredicate(
  (Widget w) => w is Semantics && w.properties.header == true && w.child is Text &&
      (w.child! as Text).data == text,
);

void main() {
  for (final (String id, String title) in _states) {
    testWidgets('$id renders its heading signed in', (WidgetTester tester) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: id, signedIn: true);
      expect(_heading(title), findsOneWidget);
      expect(find.text('Sign in to manage settings'), findsNothing);
    });
    kmA11yGate(id, signedIn: true);
  }

  testWidgets('settings.gate-signed-out shows the gate on every settings route', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle semantics = tester.ensureSemantics();
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'settings.gate-signed-out');
    expect(find.text('Sign in to manage settings'), findsOneWidget);
    expect(find.bySemanticsLabel('Sign in'), findsWidgets);
    semantics.dispose();
  });
  kmA11yGate('settings.gate-signed-out');

  testWidgets('the section nav marks the routed section and navigates', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle semantics = tester.ensureSemantics();
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'settings.storage-s3', signedIn: true);
    // A sub-page highlights its parent section (prototype ACTIVE_ALIAS).
    expect(
      tester.getSemantics(find.bySemanticsLabel('Storage').first),
      isSemantics(isButton: true, isSelected: true, hasTapAction: true),
    );
    await tester.tap(find.bySemanticsLabel('Notifications').first);
    await tester.pumpAndSettle();
    expect(_heading('Notifications'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('credentials are never rendered, only masked placeholders', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle semantics = tester.ensureSemantics();
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'settings.livekit', signedIn: true);
    expect(find.text('LIVEKIT_API_KEY'), findsOneWidget);
    expect(find.text('LIVEKIT_API_SECRET'), findsOneWidget);
    expect(find.bySemanticsLabel('Hidden value'), findsNWidgets(2));
    semantics.dispose();
  });
}
