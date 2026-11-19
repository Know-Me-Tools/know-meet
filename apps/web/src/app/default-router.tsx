// TJ-ARCH-MOB-001 compliant
// c09 9.1 route tree: the in-scope routes of docs/design/screen-inventory/
// route-inventory.json at the paths in tests/fidelity/oracle/app-state-map.json.
// Sub-states are URL hashes (`/dashboard#schedule`), read by the screens (c10/c11).
// This is the default build's router (desktop, local development). The hosted build
// uses hosted-router.tsx and never calls this function. The tree sits inside a
// function so the bundler can drop it, with the screens it imports, from the hosted bundle.
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NotesScreen } from "../presentation/notes/notes-screen";
import { AppFrame } from "./frame/app-frame";
import { FocusedLayout, FramedLayout, RoomLayout } from "./frame/layouts";
import { RouteError, RouteNotFound } from "./route-fallbacks";
import { AgentsRoute, DashboardRoute, RecordingsRoute, SettingsRoute } from "./routes/app-routes";
import { AuthRoute } from "./routes/auth-route";
import { HomeRoute } from "./routes/home-route";
import { JoinRoute } from "./routes/join-route";
import { HistoryRoute } from "./routes/local-routes";
import { MeetRoute } from "./routes/meet-route";

export function createDefaultRouter() {
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
  /**
   * Local meeting history (wc09). Off the five-item nav; registered here so the
   * route types the hosted navigation links to exist in the registered tree.
   */
  const historyRoute = createRoute({
    getParentRoute: () => framed,
    path: "history",
    component: HistoryRoute,
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
      historyRoute,
      settingsRoute,
      notesRoute,
    ]),
    focused.addChildren([authRoute, joinRoute]),
    room.addChildren([meetRoute]),
  ]);

  return createRouter({
    routeTree,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
  });
}
