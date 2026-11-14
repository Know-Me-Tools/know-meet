// TJ-ARCH-MOB-001 compliant
import type { ThemeStore } from "@know-meet/application";
import { createContext, use } from "react";
import type { SessionSource } from "../infrastructure/session/local-session";
import type { NotesServices } from "../presentation/notes/notes-services";
import type { WidthClassStore } from "./frame/width-class-store";

/** Everything the composition root wires: use cases and stores, never raw adapters. */
export interface AppServices {
  readonly theme: ThemeStore;
  readonly notes: NotesServices;
  /** Static signed-in state (km-auth); no real auth in this phase. */
  readonly session: SessionSource;
  /** Current adaptive width class (bar / rail / inline) and its morph. */
  readonly layout: WidthClassStore;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = use(AppServicesContext);
  if (services === null) throw new Error("AppServicesContext is not provided");
  return services;
}
