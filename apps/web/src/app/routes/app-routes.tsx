// TJ-ARCH-MOB-001 compliant
// c11 app routes: dashboard, agents, recordings and settings. The screens read the
// static session through the presentation SessionContext (provided in app-root).
// Only the default build registers them (default-router.tsx); the meeting room is
// in meet-route.tsx because the hosted build serves it.
import { AgentsScreen } from "../../presentation/agents/presentation/agents-screen";
import { DashboardScreen } from "../../presentation/dashboard/presentation/dashboard-screen";
import { RecordingsScreen } from "../../presentation/recordings/presentation/recordings-screen";
import { SettingsScreen } from "../../presentation/settings/presentation/settings-screen";

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
