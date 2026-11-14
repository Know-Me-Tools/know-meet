// TJ-ARCH-MOB-001 compliant
// Window controls for the custom titlebar (tauri-custom-titlebar skill). Loaded
// only after isTauri() is true, through a dynamic import, so the plain web build
// never touches the Tauri runtime. getCurrentWindow() is called lazily here, never
// at module scope.
import { isTauriRuntime } from "../platform/platform-adapters";

export type WindowPlatform = "mac" | "other";

export interface WindowControls {
  readonly platform: WindowPlatform;
  readonly minimize: () => Promise<void>;
  readonly toggleMaximize: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly startDragging: () => Promise<void>;
  readonly isMaximized: () => Promise<boolean>;
  /** Resolves to an unsubscribe function. */
  readonly onResized: (listener: () => void) => Promise<() => void>;
}

/** macOS puts window controls on the left (traffic lights); others on the right. */
export function detectWindowPlatform(view: Window): WindowPlatform {
  return /Mac/i.test(view.navigator.userAgent) ? "mac" : "other";
}

export async function loadWindowControls(view: Window): Promise<WindowControls | null> {
  if (!isTauriRuntime()) return null;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  return {
    platform: detectWindowPlatform(view),
    minimize: () => appWindow.minimize(),
    toggleMaximize: () => appWindow.toggleMaximize(),
    close: () => appWindow.close(),
    startDragging: () => appWindow.startDragging(),
    isMaximized: () => appWindow.isMaximized(),
    onResized: (listener) => appWindow.onResized(() => listener()),
  };
}
