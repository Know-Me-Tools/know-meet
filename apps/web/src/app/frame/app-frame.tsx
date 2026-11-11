// TJ-ARCH-MOB-001 compliant
// Root layout (c09 9.1): skip link first, then the Tauri titlebar (desktop only,
// behind isTauri()), then the active layout. Theme is already on <html> before
// first paint (public/theme-init.js) and kept in step by the theme store.
import { Outlet } from "@tanstack/react-router";
import { isTauriRuntime } from "../../infrastructure/platform/platform-adapters";
import { SkipLink } from "./skip-link";
import { Titlebar } from "./titlebar";

export function AppFrame() {
  const tauri = isTauriRuntime();
  return (
    <div className="km-app" data-tauri={tauri ? "" : undefined}>
      <SkipLink />
      {tauri ? <Titlebar /> : null}
      <Outlet />
    </div>
  );
}
