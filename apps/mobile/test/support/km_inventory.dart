// TJ-ARCH-MOB-001 compliant
import 'dart:convert';
import 'dart:io';

/// One in-scope state of docs/design/screen-inventory/route-inventory.json.
final class KmInventoryState {
  const KmInventoryState(this.id, this.access);

  final String id;

  /// `guest`, `invitee` or `sign-in`.
  final String access;

  bool get signedIn => access == 'sign-in';
}

/// The in-scope states of the frozen inventory (VS-7). `flutter test` runs
/// with the package root (apps/mobile) as the working directory.
List<KmInventoryState> kmInScopeStates() {
  final File file = File('../../docs/design/screen-inventory/route-inventory.json');
  final Map<String, dynamic> inventory =
      jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  return <KmInventoryState>[
    for (final dynamic r in inventory['routes'] as List<dynamic>)
      if ((r as Map<String, dynamic>)['inScope'] == true)
        KmInventoryState(r['id'] as String, r['access'] as String),
  ];
}
