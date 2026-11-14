// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

/// Each public state renders its heading at phone width and passes the
/// a11y gate (labels, 44px targets, contrast) in both themes.
void main() {
  const Map<String, String> headings = <String, String>{
    'index.default': 'What happens in a KnowMe meeting',
    'auth.sign-in': 'Sign in to Know Meet',
    'auth.sign-up': 'Create your KnowMe account',
    'auth.check-email': 'Check your email',
    'auth.sign-in-error': 'That email and password don’t match',
    'auth.magic-link-sent': 'Check your inbox',
    'join.invite': 'Weekly product sync',
    'join.waiting': 'The host will let you in soon',
    'join.expired': 'This meeting has ended',
    'join.wrong-code': 'We couldn’t find that meeting',
  };

  for (final MapEntry<String, String> e in headings.entries) {
    testWidgets('${e.key} renders "${e.value}"', (WidgetTester tester) async {
      setKmViewport(tester, width: 375);
      await pumpKmApp(tester, stateId: e.key);
      expect(find.text(e.value, skipOffstage: false), findsOneWidget);
    });
    kmA11yGate(e.key);
  }

  testWidgets('the home hero headline renders as a heading', (WidgetTester tester) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'index.default');
    expect(
      find.textContaining('Meetings where agents do the', findRichText: true),
      findsOneWidget,
    );
  });

  testWidgets('the sign-in error state marks the password field', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'auth.sign-in-error');
    expect(find.text('Re-enter your password for this email.'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  testWidgets('the invite places the meeting tomorrow at 10:00 from the frozen clock', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'join.invite');
    expect(find.text('Starts tomorrow at 10:00 AM'), findsOneWidget);
    expect(find.text('Wed, Nov 11'), findsOneWidget);
    expect(find.text('10:00 AM – 10:30 AM'), findsOneWidget);
  });
}
