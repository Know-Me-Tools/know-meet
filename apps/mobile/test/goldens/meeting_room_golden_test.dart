// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// Meeting-room layout goldens (media stubbed). The room is a fixed
/// viewport (100dvh in the prototype), so these are not full-page captures.
void main() {
  kmGolden('meet.room', signedIn: true, fullPage: false);
  kmGolden('meet.room-guest', fullPage: false);
}
