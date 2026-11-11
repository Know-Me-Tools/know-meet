// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../../support/km_a11y.dart';
import '../../support/km_test_app.dart';

/// (state ID, signed in, text that proves the state rendered).
const List<(String, bool, String)> _states = <(String, bool, String)>[
  ('agents.registry', true, 'Your agents'),
  ('agents.register.1', true, 'Agent name'),
  ('agents.register.2', true, 'Minimal worker'),
  ('agents.register.3', true, 'Data retention'),
  ('agents.register.4', true, 'Connection test'),
  ('agents.register-error', true, 'Likely causes'),
  ('agents.detail.scribe', true, 'Configuration'),
  ('agents.detail.researcher', true, 'Answers questions from the meeting’s shared knowledge with cited sources.'),
  ('agents.detail.facilitator', true, 'Joins meetings tagged “workshop”'),
  ('agents.detail.translator', true, 'Worker offline'),
  ('agents.concierge', false, 'What it does for guests'),
  ('agents.dots', true, 'Dots, registered agents and the Concierge'),
  ('agents.dot.iris', true, 'Recent meeting memories'),
  ('agents.gate-signed-out', false, 'Sign in to bring agents into meetings'),
];

void main() {
  group('agents screens render', () {
    for (final (String id, bool signedIn, String proof) in _states) {
      testWidgets('$id renders at phone width', (WidgetTester tester) async {
        setKmViewport(tester, width: 375);
        await pumpKmApp(tester, stateId: id, signedIn: signedIn);
        expect(find.text(proof), findsWidgets);
      });
    }
  });

  testWidgets('a signed-out visitor sees the gate, not the registry', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'agents.registry');
    expect(find.text('Sign in to bring agents into meetings'), findsOneWidget);
    expect(find.text('Your agents'), findsNothing);
  });

  testWidgets('the test step blocks the run until required fields exist', (
    WidgetTester tester,
  ) async {
    setKmViewport(tester, width: 375);
    await pumpKmApp(tester, stateId: 'agents.register.4', signedIn: true);
    expect(find.text('Finish these before testing'), findsOneWidget);
    expect(find.text('Fix the items above to run the test.'), findsOneWidget);
  });

  group('agents a11y gate', () {
    for (final (String id, bool signedIn, String _) in _states) {
      kmA11yGate(id, signedIn: signedIn);
    }
  });
}
