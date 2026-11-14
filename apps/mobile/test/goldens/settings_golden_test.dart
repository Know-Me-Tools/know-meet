// TJ-ARCH-MOB-001 compliant
// Goldens for the settings states (VS-3). Names and paths follow
// test/goldens/README.md; images are generated and approved in c13.
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// Every in-scope settings state that renders signed in.
const List<String> settingsSignedInStates = <String>[
  'settings.account',
  'settings.livekit',
  'settings.telnyx-sms',
  'settings.telnyx-voice',
  'settings.calendars',
  'settings.calendar-connect.google',
  'settings.calendar-connect.outlook',
  'settings.calendar-connect.caldav',
  'settings.storage',
  'settings.storage-s3',
  'settings.storage-ipfs',
  'settings.storage-test-failed',
  'settings.recording',
  'settings.delivery',
  'settings.templates',
  'settings.notifications',
];

void main() {
  for (final String id in settingsSignedInStates) {
    kmGolden(id, signedIn: true);
  }
  kmGolden('settings.gate-signed-out');
}
