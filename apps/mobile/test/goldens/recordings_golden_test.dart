// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// Recordings goldens (VS-3): one per inventory state, both themes, phone
/// (375, the oracle viewport) and tablet (768). Player media is stubbed.
void main() {
  const List<String> signedInStates = <String>[
    'recordings.library',
    'recordings.detail.partner-onboarding-1014',
    'recordings.detail.partner-onboarding-1014.transcript',
    'recordings.detail.partner-onboarding-1014.summary',
    'recordings.detail.partner-onboarding-1014.delivery',
    'recordings.detail.partner-onboarding-1014.storage',
    'recordings.detail.design-crit-1009',
    'recordings.detail.vendor-call-1002',
    'recordings.processing.partner-onboarding-1014',
    'recordings.empty',
  ];
  for (final String id in signedInStates) {
    kmGolden(id, signedIn: true);
  }
  kmGolden('recordings.gate-signed-out');
}
