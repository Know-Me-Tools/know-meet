import type { ParticipantIdentity } from "../meeting/participant.ts";
import { type ChatAudience, EVERYONE, privateTo } from "./chat-message.ts";
import type { RecorderFailureReason } from "./conferencing-error.ts";
import type {
  ConsentAnswer,
  ConsentEnvelope,
  ConsentMessage,
  ConsentNotice,
  RecordingConsentState,
  RecordingRequestId,
  RecordingStopReason,
} from "./recording-consent.ts";

/**
 * Everything that can move the consent state. `request` to `dismiss-notice` are this
 * participant's actions; `received`, `joined`, `left` and `disconnected` come from the
 * room; `recorder-*` and `command-failed` report how the last commands went.
 */
export type ConsentEvent =
  | {
      readonly type: "request";
      readonly requestId: RecordingRequestId;
      /** The remote participants present now. */
      readonly present: readonly ParticipantIdentity[];
    }
  | { readonly type: "answer"; readonly answer: ConsentAnswer }
  | { readonly type: "withdraw" }
  | { readonly type: "stop" }
  | { readonly type: "dismiss-notice" }
  | { readonly type: "received"; readonly envelope: ConsentEnvelope }
  | { readonly type: "joined"; readonly identity: ParticipantIdentity }
  | { readonly type: "left"; readonly identity: ParticipantIdentity }
  | { readonly type: "disconnected" }
  | { readonly type: "recorder-started" }
  | { readonly type: "recorder-stopped-itself"; readonly reason: RecorderFailureReason }
  | { readonly type: "command-failed"; readonly command: ConsentCommand };

/**
 * Side effects the caller performs, in order, stopping at the first that fails and then
 * reporting `command-failed`. `stop-recorder` finalises and keeps what was written, and
 * does nothing when the recorder is not running.
 */
export type ConsentCommand =
  | { readonly type: "send"; readonly to: ChatAudience; readonly message: ConsentMessage }
  | { readonly type: "start-recorder"; readonly requestId: RecordingRequestId }
  | { readonly type: "stop-recorder" };

export interface ConsentStep {
  readonly state: RecordingConsentState;
  readonly commands: readonly ConsentCommand[];
}

type State<S extends RecordingConsentState["status"]> = Extract<
  RecordingConsentState,
  { status: S }
>;
type LocalRecorderState = State<"local-starting" | "local-recording">;

/**
 * The consent rules as a pure function. The recorder is started only by the command
 * emitted when the last present participant agreed, and only after the `record-started`
 * announcement; any failure on the way leads away from recording, never towards it.
 */
export function transitionConsent(state: RecordingConsentState, event: ConsentEvent): ConsentStep {
  if (event.type === "disconnected") return onDisconnected(state);
  switch (state.status) {
    case "idle":
      return fromIdle(state, event);
    case "requesting":
      return fromRequesting(state, event);
    case "prompted":
      return fromPrompted(state, event);
    case "local-starting":
    case "local-recording":
      return fromLocalRecorder(state, event);
    case "remote-recording":
      return fromRemoteRecording(state, event);
  }
}

// ---- helpers ------------------------------------------------------------------------------

const stay = (state: RecordingConsentState): ConsentStep => ({ state, commands: [] });

const idle = (notice: ConsentNotice | null): RecordingConsentState => ({ status: "idle", notice });

const send = (to: ChatAudience, message: ConsentMessage): ConsentCommand => ({
  type: "send",
  to,
  message,
});

const without = (
  list: readonly ParticipantIdentity[],
  identity: ParticipantIdentity,
): readonly ParticipantIdentity[] => list.filter((entry) => entry !== identity);

const withAdded = (
  list: readonly ParticipantIdentity[],
  identity: ParticipantIdentity,
): readonly ParticipantIdentity[] => (list.includes(identity) ? list : [...list, identity]);

/** Another participant's request while this client is busy: answer "busy" so they stop waiting. */
const declineBusy = (state: RecordingConsentState, envelope: ConsentEnvelope): ConsentStep => ({
  state,
  commands: [
    send(privateTo(envelope.from), {
      type: "record-answer",
      requestId: envelope.message.requestId,
      answer: "declined",
      reason: "busy",
    }),
  ],
});

/** A recording runs that this client never agreed to: show the indicator and ask now (D2). */
const askAboutRunningRecording = (envelope: ConsentEnvelope): RecordingConsentState => ({
  status: "remote-recording",
  requestId: envelope.message.requestId,
  recorder: envelope.from,
  localConsent: "asked",
});

/** Stop capturing first, then tell everyone. */
const stopRecording = (
  requestId: RecordingRequestId,
  reason: RecordingStopReason,
  notice: ConsentNotice | null,
): ConsentStep => ({
  state: idle(notice),
  commands: [
    { type: "stop-recorder" },
    send(EVERYONE, { type: "record-stopped", requestId, reason }),
  ],
});

/** Announce first, so nobody is recorded without an indicator, then start. */
const startRecording = (
  requestId: RecordingRequestId,
  consented: readonly ParticipantIdentity[],
): ConsentStep => ({
  state: { status: "local-starting", requestId, consented, pending: [] },
  commands: [
    send(EVERYONE, { type: "record-started", requestId }),
    { type: "start-recorder", requestId },
  ],
});

function onDisconnected(state: RecordingConsentState): ConsentStep {
  if (state.status === "local-starting" || state.status === "local-recording") {
    return {
      state: idle({ kind: "recording-stopped", reason: "disconnected" }),
      commands: [{ type: "stop-recorder" }],
    };
  }
  if (state.status === "idle") return stay(state);
  return stay(idle(null));
}

// ---- per state ----------------------------------------------------------------------------

function fromIdle(state: State<"idle">, event: ConsentEvent): ConsentStep {
  if (event.type === "dismiss-notice") return stay(state.notice === null ? state : idle(null));
  if (event.type === "request") {
    if (event.present.length === 0) return startRecording(event.requestId, []);
    return {
      state: {
        status: "requesting",
        requestId: event.requestId,
        awaiting: event.present,
        agreed: [],
      },
      commands: [
        send(EVERYONE, { type: "record-request", requestId: event.requestId, phase: "asking" }),
      ],
    };
  }
  if (event.type !== "received") return stay(state);
  const { message } = event.envelope;
  if (message.type === "record-request" && message.phase === "asking") {
    return stay({
      status: "prompted",
      requestId: message.requestId,
      requester: event.envelope.from,
      answer: null,
    });
  }
  if (message.type === "record-request" || message.type === "record-started") {
    return stay(askAboutRunningRecording(event.envelope));
  }
  return stay(state);
}

function fromRequesting(state: State<"requesting">, event: ConsentEvent): ConsentStep {
  const { requestId } = state;
  switch (event.type) {
    case "withdraw":
      return {
        state: idle(null),
        commands: [send(EVERYONE, { type: "record-withdrawn", requestId, reason: "cancelled" })],
      };
    case "joined":
      return {
        state: { ...state, awaiting: withAdded(state.awaiting, event.identity) },
        commands: [
          send(privateTo(event.identity), { type: "record-request", requestId, phase: "asking" }),
        ],
      };
    case "left":
      return startIfEveryoneAgreed({
        ...state,
        awaiting: without(state.awaiting, event.identity),
        agreed: without(state.agreed, event.identity),
      });
    case "command-failed":
      return {
        state: idle({ kind: "request-not-sent" }),
        commands: [send(EVERYONE, { type: "record-withdrawn", requestId, reason: "cancelled" })],
      };
    case "received":
      return requestingReceived(state, event.envelope);
    default:
      return stay(state);
  }
}

function requestingReceived(state: State<"requesting">, envelope: ConsentEnvelope): ConsentStep {
  const { message, from } = envelope;
  if (message.type === "record-request") return declineBusy(state, envelope);
  if (message.type === "record-started") {
    return {
      state: askAboutRunningRecording(envelope),
      commands: [
        send(EVERYONE, {
          type: "record-withdrawn",
          requestId: state.requestId,
          reason: "cancelled",
        }),
      ],
    };
  }
  if (message.type !== "record-answer" || message.requestId !== state.requestId) return stay(state);
  if (!state.awaiting.includes(from)) return stay(state);
  if (message.answer === "declined") {
    return {
      state: idle({ kind: "declined", by: from, reason: message.reason }),
      commands: [
        send(EVERYONE, {
          type: "record-withdrawn",
          requestId: state.requestId,
          reason: "declined",
        }),
      ],
    };
  }
  return startIfEveryoneAgreed({
    ...state,
    awaiting: without(state.awaiting, from),
    agreed: withAdded(state.agreed, from),
  });
}

function startIfEveryoneAgreed(state: State<"requesting">): ConsentStep {
  if (state.awaiting.length > 0) return stay(state);
  return startRecording(state.requestId, state.agreed);
}

function fromPrompted(state: State<"prompted">, event: ConsentEvent): ConsentStep {
  const { requestId, requester } = state;
  switch (event.type) {
    case "answer":
      if (state.answer !== null) return stay(state);
      if (event.answer === "agreed") {
        return {
          state: { ...state, answer: "agreed" },
          commands: [
            send(privateTo(requester), { type: "record-answer", requestId, answer: "agreed" }),
          ],
        };
      }
      return {
        state: idle(null),
        commands: [
          send(privateTo(requester), {
            type: "record-answer",
            requestId,
            answer: "declined",
            reason: "person",
          }),
        ],
      };
    case "left":
      return event.identity === requester ? stay(idle(null)) : stay(state);
    case "command-failed":
      return stay({ ...state, answer: null });
    case "received":
      return promptedReceived(state, event.envelope);
    default:
      return stay(state);
  }
}

function promptedReceived(state: State<"prompted">, envelope: ConsentEnvelope): ConsentStep {
  const { message, from } = envelope;
  const fromRequester = from === state.requester && message.requestId === state.requestId;
  if (fromRequester) {
    if (message.type === "record-withdrawn") return stay(idle(null));
    if (message.type === "record-started") {
      return stay({
        status: "remote-recording",
        requestId: state.requestId,
        recorder: from,
        localConsent: state.answer === "agreed" ? "agreed" : "asked",
      });
    }
    return stay(state);
  }
  if (message.type === "record-request") return declineBusy(state, envelope);
  if (message.type === "record-started") {
    const original: ConsentEnvelope = {
      from: state.requester,
      message: { type: "record-request", requestId: state.requestId, phase: "asking" },
    };
    return declineBusy(askAboutRunningRecording(envelope), original);
  }
  return stay(state);
}

function fromLocalRecorder(state: LocalRecorderState, event: ConsentEvent): ConsentStep {
  const { requestId } = state;
  switch (event.type) {
    case "stop":
      return stopRecording(requestId, "recorder-stopped", null);
    case "joined":
      return {
        state: { ...state, pending: withAdded(state.pending, event.identity) },
        commands: [
          send(privateTo(event.identity), { type: "record-request", requestId, phase: "running" }),
        ],
      };
    case "left":
      return stay({
        ...state,
        consented: without(state.consented, event.identity),
        pending: without(state.pending, event.identity),
      });
    case "recorder-started":
      return state.status === "local-starting"
        ? stay({ ...state, status: "local-recording" })
        : stay(state);
    case "recorder-stopped-itself":
      return {
        state: idle({ kind: "recorder-failed" }),
        commands: [
          send(EVERYONE, { type: "record-stopped", requestId, reason: "recorder-failed" }),
        ],
      };
    case "command-failed":
      // A failed announcement, recorder start or late-joiner prompt: someone may be recorded
      // without knowing. Stop.
      return stopRecording(
        requestId,
        state.status === "local-starting" ? "recorder-failed" : "consent-error",
        { kind: "recorder-failed" },
      );
    case "received":
      return localRecorderReceived(state, event.envelope);
    default:
      return stay(state);
  }
}

function localRecorderReceived(state: LocalRecorderState, envelope: ConsentEnvelope): ConsentStep {
  const { message, from } = envelope;
  if (message.type === "record-request") return declineBusy(state, envelope);
  if (message.type !== "record-answer" || message.requestId !== state.requestId) return stay(state);
  const isParticipant = state.pending.includes(from) || state.consented.includes(from);
  if (!isParticipant) return stay(state);
  if (message.answer === "declined") {
    return stopRecording(state.requestId, "participant-declined", {
      kind: "recording-stopped",
      reason: "participant-declined",
    });
  }
  return stay({
    ...state,
    pending: without(state.pending, from),
    consented: withAdded(state.consented, from),
  });
}

function fromRemoteRecording(state: State<"remote-recording">, event: ConsentEvent): ConsentStep {
  const { requestId, recorder } = state;
  switch (event.type) {
    case "answer": {
      if (state.localConsent !== "asked") return stay(state);
      const message: ConsentMessage =
        event.answer === "agreed"
          ? { type: "record-answer", requestId, answer: "agreed" }
          : { type: "record-answer", requestId, answer: "declined", reason: "person" };
      return {
        state: { ...state, localConsent: event.answer },
        commands: [send(privateTo(recorder), message)],
      };
    }
    case "left":
      return event.identity === recorder
        ? stay(idle({ kind: "recording-stopped", reason: "recorder-left" }))
        : stay(state);
    case "command-failed":
      // The answer did not reach the recorder: ask again rather than pretend it did.
      return stay({ ...state, localConsent: "asked" });
    case "received":
      return remoteRecordingReceived(state, event.envelope);
    default:
      return stay(state);
  }
}

function remoteRecordingReceived(
  state: State<"remote-recording">,
  envelope: ConsentEnvelope,
): ConsentStep {
  const { message, from } = envelope;
  const fromRecorder = from === state.recorder && message.requestId === state.requestId;
  if (fromRecorder) {
    if (message.type === "record-stopped") {
      return stay(idle({ kind: "recording-stopped", reason: message.reason }));
    }
    if (message.type === "record-withdrawn") return stay(idle(null));
    return stay(state);
  }
  if (message.type === "record-request") return declineBusy(state, envelope);
  return stay(state);
}
