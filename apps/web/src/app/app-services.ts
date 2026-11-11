// TJ-ARCH-MOB-001 compliant
import type { ThemeStore } from "@know-meet/application";
import { createContext, use } from "react";
import type { NotesServices } from "../presentation/notes/notes-services";

/** Everything the composition root wires: use cases and stores, never raw adapters. */
export interface AppServices {
  readonly theme: ThemeStore;
  readonly notes: NotesServices;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = use(AppServicesContext);
  if (services === null) throw new Error("AppServicesContext is not provided");
  return services;
}
