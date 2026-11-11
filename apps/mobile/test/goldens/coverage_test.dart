// TJ-ARCH-MOB-001 compliant
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/state_locations.dart';

import '../support/km_inventory.dart';

/// In-scope states c12 does not render in a phone layout, with the reason
/// (flutter-golden-provenance.json `comparisonSource.states`). Empty: every
/// in-scope state has a golden.
const Map<String, String> kmStatesNotRendered = <String, String>{};

/// Provenance check (not tagged golden, so it runs on the per-change path):
/// every in-scope inventory state is declared in a golden test file or
/// listed in [kmStatesNotRendered], and maps to an app location.
void main() {
  final List<KmInventoryState> states = kmInScopeStates();

  test('the inventory has the 70 in-scope states c12 was planned against', () {
    expect(states, hasLength(70));
  });

  test('every in-scope state has a golden or a recorded reason', () {
    final RegExp quoted = RegExp(r"'([a-z0-9-]+(?:\.[a-z0-9-]+)+)'");
    final Set<String> declared = <String>{
      for (final FileSystemEntity f in Directory('test/goldens').listSync())
        if (f is File && f.path.endsWith('_golden_test.dart'))
          for (final RegExpMatch m in quoted.allMatches(f.readAsStringSync()))
            m.group(1)!,
    };
    final List<String> missing = <String>[
      for (final KmInventoryState s in states)
        if (!declared.contains(s.id) && !kmStatesNotRendered.containsKey(s.id)) s.id,
    ];
    expect(missing, isEmpty);
  });

  test('every in-scope state maps to an app location', () {
    for (final KmInventoryState s in states) {
      expect(kmLocationForState(s.id), startsWith('/'), reason: s.id);
    }
  });
}
