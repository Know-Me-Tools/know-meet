// TJ-ARCH-MOB-001 compliant
import { useStore } from "zustand";
import { useAppServices } from "./app-services";

export function useTheme() {
  const { theme } = useAppServices();
  const current = useStore(theme, (state) => state.theme);
  const toggleTheme = useStore(theme, (state) => state.toggleTheme);
  return { theme: current, toggleTheme };
}
