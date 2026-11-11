// TJ-ARCH-MOB-001 compliant

/// The user's theme choice. [system] means "no stored choice": follow the
/// platform brightness, as the web shell does when `km-meet-theme` is unset.
enum ThemePreference {
  system,
  light,
  dark;

  /// Storage key shared with the web shell's `localStorage` (prototype
  /// `km.js`), so the same name means the same setting on every surface.
  static const String storageKey = 'km-meet-theme';

  /// Reads a stored value. Only `'light'` and `'dark'` are choices; anything
  /// else (missing, empty, unknown) is [system], matching the web shell.
  static ThemePreference fromStored(String? value) => switch (value) {
    'light' => ThemePreference.light,
    'dark' => ThemePreference.dark,
    _ => ThemePreference.system,
  };

  /// The value to store, or null when the key should be removed.
  String? get storedValue => switch (this) {
    ThemePreference.light => 'light',
    ThemePreference.dark => 'dark',
    ThemePreference.system => null,
  };
}
