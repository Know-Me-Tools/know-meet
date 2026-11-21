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
  type RecordingBusy,
  type RecordingConsentState,
  type RecordingRequestId,
  type Result,
  transitionConsent,
} from "@know-meet/domain";
import type { RealtimeRoom, RoomSnapshot } from "../meeting/ports.ts";
import type { LocalRecorder } from "./ports.ts";

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
 * Every event is handled in order, one at a time, together with the commands it produced,
 * so a decline can never overtake the start it should prevent. A failed send or recorder
 * call is fed back to the rules, which always move away from recording.
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
  let chain: Promise<void> = Promise.resolve();
  let known: ReadonlySet<ParticipantIdentity> = identitiesOf(room.getSnapshot());
  let wasInRoom = isInRoom(room.getSnapshot().connection);
  const listeners = new Set<() => void>();

  const setState = (next: RecordingConsentState): void => {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };

  /** Runs one command; a thrown error counts as a failure, like an error result. */
  const run = async (command: ConsentCommand): Promise<boolean> => {
    try {
      if (command.type === "send") {
        return (await room.sendConsentMessage(command.message, command.to)).ok;
      }
      if (command.type === "start-recorder") return (await recorder.start(command.requestId)).ok;
      return (await recorder.stop()).ok;
    } catch {
      return false;
    }
  };

  const step = async (event: ConsentEvent): Promise<void> => {
    const next = transitionConsent(state, event);
    setState(next.state);
    for (const command of next.commands) {
      if (!(await run(command))) {
        await step({ type: "command-failed", command });
        return;
      }
      if (command.type === "start-recorder") await step({ type: "recorder-started" });
    }
  };

  const dispatch = (event: ConsentEvent): void => {
    chain = chain.then(() => step(event)).catch(() => undefined);
  };

  const onRoomChange = (): void => {
    const snapshot = room.getSnapshot();
    const inRoom = isInRoom(snapshot.connection);
    const current = identitiesOf(snapshot);
    if (wasInRoom && !inRoom) dispatch({ type: "disconnected" });
    if (inRoom) {
      for (const identity of known)
        if (!current.has(identity)) dispatch({ type: "left", identity });
      for (const identity of current)
        if (!known.has(identity)) dispatch({ type: "joined", identity });
    }
    known = current;
    wasInRoom = inRoom;
  };

  const unsubscribeRoom = room.subscribe(onRoomChange);
  const unsubscribeConsent = room.onConsentMessage((envelope) =>
    dispatch({ type: "received", envelope }),
  );
  const unsubscribeRecorder = recorder.onStoppedItself((reason) =>
    dispatch({ type: "recorder-stopped-itself", reason }),
  );

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
      if (snapshot.connection.status !== "connected") return err(meetingErrors.connectionLost());
      if (recorder.support === "unsupported")
        return err(conferencingErrors.recorderFailed("unsupported"));
      if (state.status !== "idle") return err(conferencingErrors.recordingBusy());
      const present = snapshot.remotes.map((remote) => remote.identity);
      dispatch({ type: "request", requestId: ports.newRequestId(), present });
      return ok(undefined);
    },
    answer: (answer) => dispatch({ type: "answer", answer }),
    withdraw: () => dispatch({ type: "withdraw" }),
    stop: () => dispatch({ type: "stop" }),
    dismissNotice: () => dispatch({ type: "dismiss-notice" }),
    settled: () => chain,
    dispose: async () => {
      unsubscribeRoom();
      unsubscribeConsent();
      unsubscribeRecorder();
      dispatch({ type: "disconnected" });
      await chain;
      listeners.clear();
    },
  };
}

function identitiesOf(snapshot: RoomSnapshot): ReadonlySet<ParticipantIdentity> {
  return new Set(snapshot.remotes.map((remote) => remote.identity));
}
