import {
  conferencingErrors,
  err,
  ok,
  type RecorderFailureReason,
  type RecordingRequestId,
  type Support,
} from "@know-meet/domain";
import type { LocalRecorder } from "../ports.ts";

/** An in-memory LocalRecorder that records nothing and remembers what it was asked. */
export interface FakeLocalRecorder extends LocalRecorder {
  /** The request id while recording, otherwise null. */
  recording(): RecordingRequestId | null;
  /** Every request id passed to a successful `start`, in order. */
  started(): readonly RecordingRequestId[];
  /** How many `stop` calls finalised a running recording. */
  finalised(): number;
  /** Makes the next `start` fail. */
  failNextStart(reason: RecorderFailureReason): void;
  /** Stops as if storage ran out, then tells the listeners. */
  stopItself(reason: RecorderFailureReason): void;
}

export function createFakeLocalRecorder(support: Support = "supported"): FakeLocalRecorder {
  let current: RecordingRequestId | null = null;
  let started: readonly RecordingRequestId[] = [];
  let finalised = 0;
  let nextStartFailure: RecorderFailureReason | null = null;
  const listeners = new Set<(reason: RecorderFailureReason) => void>();

  return {
    support,
    recording: () => current,
    started: () => started,
    finalised: () => finalised,
    failNextStart: (reason) => {
      nextStartFailure = reason;
    },
    stopItself: (reason) => {
      if (current === null) return;
      current = null;
      finalised += 1;
      for (const listener of listeners) listener(reason);
    },
    start: async (requestId) => {
      const failure = nextStartFailure;
      nextStartFailure = null;
      if (failure !== null) return err(conferencingErrors.recorderFailed(failure));
      current = requestId;
      started = [...started, requestId];
      return ok(undefined);
    },
    stop: async () => {
      if (current !== null) finalised += 1;
      current = null;
      return ok(undefined);
    },
    onStoppedItself: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
