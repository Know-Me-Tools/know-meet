// TJ-ARCH-MOB-001 compliant
// meet.html `#ctl-chat`: a panel control. It opens the room sheet on the chat pane
// (aria-controls the sheet, aria-expanded while that pane is open, active tone then)
// and shows the count of messages received while the pane was closed, which is also in
// its name. Scenario contract: km-room-chat-toggle.
import { Ctl } from "../room-control";
import { paneControlId, ROOM_SHEET_ID } from "../room-sheet/room-sheet";
import { chatControlName } from "./chat-copy";

interface ChatControlProps {
  readonly open: boolean;
  readonly unread: number;
  readonly onToggle: () => void;
}

export function ChatControl({ open, unread, onToggle }: ChatControlProps) {
  return (
    <Ctl
      id={paneControlId("chat")}
      icon="chat"
      label="Chat"
      aria-label={chatControlName(unread)}
      tone={open ? "active" : "rest"}
      aria-controls={ROOM_SHEET_ID}
      aria-expanded={open}
      data-testid="km-room-chat-toggle"
      badge={unread}
      onClick={onToggle}
    />
  );
}
