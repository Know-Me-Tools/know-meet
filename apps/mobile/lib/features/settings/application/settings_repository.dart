// TJ-ARCH-MOB-001 compliant
import '../domain/settings_values.dart';

/// Port for the settings the screens show. This phase has no settings
/// backend (static screens); the fixture adapter implements it.
abstract interface class SettingsRepository {
  /// The settings as of [now] (sample meetings are placed relative to it).
  SettingsSnapshot load(DateTime now);
}
