// TJ-ARCH-MOB-001 compliant
// Resolves the Tauri window controls once (null on the plain web) and tracks the
// maximised state so the maximise/restore button names itself correctly.
import { useEffect, useState } from "react";
import { loadWindowControls, type WindowControls } from "../../infrastructure/tauri/tauri-window";

export interface WindowControlsState {
  readonly controls: WindowControls | null;
  readonly maximized: boolean;
}

export function useWindowControls(): WindowControlsState {
  const [controls, setControls] = useState<WindowControls | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    loadWindowControls(window).then(
      (loaded) => {
        if (active) setControls(loaded);
      },
      (error: unknown) => reportError(error),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (controls === null) return;
    let active = true;
    let unlisten: (() => void) | null = null;
    const sync = () => {
      controls.isMaximized().then(
        (value) => {
          if (active) setMaximized(value);
        },
        (error: unknown) => reportError(error),
      );
    };
    sync();
    controls.onResized(sync).then(
      (stop) => {
        if (active) unlisten = stop;
        else stop();
      },
      (error: unknown) => reportError(error),
    );
    return () => {
      active = false;
      unlisten?.();
    };
  }, [controls]);

  return { controls, maximized };
}
