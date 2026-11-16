// TJ-ARCH-MOB-001 compliant
// Picks the router for the build. The default build keeps every route (desktop and
// local development); the hosted build serves only home, join and the meeting room.
import { HOSTED_BUILD } from "./build-mode";
import { createDefaultRouter } from "./default-router";
import { createHostedRouter } from "./hosted-router";

/** Typed against the full route set, which is what presentation links to. */
export type AppRouter = ReturnType<typeof createDefaultRouter>;

export function createAppRouter(): AppRouter {
  // The hosted tree is a subset of the registered one: every route it has exists in
  // the full tree with the same path and component, so the cast only drops route
  // types that the hosted tree never matches at runtime.
  return HOSTED_BUILD ? (createHostedRouter() as unknown as AppRouter) : createDefaultRouter();
}

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
