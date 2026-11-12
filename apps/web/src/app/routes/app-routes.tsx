// TJ-ARCH-MOB-001 compliant
// c11 app routes: dashboard, agents, recordings, settings and the meeting-room
// layout. The screens read the static session through the presentation
// SessionContext (provided in app-root); the room gets the frame's theme toggle as
// a slot so presentation never imports app code.
import { AgentsScreen } from "../../presentation/agents/presentation/agents-screen";
import { DashboardScreen } from "../../presentation/dashboard/presentation/dashboard-screen";
import { MeetingRoomScreen } from "../../presentation/meeting-room/presentation/meeting-room-screen";
import { RecordingsScreen } from "../../presentation/recordings/presentation/recordings-screen";
import { SettingsScreen } from "../../presentation/settings/presentation/settings-screen";
import { ThemeToggle } from "../frame/theme-toggle";

export function DashboardRoute() {
  return <DashboardScreen />;
}

export function AgentsRoute() {
  return <AgentsScreen />;
}

export function RecordingsRoute() {
  return <RecordingsScreen />;
}

export function SettingsRoute() {
  return <SettingsScreen />;
}

export function MeetRoute() {
  return <MeetingRoomScreen themeControl={<ThemeToggle />} />;
}
