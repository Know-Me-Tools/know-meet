// TJ-ARCH-MOB-001 compliant
@Tags(<String>['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_golden.dart';

/// VS-3 goldens for every in-scope agents state (route-inventory.json),
/// both themes at 375 and 768. Images are generated and approved in c13.
void main() {
  group('agents', () {
    kmGolden('agents.registry', signedIn: true);
    kmGolden('agents.register.1', signedIn: true);
    kmGolden('agents.register.2', signedIn: true);
    kmGolden('agents.register.3', signedIn: true);
    kmGolden('agents.register.4', signedIn: true);
    kmGolden('agents.register-error', signedIn: true);
    kmGolden('agents.detail.scribe', signedIn: true);
    kmGolden('agents.detail.researcher', signedIn: true);
    kmGolden('agents.detail.facilitator', signedIn: true);
    kmGolden('agents.detail.translator', signedIn: true);
    // Guest access: the Concierge page is public.
    kmGolden('agents.concierge');
    kmGolden('agents.dots', signedIn: true);
    kmGolden('agents.dot.iris', signedIn: true);
    kmGolden('agents.gate-signed-out');
  });
}
