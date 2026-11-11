// TJ-ARCH-MOB-001 compliant
import '../domain/theme_preference.dart';

/// Port for persisting the theme choice. [read] is synchronous so the first
/// frame already uses the stored theme (no light/dark flash at startup).
abstract interface class ThemePreferenceStore {
  ThemePreference read();

  Future<void> write(ThemePreference preference);
}
