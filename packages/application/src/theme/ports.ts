import type { Theme } from "@know-meet/domain";

/** The user's saved theme choice (web and desktop: localStorage `km-meet-theme`). */
export interface ThemePreference {
  read(): Theme | null;
  write(theme: Theme): void;
}

/** The operating system's colour-scheme preference. */
export interface SystemTheme {
  current(): Theme;
}

/** Makes a theme visible (web: the `data-theme` attribute on the document root). */
export interface ThemeApplier {
  apply(theme: Theme): void;
}

export interface ThemePorts {
  readonly preference: ThemePreference;
  readonly system: SystemTheme;
  readonly applier: ThemeApplier;
}
