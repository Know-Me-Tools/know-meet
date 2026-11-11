// TJ-ARCH-MOB-001 compliant
import 'package:shared_preferences/shared_preferences.dart';

import '../application/theme_preference_store.dart';
import '../domain/theme_preference.dart';

/// [ThemePreferenceStore] on shared_preferences. Uses the cached API so
/// [read] is synchronous after [open] has loaded the one allowed key.
final class SharedPreferencesThemePreferenceStore
    implements ThemePreferenceStore {
  SharedPreferencesThemePreferenceStore._(this._preferences);

  final SharedPreferencesWithCache _preferences;

  static Future<SharedPreferencesThemePreferenceStore> open() async {
    final SharedPreferencesWithCache preferences =
        await SharedPreferencesWithCache.create(
          cacheOptions: const SharedPreferencesWithCacheOptions(
            allowList: <String>{ThemePreference.storageKey},
          ),
        );
    return SharedPreferencesThemePreferenceStore._(preferences);
  }

  @override
  ThemePreference read() => ThemePreference.fromStored(
    _preferences.getString(ThemePreference.storageKey),
  );

  @override
  Future<void> write(ThemePreference preference) {
    final String? value = preference.storedValue;
    if (value == null) {
      return _preferences.remove(ThemePreference.storageKey);
    }
    return _preferences.setString(ThemePreference.storageKey, value);
  }
}
