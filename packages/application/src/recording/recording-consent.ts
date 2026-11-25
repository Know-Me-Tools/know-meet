import {
  CONSENT_IDLE,
  type ConnectionLost,
  type ConsentAnswer,
  type ConsentCommand,
  type ConsentEvent,
  conferencingErrors,
  err,
  isInRoom,
  meetingErrors,
  ok,
  type ParticipantIdentity,
  type RecorderFailed,
  type RecorderFailureReason,
  type RecordingBusy,
  type RecordingConsentState,
  type RecordingRequestId,
  type Result,
  transitionConsent,
} from "@know-meet/domain";
import type { RealtimeRoom, RoomSnapshot } from "../meeting/ports.ts";
import type { LocalRecorder, RecordingCapturePolicy } from "./ports.ts";

export interface RecordingConsentPorts {
  readonly room: RealtimeRoom;
  readonly recorder: LocalRecorder;
  /** A fresh, unique id per request, for example from `crypto.randomUUID()`. */
  readonly newRequestId: () => RecordingRequestId;
}

/**
 * RecordingBusy: a request or recording is already under way. RecorderFailed: this browser
 * cannot record locally. ConnectionLost: not connected.
 */
export type RecordRequestError = RecordingBusy | RecorderFailed | ConnectionLost;

/**
 * The recording consent use cases (WC-8, WC-9, decision D2): request, answer, withdraw and
 * stop, plus the late-joiner prompt and stop-on-decline, driven by the room and the
 * recorder. State is read like the room: `getSnapshot` plus `subscribe`.
 *
 * Consent changes reach live inputs synchronously. The prepared encoder admits live inputs
 * only after the announcement. Room messages stay ordered independently of file finalization.
 */
export interface RecordingConsent {
  getSnapshot(): RecordingConsentState;
  subscribe(listener: () => void): () => void;
  /** Asks every present participant to agree. Nothing records until they all have. */
  request(): Result<void, RecordRequestError>;
  /** Answers the current prompt (`consentPrompt` on the state); ignored when there is none. */
  answer(answer: ConsentAnswer): void;
  /** Withdraws this participant's pending request. */
  withdraw(): void;
  /** Stops this browser's recording and keeps what was written. */
  stop(): void;
  /** Clears the current notice, for example after "declined" was read. */
  dismissNotice(): void;
  /** Resolves once every event so far and its commands are done. */
  settled(): Promise<void>;
  /** Stops listening. A recording in progress is stopped and kept first. */
  dispose(): Promise<void>;
}

export function createRecordingConsent(ports: RecordingConsentPorts): RecordingConsent {
  const { room, recorder } = ports;
  let state: RecordingConsentState = CONSENT_IDLE;
  let sendTail = Promise.resolve();
  let roomGeneration = 0;
  let admissionId = 0;
  let disposed = false;
  let capture: CaptureSession | null = null;
  let lastCaptureId: RecordingRequestId | null = null;
  let known = admissionKeysOf(room.getSnapshot());
  let wasInRoom = isInRoom(room.getSnapshot().connection);
  const listeners = new Set<() => void>();
  const pending = new Set<Promise<void>>();

  const track = (work: Promise<void>): void => {
    pending.add(work);
    void work.finally(() => pending.delete(work));
  };

  const settled = async (): Promise<void> => {
    while (pending.size > 0) await Promise.all([...pending]);
  };

  // The transport captures the room when called. Drop queued sends from a departed room.
  const send = (command: Extract<ConsentCommand, { type: "send" }>): Promise<boolean> => {
    const generation = roomGeneration;
    const result = sendTail.then(async () => {
      if (generation !== roomGeneration || disposed) return false;
      if (command.message.type === "record-started" && capture?.id !== command.message.requestId) {
        return true;
      }
      try {
        return (await room.sendConsentMessage(command.message, command.to)).ok;
      } catch {
        return false;
      }
    });
    sendTail = result.then(() => undefined);
    return result;
  };

  const recorderFailure = (reason: RecorderFailureReason, id?: RecordingRequestId): void => {
    if (disposed) return;
    if (capture && (id === undefined || capture.id === id)) {
      dispatch({ type: "recorder-stopped-itself", reason });
    } else if (state.status === "idle" && id !== undefined && id === lastCaptureId) {
      dispatch({ type: "recorder-stopped-itself", reason });
    }
  };

  const finish = async (id: RecordingRequestId): Promise<void> => {
    try {
      const result = await recorder.stop(id);
      if (!result.ok) recorderFailure(result.error.reason, id);
    } catch {
      recorderFailure("failed", id);
    }
  };

  const prepare = async (session: CaptureSession): Promise<void> => {
    const command = { type: "prepare-recorder", requestId: session.id } as const;
    try {
      const result = await recorder.prepare(session.id, session.policy);
      if (capture !== session) return;
      if (result.ok) dispatch({ type: "recorder-prepared" });
      else dispatch({ type: "command-failed", command, reason: result.error.reason });
    } catch {
      if (capture === session) dispatch({ type: "command-failed", command, reason: "failed" });
    }
  };

  const start = (session: CaptureSession): void => {
    const command = { type: "start-recorder", requestId: session.id } as const;
    try {
      const result = recorder.start(session.id);
      if (capture !== session) return;
      if (result.ok) dispatch({ type: "recorder-started" });
      else dispatch({ type: "command-failed", command, reason: result.error.reason });
    } catch {
      if (capture === session) dispatch({ type: "command-failed", command, reason: "failed" });
    }
  };

  const run = async (commands: readonly ConsentCommand[], owner: CaptureSession | null) => {
    const generation = roomGeneration;
    for (const command of commands) {
      if (command.type === "stop-recorder") {
        if (owner) track(finish(owner.id));
      } else if (command.type === "send") {
        const sent = await send(command);
        if (disposed || generation !== roomGeneration) return;
        if (!sent) {
          if (expectsSendResult(state, command)) dispatch({ type: "command-failed", command });
          return;
        }
      } else if (owner && capture === owner) {
        if (command.type === "prepare-recorder") await prepare(owner);
        else start(owner);
      }
    }
  };

  function dispatch(event: ConsentEvent): void {
    const previous = state;
    const next = transitionConsent(state, event);
    state = next.state;
    const oldCapture = capture;
    if (state.status === "local-starting" || state.status === "local-recording") {
      if (!capture) {
        capture = createCapture(state.requestId, room, () => state);
        lastCaptureId = state.requestId;
      }
    } else {
      capture = null;
      if (state.status !== "idle" || state.notice?.kind === "recorder-failed") lastCaptureId = null;
      oldCapture?.abort();
    }
    if (next.commands.length > 0) track(run(next.commands, capture ?? oldCapture));
    if (state !== previous) {
      capture?.changed();
      for (const listener of listeners) listener();
    }
  }

  const disconnected = (): void => {
    roomGeneration++;
    sendTail = Promise.resolve();
    dispatch({ type: "disconnected" });
    lastCaptureId = null;
  };

  const onRoomChange = (): void => {
    const snapshot = room.getSnapshot();
    const inRoom = isInRoom(snapshot.connection);
    const previous = known;
    known = admissionKeysOf(snapshot);
    const departed = wasInRoom && !inRoom;
    wasInRoom = inRoom;
    if (departed) disconnected();
    if (inRoom) {
      for (const [identity, admissionKey] of known) {
        const replaced = previous.has(identity) && previous.get(identity) !== admissionKey;
        if (replaced && (state.status === "prompted" || state.status === "remote-recording")) {
          dispatch({ type: "left", identity });
        }
        if (replaced || !previous.has(identity)) {
          dispatch({ type: "joined", identity, admissionId: ++admissionId, admissionKey });
        }
      }
      for (const identity of previous.keys()) {
        if (!known.has(identity)) dispatch({ type: "left", identity });
      }
    }
  };

  const unsubscribeRoom = room.subscribe(onRoomChange);
  const unsubscribeConsent = room.onConsentMessage((envelope) => {
    // Reconcile the current admission before accepting an answer, even in a room callback.
    if (envelope.message.type === "record-answer") onRoomChange();
    dispatch({ type: "received", envelope });
  });
  const unsubscribeRecorder = recorder.onStoppedItself(recorderFailure);

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request: () => {
      const snapshot = room.getSnapshot();
      if (disposed || snapshot.connection.status !== "connected") {
        return err(meetingErrors.connectionLost());
      }
      if (recorder.support === "unsupported")
        return err(conferencingErrors.recorderFailed("unsupported"));
      if (state.status !== "idle") return err(conferencingErrors.recordingBusy());
      const present = snapshot.remotes.map((remote) => remote.identity);
      dispatch({
        type: "request",
        requestId: ports.newRequestId(),
        present,
        admissionKeys: admissionKeysOf(snapshot),
      });
      return ok(undefined);
    },
    answer: (answer) => dispatch({ type: "answer", answer }),
    withdraw: () => dispatch({ type: "withdraw" }),
    stop: () => dispatch({ type: "stop" }),
    dismissNotice: () => dispatch({ type: "dismiss-notice" }),
    settled,
    dispose: () => {
      if (!disposed) {
        disposed = true;
        unsubscribeRoom();
        unsubscribeConsent();
        unsubscribeRecorder();
        disconnected();
        listeners.clear();
      }
      return settled();
    },
  };
}

interface CaptureSession {
  readonly id: RecordingRequestId;
  readonly policy: RecordingCapturePolicy;
  abort(): void;
  changed(): void;
}

function createCapture(
  id: RecordingRequestId,
  room: RealtimeRoom,
  current: () => RecordingConsentState,
): CaptureSession {
  const controller = new AbortController();
  const listeners = new Set<() => void>();
  return {
    id,
    policy: {
      signal: controller.signal,
      allows: (identity, admissionKey) => {
        const state = current();
        if (controller.signal.aborted) return false;
        if (state.status !== "local-recording" && state.status !== "local-starting") return false;
        const snapshot = room.getSnapshot();
        if (state.requestId !== id || !isInRoom(snapshot.connection)) return false;
        if (snapshot.local?.identity === identity) return true;
        const remote = snapshot.remotes.find((participant) => participant.identity === identity);
        return (
          remote !== undefined &&
          state.consented.includes(identity) &&
          state.admissions.get(identity)?.admissionKey === remote.admissionKey &&
          (admissionKey === undefined || admissionKey === remote.admissionKey)
        );
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    changed: () => {
      for (const listener of listeners) listener();
    },
    abort: () => {
      controller.abort();
      listeners.clear();
    },
  };
}

function expectsSendResult(
  state: RecordingConsentState,
  { to, message }: Extract<ConsentCommand, { type: "send" }>,
): boolean {
  if (state.status === "idle" || message.requestId !== state.requestId) return false;
  switch (message.type) {
    case "record-request":
      if (state.status !== "requesting") return false;
      return (
        to.kind === "everyone" ||
        (state.awaiting.includes(to.to) &&
          state.admissions.get(to.to)?.admissionId === message.admissionId)
      );
    case "record-answer":
      if (to.kind !== "private") return false;
      if (
        (state.status === "prompted" && state.requester === to.to) ||
        (state.status === "remote-recording" && state.recorder === to.to)
      ) {
        return state.admissionId === message.admissionId;
      }
      return false;
    case "record-started":
      return state.status === "local-starting";
    default:
      return false;
  }
}

function admissionKeysOf(
  snapshot: RoomSnapshot,
): ReadonlyMap<ParticipantIdentity, string | undefined> {
  return new Map(snapshot.remotes.map((remote) => [remote.identity, remote.admissionKey] as const));
}
