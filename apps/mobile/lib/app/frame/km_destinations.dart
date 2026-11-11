// TJ-ARCH-MOB-001 compliant
import '../../shared/ui/ui.dart';

/// One top-level destination.
final class KmDestination {
  const KmDestination(this.path, this.label, this.glyph);

  final String path;
  final String label;

  /// The prototype glyph (km.js `NAV[].icon`), the same on web and Flutter.
  final KmGlyph glyph;

  /// Whether [location] is this destination. Home matches only `/`, or it
  /// would light up everywhere (mobile-navigation skill).
  bool matches(String location) =>
      path == '/' ? location == '/' : (location == path || location.startsWith('$path/'));
}

/// THE destination list (prototype km.js `NAV`, DESIGN.md "Destinations").
/// The bottom bar, the rail and the inline app-bar links all render this one
/// list, so labels, icons, order and paths cannot drift between them.
const List<KmDestination> kmDestinations = <KmDestination>[
  KmDestination('/', 'Home', KmGlyph.home),
  KmDestination('/dashboard', 'Meetings', KmGlyph.calendar),
  KmDestination('/recordings', 'Recordings', KmGlyph.film),
  KmDestination('/agents', 'Agents', KmGlyph.agentAdd),
  KmDestination('/settings', 'Settings', KmGlyph.settings),
];

/// Index of the destination for [location], or -1. Derived from the router
/// on every build; never stored.
int kmDestinationIndex(String location) =>
    kmDestinations.indexWhere((KmDestination d) => d.matches(location));
