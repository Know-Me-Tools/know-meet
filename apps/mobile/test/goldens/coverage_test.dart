// TJ-ARCH-MOB-001 compliant
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sovereign_hybrid_mobile/app/state_locations.dart';

import '../support/km_inventory.dart';

/// In-scope states with no golden, with the reason
/// (flutter-golden-provenance.json `comparisonSource.states`).
const Map<String, String> kmStatesNotRendered = <String, String>{
  'frame.nav-collapsed':
      'Retired by DESIGN.md "Adaptive layout" (thresholds.json ADJ-2): the hamburger '
      'no longer exists. Replaced by frame.nav-bar / nav-rail / nav-inline, pending '
      'the inventory update by bdd-quality.',
  'frame.nav-open': 'Retired with frame.nav-collapsed (ADJ-2).',
};

/// Provenance check (not tagged golden, so it runs on the per-change path):
/// every in-scope inventory state is declared in a golden test file or
/// listed in [kmStatesNotRendered], and maps to an app location.
void main() {
  final List<KmInventoryState> states = kmInScopeStates();

  test('the inventory has the 71 in-scope states of inventory v2', () {
    expect(states, hasLength(71));
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
