// TJ-ARCH-MOB-001 compliant
// Structural app frame only: landmarks and the app-state-map.json test hooks.
// The designed app bar, navigation, account menu and Tauri titlebar are c09.
import { Link, Outlet } from "@tanstack/react-router";
import { useTheme } from "./use-theme";

export function AppFrame() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <>
      <header data-testid="km-appbar">
        <Link to="/">Know Meet</Link>
        <nav data-testid="km-appnav" aria-label="Primary">
          <Link to="/">Home</Link>
        </nav>
        <button
          type="button"
          data-testid="km-theme-toggle"
          aria-label={`Switch to ${next} theme`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
