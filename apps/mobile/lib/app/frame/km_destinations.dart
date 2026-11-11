// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';

import '../../shared/ui/ui.dart';

/// One top-level destination.
final class KmDestination {
  const KmDestination(this.path, this.label, this.icon);

  final String path;
  final String label;
  final IconData icon;

  /// Whether [location] is this destination. Home matches only `/`, or it
  /// would light up everywhere (mobile-navigation skill).
  bool matches(String location) =>
      path == '/' ? location == '/' : (location == path || location.startsWith('$path/'));
}

/// THE destination list (prototype km.js `NAV`). The bottom bar, the rail
/// and the app-bar menu all render this one list, so labels, icons and paths
/// cannot drift between them.
const List<KmDestination> kmDestinations = <KmDestination>[
  KmDestination('/', 'Home', LucideIcons.house),
  KmDestination('/dashboard', 'Meetings', LucideIcons.calendar),
  KmDestination('/recordings', 'Recordings', LucideIcons.film),
  KmDestination('/agents', 'Agents', LucideIcons.bot),
  KmDestination('/settings', 'Settings', LucideIcons.settings),
];

/// Index of the destination for [location], or -1. Derived from the router
/// on every build; never stored.
int kmDestinationIndex(String location) =>
    kmDestinations.indexWhere((KmDestination d) => d.matches(location));
