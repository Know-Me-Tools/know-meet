import { oppositeTheme, type Theme } from "@know-meet/domain";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { ThemePorts } from "./ports.ts";

export interface ThemeState {
  readonly theme: Theme;
  readonly setTheme: (theme: Theme) => void;
  readonly toggleTheme: () => void;
}

export type ThemeStore = StoreApi<ThemeState>;

/** Saved choice first, then the system preference. Applies the theme on creation. */
export function resolveInitialTheme(ports: ThemePorts): Theme {
  return ports.preference.read() ?? ports.system.current();
}

export function createThemeStore(ports: ThemePorts): ThemeStore {
  const initial = resolveInitialTheme(ports);
  ports.applier.apply(initial);
  return createStore<ThemeState>()((set, get) => ({
    theme: initial,
    setTheme: (theme) => {
      ports.preference.write(theme);
      ports.applier.apply(theme);
      set({ theme });
    },
    toggleTheme: () => get().setTheme(oppositeTheme(get().theme)),
  }));
}
