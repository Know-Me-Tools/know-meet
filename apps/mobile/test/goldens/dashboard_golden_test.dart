// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// VS-3 goldens for the Meetings dashboard: one per inventory state, both
/// themes, phone (375) and tablet (768). Images are generated in c13 and
/// approved by design-lead (approvals.json); never self-approved.
void main() {
  const List<String> signedInStates = <String>[
    'dashboard.upcoming',
    'dashboard.schedule',
    'dashboard.meeting.partner-onboarding',
    'dashboard.meeting.cohort-kickoff',
    'dashboard.meeting.product-sync',
    'dashboard.meeting.pricing-review',
    'dashboard.invites',
    'dashboard.empty',
  ];
  for (final String id in signedInStates) {
    kmGolden(id, signedIn: true);
  }
  kmGolden('dashboard.gate-signed-out');
}
