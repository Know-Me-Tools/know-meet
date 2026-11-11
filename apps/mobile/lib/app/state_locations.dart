// TJ-ARCH-MOB-001 compliant

/// Maps an inventory state ID (docs/design/screen-inventory/
/// route-inventory.json, `idRule`) to the app location that renders it.
///
/// Rule: `<page>.<hash with ':' as '.'>` becomes `/<page>/<hash with '.'
/// as '/'>`; `index.default` is `/`; `<page>.default` and
/// `<page>.gate-signed-out` are `/<page>` (the gate is the signed-out
/// render of the page). `frame.*` states render on the page the inventory
/// names (`how` field) and are listed explicitly.
String kmLocationForState(String stateId) {
  final String? frame = _frameStates[stateId];
  if (frame != null) return frame;
  if (stateId == 'index.default') return '/';
  final int dot = stateId.indexOf('.');
  if (dot < 0) throw ArgumentError.value(stateId, 'stateId', 'no page part');
  final String page = stateId.substring(0, dot);
  final String rest = stateId.substring(dot + 1);
  if (rest == 'default' || rest == 'gate-signed-out') return '/$page';
  return '/$page/${rest.replaceAll('.', '/')}';
}

const Map<String, String> _frameStates = <String, String>{
  'frame.appbar-signed-out': '/',
  'frame.appbar-signed-in': '/dashboard/upcoming',
  'frame.account-menu-open': '/dashboard/upcoming',
  // Retired by DESIGN.md "Adaptive layout" (ADJ-2): the hamburger no longer
  // exists. Still in the inventory until bdd-quality replaces them, so they
  // keep a location; their goldens are not rendered (coverage_test.dart).
  'frame.nav-collapsed': '/',
  'frame.nav-open': '/',
  // ADJ-2 replacements (requested from bdd-quality): bottom bar at 375,
  // rail at 768, inline links at 1024, on an app page with a current item.
  'frame.nav-bar': '/dashboard/upcoming',
  'frame.nav-rail': '/dashboard/upcoming',
  'frame.nav-links': '/dashboard/upcoming',
  'frame.skip-link-focused': '/',
  'frame.theme-toggle': '/',
};
