// TJ-ARCH-MOB-001 compliant
// meet.html `.rsheet`: the room side sheet. A non-modal complementary region that slides
// in from the end edge over the stage (`bg-2` fill, `radius-lg`; Flat 2.0, so no float
// shadow: the fill and, below 1200, the `scrim` over the stage separate it). From 1200
// the stage makes room for it; below 768 it spans the room body's width with only its
// top corners rounded. It stays mounted while closed (hidden from everyone with
// `visibility` and `inert`) so each pane keeps its state (a chat draft) and every panel
// control's aria-controls always points at it. One pane shows at a time: Chat (wc04),
// Settings (wc05). Escape or the pane's close button closes it and focus returns to
// the control that opened it. Motion: `dur-panel` / `ease-out` in, `dur-exit` /
// `ease-in` out, translate only; instant under reduced motion.
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

/** Panes of the room sheet: Chat (wc04) and Settings, the "Audio and video" pane (wc05). */
export type RoomPaneId = "chat" | "settings";

export const ROOM_SHEET_ID = "km-room-sheet";

/** The id of the room bar control that opens a pane (focus returns there on close). */
export function paneControlId(pane: RoomPaneId): string {
  return `km-room-open-${pane}`;
}

/** The id of a pane's h2, which labels the sheet while that pane shows. */
export function paneTitleId(pane: RoomPaneId): string {
  return `km-room-pane-${pane}-title`;
}

/** Which pane the sheet shows, and whether it is open. The pane stays set while closed,
 * so the closing sheet slides out with its content rather than empty. */
export interface RoomSheetState {
  readonly open: boolean;
  readonly pane: RoomPaneId;
}

interface RoomSheetProps {
  readonly state: RoomSheetState;
  readonly onClose: () => void;
  /** One RoomSheetPane per pane id. */
  readonly children: React.ReactNode;
}

const openMotion = "[transition:translate_var(--dur-panel)_var(--ease-out),visibility_0s]";
const closedMotion =
  "[transition:translate_var(--dur-exit)_var(--ease-in),visibility_0s_linear_var(--dur-exit)]";

export function RoomSheet({ state, onClose, children }: RoomSheetProps) {
  const { open } = state;
  return (
    <aside
      id={ROOM_SHEET_ID}
      aria-labelledby={paneTitleId(state.pane)}
      inert={open ? undefined : true}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        "absolute top-0 right-s5 bottom-s4 z-(--z-room-sheet) grid w-rs-w min-h-0 grid-rows-[minmax(0,1fr)] rounded-lg bg-bg-2 text-foreground",
        "max-bp768:inset-x-0 max-bp768:bottom-0 max-bp768:w-auto max-bp768:rounded-b-none",
        "motion-reduce:transition-none",
        open
          ? cn("visible translate-x-0", openMotion)
          : cn("invisible translate-x-[calc(100%+48px)]", closedMotion),
      )}
    >
      {children}
    </aside>
  );
}

/** meet.html `.room-body::after`: below 1200 the stage dims behind the open sheet. */
export function RoomSheetScrim({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      aria-hidden="true"
      onClick={onClose}
      className="absolute inset-0 z-(--z-room-scrim) bg-scrim bp1200:hidden"
    />
  );
}
