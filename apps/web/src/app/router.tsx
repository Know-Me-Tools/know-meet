// TJ-ARCH-MOB-001 compliant
// c09 9.1 route tree: the in-scope routes of docs/design/screen-inventory/
// route-inventory.json at the paths in tests/fidelity/oracle/app-state-map.json.
// Sub-states are URL hashes (`/dashboard#schedule`), read by the screens (c10/c11).
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NotesScreen } from "../presentation/notes/notes-screen";
import { AppFrame } from "./frame/app-frame";
import { FocusedLayout, FramedLayout, RoomLayout } from "./frame/layouts";
import { RouteError, RouteNotFound } from "./route-fallbacks";
import {
  AgentsRoute,
  DashboardRoute,
  MeetRoute,
  RecordingsRoute,
  SettingsRoute,
} from "./routes/app-routes";
import { AuthRoute, HomeRoute, JoinRoute } from "./routes/public-routes";

const rootRoute = createRootRoute({ component: AppFrame });

const framed = createRoute({
  getParentRoute: () => rootRoute,
  id: "framed",
  component: FramedLayout,
});
const focused = createRoute({
  getParentRoute: () => rootRoute,
  id: "focused",
  component: FocusedLayout,
});
const room = createRoute({ getParentRoute: () => rootRoute, id: "room", component: RoomLayout });

const homeRoute = createRoute({ getParentRoute: () => framed, path: "/", component: HomeRoute });
const dashboardRoute = createRoute({
  getParentRoute: () => framed,
  path: "dashboard",
  component: DashboardRoute,
});
const agentsRoute = createRoute({
  getParentRoute: () => framed,
  path: "agents",
  component: AgentsRoute,
});
const recordingsRoute = createRoute({
  getParentRoute: () => framed,
  path: "recordings",
  component: RecordingsRoute,
});
const settingsRoute = createRoute({
  getParentRoute: () => framed,
  path: "settings",
  component: SettingsRoute,
});
/** Generator baseline notes demo (PEM + BFF/Tauri adapters), kept off the nav. */
const notesRoute = createRoute({
  getParentRoute: () => framed,
  path: "notes",
  component: NotesScreen,
});

const authRoute = createRoute({
  getParentRoute: () => focused,
  path: "auth",
  component: AuthRoute,
});
const joinRoute = createRoute({
  getParentRoute: () => focused,
  path: "join",
  component: JoinRoute,
});

const meetRoute = createRoute({ getParentRoute: () => room, path: "meet", component: MeetRoute });

const routeTree = rootRoute.addChildren([
  framed.addChildren([
    homeRoute,
    dashboardRoute,
    agentsRoute,
    recordingsRoute,
    settingsRoute,
    notesRoute,
  ]),
  focused.addChildren([authRoute, joinRoute]),
  room.addChildren([meetRoute]),
]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
