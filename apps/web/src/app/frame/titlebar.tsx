// TJ-ARCH-MOB-001 compliant
// c09 9.2: the Tauri custom titlebar (tauri-custom-titlebar skill). Desktop only:
// the frame mounts it only when isTauri() is true (app-frame.tsx), so the plain web
// build and mobile web get no titlebar; the controls appear once the window API
// has loaded. Drag uses `data-tauri-drag-region`
// AND an explicit startDragging() on left-button mousedown (no dead zones);
// double-click toggles maximise. Fill `bg-2` against the `bg` app bar (Flat 2.0:
// regions separate by fill, no rule). select-none so dragging never selects text.
import type * as React from "react";
import { detectWindowPlatform } from "../../infrastructure/tauri/tauri-window";
import { KmMark } from "./km-icons";
import { useWindowControls } from "./use-window-controls";
import { DesktopWindowControls, MacWindowControls } from "./window-controls";

const INTERACTIVE = "button, a, input, select, textarea, [role='button']";

export function Titlebar() {
  const { controls, maximized } = useWindowControls();

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (controls === null || event.button !== 0) return; // right-click keeps the system menu
    if (event.target instanceof Element && event.target.closest(INTERACTIVE) !== null) return;
    const action = event.detail === 2 ? controls.toggleMaximize : controls.startDragging;
    action().catch((error: unknown) => reportError(error));
  };
  const isMac = (controls?.platform ?? detectWindowPlatform(window)) === "mac";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only window dragging on the title bar (Tauri drag region); keyboard users move and resize the window with the window controls and OS shortcuts.
    <div
      data-testid="km-titlebar"
      data-tauri-drag-region
      onMouseDown={onMouseDown}
      className="sticky top-0 z-(--z-appbar) flex h-(--km-titlebar-h) flex-none items-center bg-bg-2 text-xs font-semibold text-muted-foreground select-none"
    >
      {isMac ? (
        <div className="w-[96px] flex-none">
          {controls === null ? null : (
            <MacWindowControls controls={controls} maximized={maximized} />
          )}
        </div>
      ) : null}
      <div
        data-tauri-drag-region
        className={`flex min-w-0 flex-1 items-center gap-s2 px-s3 ${isMac ? "justify-center" : ""}`}
      >
        <KmMark className="pointer-events-none size-4 flex-none text-foreground" />
        <span className="pointer-events-none truncate">Know Meet</span>
      </div>
      {isMac ? (
        <div aria-hidden="true" className="w-[96px] flex-none" />
      ) : controls === null ? null : (
        <DesktopWindowControls controls={controls} maximized={maximized} />
      )}
    </div>
  );
}
