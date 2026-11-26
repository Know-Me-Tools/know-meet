// TJ-ARCH-MOB-001 compliant
// What the guest meeting screens need from the composition root. The shape matches
// `AppServices["meeting"]` in apps/web/src/app/app-services.ts structurally, so the app
// provides `services.meeting` here without presentation importing app code (the notes
// screen uses the same pattern with NotesServicesContext).
import type { MeetingUseCases, RealtimeRoom, RoomSnapshot } from "@know-meet/application";
import { createContext, use, useSyncExternalStore } from "react";
import type { LocalTranscriptServices } from "./local-transcript-services";

export interface MeetingServicesView {
  readonly useCases: MeetingUseCases;
  readonly room: RealtimeRoom;
  readonly localTranscript?: LocalTranscriptServices | null;
}

export const MeetingServicesContext = createContext<MeetingServicesView | null>(null);

export function useMeetingServices(): MeetingServicesView {
  const services = use(MeetingServicesContext);
  if (services === null) throw new Error("MeetingServicesContext is not provided");
  return services;
}

/** The room as one immutable snapshot; re-renders only when the adapter publishes a new one. */
export function useRoomSnapshot(room: RealtimeRoom): RoomSnapshot {
  return useSyncExternalStore(room.subscribe, room.getSnapshot, room.getSnapshot);
}
