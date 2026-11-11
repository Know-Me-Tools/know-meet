// TJ-ARCH-MOB-001 compliant
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NotesScreen } from "../presentation/notes/notes-screen";
import { AppFrame } from "./app-frame";
import { HomePlaceholder, RouteError, RouteNotFound } from "./route-fallbacks";

// Code-based route tree. c09 extends it with the in-scope routes in
// tests/fidelity/oracle/app-state-map.json (paths, hash sub-states).
const rootRoute = createRootRoute({ component: AppFrame });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePlaceholder,
});

/** Generator baseline notes demo (PEM + BFF/Tauri adapters), kept off the home route. */
const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "notes",
  component: NotesScreen,
});

const routeTree = rootRoute.addChildren([homeRoute, notesRoute]);

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
