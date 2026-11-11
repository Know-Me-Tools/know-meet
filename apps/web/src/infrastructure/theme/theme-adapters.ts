// TJ-ARCH-MOB-001 compliant
import type { SystemTheme, ThemeApplier, ThemePreference } from "@know-meet/application";
import { parseTheme, type Theme } from "@know-meet/domain";

/** Storage key shared with the prototype and the fidelity oracle (app-state-map.json). */
export const THEME_STORAGE_KEY = "km-meet-theme";

/**
 * localStorage can throw (SecurityError when storage is disabled, QuotaExceededError
 * on write). A failed read means "no saved choice"; a failed write keeps the
 * in-memory theme for this session.
 */
export function createLocalStorageThemePreference(storage: Storage): ThemePreference {
  return {
    read: () => {
      try {
        return parseTheme(storage.getItem(THEME_STORAGE_KEY));
      } catch {
        return null;
      }
    },
    write: (theme: Theme) => {
      try {
        storage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        reportError(error);
      }
    },
  };
}

export function createMediaQuerySystemTheme(view: Window): SystemTheme {
  return {
    current: () => (view.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  };
}

/** Token CSS: dark on :root, light on [data-theme="light"]. */
export function createDocumentThemeApplier(root: HTMLElement): ThemeApplier {
  return {
    apply: (theme: Theme) => {
      root.dataset["theme"] = theme;
    },
  };
}
