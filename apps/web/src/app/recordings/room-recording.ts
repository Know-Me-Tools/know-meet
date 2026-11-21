// TJ-ARCH-MOB-001 compliant
import {
  createRecordingConsent,
  type LocalRecorder,
  type RealtimeRoom,
  type RecordingConsent,
  type RecordingStateSource,
  type RecordRequestError,
} from "@know-meet/application";
import {
  CONSENT_IDLE,
  type ConsentAnswer,
  err,
  meetingErrors,
  type RecordingConsentState,
  type RecordingRequestId,
  type Result,
  type Support,
} from "@know-meet/domain";

/**
 * Recording consent for the meeting the page is in, as the screens use it. The consent
 * use cases (`createRecordingConsent`) live for one room session; this holds the current
 * one so screens and the history recorder have a stable object to read and call across
 * joins and leaves. Outside a session the state is idle and every action does nothing.
 */
export interface RoomRecording extends RecordingStateSource {
  /** Whether this browser can record locally; hide or explain the request control when not. */
  readonly support: Support;
  /** Starts a consent session for the room just joined. The composition root calls it. */
  begin(): void;
  /** Ends the session: a recording in progress is stopped and kept. Resolves when done. */
  end(): Promise<void>;
  /** Asks everyone present to agree to a recording on this device. */
  request(): Result<void, RecordRequestError>;
  /** Answers the prompt (`consentPrompt(state)`); ignored when there is none. */
  answer(answer: ConsentAnswer): void;
  /** Withdraws this participant's pending request. */
  withdraw(): void;
  /** Stops this device's recording and keeps what was written. */
  stop(): void;
  /** Clears the notice (`state.notice`) once it was read. */
  dismissNotice(): void;
}

export interface RoomRecordingPorts {
  readonly room: RealtimeRoom;
  readonly recorder: LocalRecorder;
  readonly newRequestId: () => RecordingRequestId;
}

export function createRoomRecording(ports: RoomRecordingPorts): RoomRecording {
  let consent: RecordingConsent | null = null;
  let unsubscribe: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = (): void => {
    for (const listener of [...listeners]) listener();
  };

  /** Detaches the current session and returns it so the caller can finish it. */
  const detach = (): RecordingConsent | null => {
    const previous = consent;
    consent = null;
    unsubscribe?.();
    unsubscribe = null;
    return previous;
  };

  return {
    support: ports.recorder.support,
    getSnapshot: (): RecordingConsentState => consent?.getSnapshot() ?? CONSENT_IDLE,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin: () => {
      const previous = detach();
      if (previous !== null) void previous.dispose();
      const next = createRecordingConsent(ports);
      consent = next;
      unsubscribe = next.subscribe(emit);
      emit();
    },
    end: async () => {
      const previous = detach();
      if (previous === null) return;
      emit();
      await previous.dispose();
    },
    request: () => consent?.request() ?? err(meetingErrors.connectionLost()),
    answer: (answer) => consent?.answer(answer),
    withdraw: () => consent?.withdraw(),
    stop: () => consent?.stop(),
    dismissNotice: () => consent?.dismissNotice(),
  };
}
