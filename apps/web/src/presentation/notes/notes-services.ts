// TJ-ARCH-MOB-001 compliant
import type { NoteDraftStore } from "@know-meet/application";
import type { Note } from "@know-meet/domain";
import { createContext, use } from "react";

/** What the notes screen needs from the composition root (injected by apps/web/src/app). */
export interface NotesServices {
  readonly createNote: (title: string) => Promise<Note>;
  readonly draftStore: NoteDraftStore;
}

export const NotesServicesContext = createContext<NotesServices | null>(null);

export function useNotesServices(): NotesServices {
  const services = use(NotesServicesContext);
  if (services === null) throw new Error("NotesServicesContext is not provided");
  return services;
}
