// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../shared/clock/km_clock.dart';
import '../application/settings_repository.dart';
import '../data/fixture_settings_repository.dart';
import '../domain/settings_values.dart';

part 'settings_providers.g.dart';

/// The settings port. Fixture adapter until a settings backend exists.
@Riverpod(keepAlive: true)
SettingsRepository settingsRepository(Ref ref) =>
    const FixtureSettingsRepository();

/// The settings the screens show, as of the app clock.
@riverpod
SettingsSnapshot settingsSnapshot(Ref ref) =>
    ref.watch(settingsRepositoryProvider).load(ref.watch(kmClockProvider)());

/// Switch and checkbox values on the settings pages, keyed as in
/// [SettingsSnapshot.toggles]. Widgets render a value and call [toggle];
/// nothing is persisted (static screens, no settings backend this phase).
@riverpod
class SettingsToggles extends _$SettingsToggles {
  @override
  Map<String, bool> build() => ref.watch(settingsSnapshotProvider).toggles;

  void toggle(String key, bool value) =>
      state = <String, bool>{...state, key: value};
}
