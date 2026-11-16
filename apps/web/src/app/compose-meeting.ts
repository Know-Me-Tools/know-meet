// TJ-ARCH-MOB-001 compliant
import { createMeetingUseCases } from "@know-meet/application";
import { createHttpTokenIssuer } from "../infrastructure/meeting/http-token-issuer";
import { createLazyRealtimeRoom } from "../infrastructure/meeting/lazy-realtime-room";
import { loadLiveKitRoom } from "../infrastructure/meeting/load-livekit-room";
import type { MeetingServices } from "./app-services";

/** Meetings in both builds: the HTTP token issuer and a room that loads LiveKit on first connect. */
export function composeMeeting(): MeetingServices {
  const room = createLazyRealtimeRoom(loadLiveKitRoom);
  const useCases = createMeetingUseCases({ issuer: createHttpTokenIssuer(), room });
  return { useCases, room };
}
