// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../application/theme_preference_store.dart';
import '../domain/theme_preference.dart';

part 'theme_preference_controller.g.dart';

/// The persistence port. main() overrides it with the opened store before
/// runApp, so reads are synchronous; tests override it with a fake.
@Riverpod(keepAlive: true)
ThemePreferenceStore themePreferenceStore(Ref ref) => throw StateError(
  'themePreferenceStoreProvider has no store: override it in main() '
  'or in the test ProviderScope.',
);

/// Current theme choice. Widgets read it and call [select]; they never touch
/// the store directly.
@Riverpod(keepAlive: true)
class ThemePreferenceController extends _$ThemePreferenceController {
  @override
  ThemePreference build() => ref.watch(themePreferenceStoreProvider).read();

  /// Applies [preference] at once and persists it. If persisting fails the
  /// previous choice is restored and the error is rethrown for the caller
  /// to report.
  Future<void> select(ThemePreference preference) async {
    final ThemePreference previous = state;
    state = preference;
    try {
      await ref.read(themePreferenceStoreProvider).write(preference);
    } catch (_) {
      if (ref.mounted) state = previous;
      rethrow;
    }
  }
}

/// Maps the domain choice onto Flutter's [ThemeMode].
extension ThemePreferenceThemeMode on ThemePreference {
  ThemeMode get themeMode => switch (this) {
    ThemePreference.system => ThemeMode.system,
    ThemePreference.light => ThemeMode.light,
    ThemePreference.dark => ThemeMode.dark,
  };
}
