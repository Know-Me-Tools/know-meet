// TJ-ARCH-MOB-001 compliant
@Tags(<String>['a11y'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../support/km_inventory.dart';
import '../support/km_test_app.dart';

/// Reduced motion (MediaQuery.disableAnimations, a11y-gate): with the
/// platform asking for it, no in-scope state may leave an animation running
/// once it has settled: dots stop breathing, live pips stop pulsing, and
/// transitions are instant (km.css `prefers-reduced-motion`).
void main() {
  for (final KmInventoryState s in kmInScopeStates()) {
    testWidgets('${s.id} is still under reduced motion', (WidgetTester tester) async {
      setKmViewport(tester, width: 375, disableAnimations: true);
      await pumpKmApp(tester, stateId: s.id, signedIn: s.signedIn);
      await tester.pump(const Duration(seconds: 5));
      expect(kmHasRunningAnimations(tester), isFalse);
    });
  }
}
