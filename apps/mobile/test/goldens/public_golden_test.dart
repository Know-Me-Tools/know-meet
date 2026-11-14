// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// Public screens (VS-3): home, the sign-in flow and the invitee flow.
/// All guest states (no km-auth), both themes, phone and tablet.
void main() {
  group('home', () {
    kmGolden('index.default');
  });

  group('auth', () {
    kmGolden('auth.sign-in');
    kmGolden('auth.sign-up');
    kmGolden('auth.check-email');
    kmGolden('auth.sign-in-error');
    kmGolden('auth.magic-link-sent');
  });

  group('join', () {
    kmGolden('join.invite');
    kmGolden('join.waiting');
    kmGolden('join.expired');
    kmGolden('join.wrong-code');
  });
}
