// TJ-ARCH-MOB-001 compliant
// Open, switch and close the room side sheet. A panel control opens its pane, switches
// to it when another pane shows, and closes the sheet when its own pane is already
// open. Closing from inside the sheet (Escape, close button, scrim) returns focus to
// the control that opens the pane (shapes README A-4).
import { useCallback, useState } from "react";
import { paneControlId, ROOM_SHEET_ID, type RoomPaneId, type RoomSheetState } from "./room-sheet";

export interface RoomSheetControls {
  readonly state: RoomSheetState;
  /** True while the sheet is open on this pane. */
  readonly isOpen: (pane: RoomPaneId) => boolean;
  readonly toggle: (pane: RoomPaneId) => void;
  readonly close: () => void;
}

function returnFocusTo(pane: RoomPaneId): void {
  const sheet = document.getElementById(ROOM_SHEET_ID);
  if (sheet === null || !sheet.contains(document.activeElement)) return;
  document.getElementById(paneControlId(pane))?.focus({ preventScroll: true });
}

export function useRoomSheet(initialPane: RoomPaneId): RoomSheetControls {
  const [state, setState] = useState<RoomSheetState>({ open: false, pane: initialPane });

  const close = useCallback(() => {
    returnFocusTo(state.pane);
    setState((previous) => (previous.open ? { ...previous, open: false } : previous));
  }, [state.pane]);

  const toggle = useCallback((pane: RoomPaneId) => {
    setState((previous) =>
      previous.open && previous.pane === pane ? { open: false, pane } : { open: true, pane },
    );
  }, []);

  const isOpen = useCallback((pane: RoomPaneId) => state.open && state.pane === pane, [state]);

  return { state, isOpen, toggle, close };
}
