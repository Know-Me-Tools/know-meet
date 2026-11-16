// TJ-ARCH-MOB-001 compliant
// The room gets the frame's theme toggle as a slot so presentation never imports app code.
import { MeetingRoomScreen } from "../../presentation/meeting-room/presentation/meeting-room-screen";
import { ThemeToggle } from "../frame/theme-toggle";

export function MeetRoute() {
  return <MeetingRoomScreen themeControl={<ThemeToggle />} />;
}
