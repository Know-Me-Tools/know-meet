// TJ-ARCH-MOB-001 compliant
import type { MeetingUseCases, RealtimeRoom, ThemeStore } from "@know-meet/application";
import { createContext, use } from "react";
import type { SessionSource } from "../infrastructure/session/local-session";
import type { LocalTranscriptServices } from "../presentation/guest-meeting/local-transcript-services";
import type { NotesServices } from "../presentation/notes/notes-services";
import type { WidthClassStore } from "./frame/width-class-store";
import type { HistoryServices } from "./history/history-services";
import type { RecordingsServices } from "./recordings/recordings-services";
import type { RoomRecording } from "./recordings/room-recording";

/**
 * Meetings: `useCases` starts, joins, leaves and mutes; `room` is read through `getSnapshot`
 * and `subscribe` (`useSyncExternalStore`) and bound to media elements with `attachMedia`.
 * `recording` is the consent session of the joined room (WC-8, WC-9); screens read it
 * through `useRoomRecording` in `./recordings/hooks`.
 */
export interface MeetingServices {
  readonly useCases: MeetingUseCases;
  readonly room: RealtimeRoom;
  readonly recording: RoomRecording;
  readonly localTranscript: LocalTranscriptServices | null;
}

/** Everything the composition root wires: use cases and stores, never raw adapters. */
export interface AppServices {
  readonly theme: ThemeStore;
  readonly notes: NotesServices;
  /** Static signed-in state (km-auth); no real auth in this phase. */
  readonly session: SessionSource;
  /** Current adaptive width class (bar / rail / inline) and its morph. */
  readonly layout: WidthClassStore;
  readonly meeting: MeetingServices;
  /** This device's meeting history; screens read it through the hooks in `./history/hooks`. */
  readonly history: HistoryServices;
  /** The recordings kept on this device; screens use the hooks in `./recordings/hooks`. */
  readonly recordings: RecordingsServices;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = use(AppServicesContext);
  if (services === null) throw new Error("AppServicesContext is not provided");
  return services;
}
