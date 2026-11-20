// TJ-ARCH-MOB-001 compliant
import {
  type HistoryRepository,
  type MeetingHistoryRecorder,
  type MeetingUseCases,
  type RealtimeRoom,
  type RecordingStateSource,
  recordMeetingHistory,
} from "@know-meet/application";
import { newMeetingHistoryId } from "./new-history-id";

export interface MeetingHistoryDependencies {
  readonly room: RealtimeRoom;
  readonly history: HistoryRepository;
  /** The recording consent state; wc10 passes it so recordings are linked to the session. */
  readonly recording?: RecordingStateSource;
}

export interface MeetingUseCasesWithHistory extends MeetingUseCases {
  /**
   * Ends the running history session now, as `left`, and waits for its writes. Called
   * by `leave()`; the shell also calls it on `pagehide`, best effort.
   */
  endHistorySession(): Promise<void>;
}

/**
 * Keeps this device's history of each meeting (WC-7) without the screens knowing: after
 * `join` succeeds a recorder starts for that room, and `leave` (or the page closing)
 * ends it. A recorder also ends itself when the room disconnects, so a lost connection
 * is recorded as `connection-lost`. History never changes what `join` or `leave`
 * return: a storage failure only stops history for that session.
 */
export function withMeetingHistory(
  inner: MeetingUseCases,
  dependencies: MeetingHistoryDependencies,
): MeetingUseCasesWithHistory {
  let current: MeetingHistoryRecorder | null = null;

  const endHistorySession = async (): Promise<void> => {
    const recorder = current;
    current = null;
    if (recorder !== null) await recorder.dispose();
  };

  return {
    ...inner,
    endHistorySession,
    join: async (request, signal) => {
      const result = await inner.join(request, signal);
      if (!result.ok) return result;
      void endHistorySession();
      current = recordMeetingHistory(
        {
          room: dependencies.room,
          history: dependencies.history,
          newHistoryId: newMeetingHistoryId,
          now: Date.now,
          onStopped: (reason, detail) =>
            // biome-ignore lint/suspicious/noConsole: WC-7 diagnostic, the only record of why history stopped
            console.error("[know-meet] meeting history stopped", reason, detail),
          ...(dependencies.recording === undefined ? {} : { recording: dependencies.recording }),
        },
        { code: result.value.code },
      );
      return result;
    },
    leave: async () => {
      // End history when Leave is pressed, not after the room has disconnected: the end
      // time must reach storage before the person can reload or close the tab (WC-7).
      const ending = endHistorySession();
      await inner.leave();
      await ending;
    },
  };
}
