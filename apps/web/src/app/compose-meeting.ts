// TJ-ARCH-MOB-001 compliant
import { createMeetingUseCases } from "@know-meet/application";
import { createHttpTokenIssuer } from "../infrastructure/meeting/http-token-issuer";
import { createLazyRealtimeRoom } from "../infrastructure/meeting/lazy-realtime-room";
import { loadLiveKitRoom } from "../infrastructure/meeting/load-livekit-room";
import type { MeetingServices } from "./app-services";
import type { HistoryServices } from "./history/history-services";
import { withMeetingHistory } from "./history/with-meeting-history";
import { newRecordingRequestId } from "./recordings/new-recording-request-id";
import type { RecordingsServices } from "./recordings/recordings-services";
import { createRoomRecording } from "./recordings/room-recording";
import { withRoomRecording } from "./recordings/with-room-recording";

/**
 * Meetings in both builds: the HTTP token issuer and a room that loads LiveKit on first connect.
 * `backgroundEffects: true` matches the video processor hook `loadLiveKitRoom` passes.
 *
 * Two things follow `join` and `leave` without any screen calling them:
 * - this device's history of the meeting (WC-7), which also links each local recording made
 *   during it (WC-10);
 * - the recording consent session (WC-8, WC-9): one per joined room, with the local
 *   recorder behind it. Screens reach it as `meeting.recording`.
 * The page closing ends both, best effort (the writes may not finish before the tab goes;
 * a recording cut off that way stays in the library as incomplete).
 */
export function composeMeeting(
  history: HistoryServices,
  recordings: RecordingsServices,
): MeetingServices {
  const room = createLazyRealtimeRoom(loadLiveKitRoom, { backgroundEffects: true });
  let roomCode: string | null = null;
  const recording = createRoomRecording({
    room,
    recorder: recordings.createRecorder(room, () => roomCode),
    newRequestId: newRecordingRequestId,
  });
  const withHistory = withMeetingHistory(
    createMeetingUseCases({ issuer: createHttpTokenIssuer(), room }),
    { room, history: history.repository, recording },
  );
  const useCases = withRoomRecording(withHistory, {
    recording,
    setRoomCode: (code) => {
      roomCode = code;
    },
  });
  if (typeof addEventListener === "function") {
    addEventListener("pagehide", () => {
      void recording.end();
      void useCases.endHistorySession();
    });
  }
  return { useCases, room, recording };
}
