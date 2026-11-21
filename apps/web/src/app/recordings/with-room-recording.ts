// TJ-ARCH-MOB-001 compliant
import type { MeetingUseCasesWithHistory } from "../history/with-meeting-history";
import type { RoomRecording } from "./room-recording";

export interface RoomRecordingDependencies {
  readonly recording: RoomRecording;
  /** Told the room code after a join and null after a leave, for the recordings index. */
  readonly setRoomCode: (code: string | null) => void;
}

/**
 * Starts the recording consent session when a meeting is joined and ends it when the
 * meeting is left, so no screen has to (WC-8). Leaving first ends the consent session,
 * which stops a recording running here and tells the others while still connected. It
 * never changes what `join` or `leave` return.
 */
export function withRoomRecording(
  inner: MeetingUseCasesWithHistory,
  dependencies: RoomRecordingDependencies,
): MeetingUseCasesWithHistory {
  const { recording, setRoomCode } = dependencies;
  return {
    ...inner,
    join: async (request, signal) => {
      const result = await inner.join(request, signal);
      if (result.ok) {
        setRoomCode(result.value.code);
        recording.begin();
      }
      return result;
    },
    leave: async () => {
      await recording.end();
      setRoomCode(null);
      await inner.leave();
    },
  };
}
