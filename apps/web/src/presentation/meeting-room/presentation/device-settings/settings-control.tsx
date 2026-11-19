// TJ-ARCH-MOB-001 compliant
// The room bar's Settings control (wc05 task 5.2; device-settings shape "Room bar", DS-4):
// a panel control after Chat that opens the room sheet on the "Audio and video" pane.
// aria-controls the sheet, aria-expanded only while that pane is open (active tone then:
// `selected` + `on-selected`). Below 900 the label is visually hidden and stays the name.
// Scenario contract: km-room-settings.
import { Ctl } from "../room-control";
import { paneControlId, ROOM_SHEET_ID } from "../room-sheet/room-sheet";

interface SettingsControlProps {
  readonly open: boolean;
  readonly onToggle: () => void;
}

export function SettingsControl({ open, onToggle }: SettingsControlProps) {
  return (
    <Ctl
      id={paneControlId("settings")}
      icon="settings"
      label="Settings"
      tone={open ? "active" : "rest"}
      aria-controls={ROOM_SHEET_ID}
      aria-expanded={open}
      data-testid="km-room-settings"
      onClick={onToggle}
    />
  );
}
