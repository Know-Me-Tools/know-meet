// TJ-ARCH-MOB-001 compliant
// The hosted build's route tree: home, the join lobby and the meeting room, nothing
// else. Every other path, including /dashboard, /agents, /recordings, /settings,
// /notes and /auth, matches no route and renders RouteNotFound. The excluded
// screens are not imported here, so they are not part of the hosted bundle's
// reachable code. Layouts and fallbacks are shared with the default router.
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppFrame } from "./frame/app-frame";
import { FocusedLayout, FramedLayout, RoomLayout } from "./frame/layouts";
import { RouteError, RouteNotFound } from "./route-fallbacks";
import { HomeRoute } from "./routes/home-route";
import { JoinRoute } from "./routes/join-route";
import { MeetRoute } from "./routes/meet-route";

export function createHostedRouter() {
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
  const joinRoute = createRoute({
    getParentRoute: () => focused,
    path: "join",
    component: JoinRoute,
  });
  const meetRoute = createRoute({ getParentRoute: () => room, path: "meet", component: MeetRoute });

  const routeTree = rootRoute.addChildren([
    framed.addChildren([homeRoute]),
    focused.addChildren([joinRoute]),
    room.addChildren([meetRoute]),
  ]);

  return createRouter({
    routeTree,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
  });
}
