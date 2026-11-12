// TJ-ARCH-MOB-001 compliant

import { TooltipProvider } from "@know-meet/ui/components/tooltip";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { NotesServicesContext } from "../presentation/notes/notes-services";
import { SessionContext } from "../presentation/shared/session";
import { type AppServices, AppServicesContext } from "./app-services";
import type { createAppRouter } from "./router";

interface AppRootProps {
  readonly services: AppServices;
  readonly router: ReturnType<typeof createAppRouter>;
}

export function AppRoot({ services, router }: AppRootProps) {
  return (
    <StrictMode>
      <AppServicesContext value={services}>
        <NotesServicesContext value={services.notes}>
          <SessionContext value={services.session}>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </SessionContext>
        </NotesServicesContext>
      </AppServicesContext>
    </StrictMode>
  );
}
