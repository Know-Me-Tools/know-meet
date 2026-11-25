import type { ParticipantIdentity } from "../meeting/participant.ts";
import { type ChatAudience, EVERYONE, privateTo } from "./chat-message.ts";
import type { ConsentCommand, ConsentEvent, ConsentStep } from "./consent-transition-types.ts";
import type {
  AdmissionChallenge,
  ConsentEnvelope,
  ConsentMessage,
  ConsentNotice,
  ParticipantAdmissions,
  RecordingConsentState,
  RecordingRequestId,
  RecordingStopReason,
} from "./recording-consent.ts";

export type { ConsentCommand, ConsentEvent, ConsentStep } from "./consent-transition-types.ts";

type State<S extends RecordingConsentState["status"]> = Extract<
  RecordingConsentState,
  { status: S }
>;
type LocalRecorderState = State<"local-starting" | "local-recording">;

/**
 * Prepare the encoder after everyone agrees. Admit live inputs after the successful
 * start announcement.
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

function challenge(admissionId: number | undefined): AdmissionChallenge {
  return admissionId === undefined ? {} : { admissionId };
}

function requestChallenge(message: ConsentMessage): AdmissionChallenge {
  return message.type === "record-request" ? challenge(message.admissionId) : {};
}

function askArrival(
  state: State<"requesting"> | LocalRecorderState,
  { identity, admissionId, admissionKey }: Extract<ConsentEvent, { type: "joined" }>,
): ConsentStep {
  const admissions = new Map(state.admissions).set(identity, { admissionId, admissionKey });
  const next =
    state.status === "requesting"
      ? {
          ...state,
          admissions,
          awaiting: withAdded(state.awaiting, identity),
          agreed: without(state.agreed, identity),
        }
      : {
          ...state,
          admissions,
          pending: withAdded(state.pending, identity),
          consented: without(state.consented, identity),
        };
  return {
    state: next,
    commands: [
      send(privateTo(identity), {
        type: "record-request",
        requestId: state.requestId,
        admissionId,
        phase: state.status === "local-recording" ? "running" : "asking",
      }),
    ],
  };
}

function removeAdmission(
  admissions: ParticipantAdmissions,
  identity: ParticipantIdentity,
): ParticipantAdmissions {
  if (!admissions.has(identity)) return admissions;
  const remaining = new Map(admissions);
  remaining.delete(identity);
  return remaining;
}

/** Another participant's request while this client is busy: answer "busy" so they stop waiting. */
const declineBusy = (state: RecordingConsentState, envelope: ConsentEnvelope): ConsentStep => ({
  state,
  commands: [
    send(privateTo(envelope.from), {
      type: "record-answer",
      requestId: envelope.message.requestId,
      answer: "declined",
      reason: "busy",
      ...requestChallenge(envelope.message),
    }),
  ],
});

/** A recording runs that this client never agreed to: show the indicator and ask now (D2). */
const askAboutRunningRecording = (envelope: ConsentEnvelope): RecordingConsentState => ({
  status: "remote-recording",
  requestId: envelope.message.requestId,
  recorder: envelope.from,
  localConsent: "asked",
  ...requestChallenge(envelope.message),
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

/** Start the encoder without admitting meeting inputs. */
const startRecording = (
  requestId: RecordingRequestId,
  consented: readonly ParticipantIdentity[],
  admissions: ParticipantAdmissions,
): ConsentStep => ({
  state: { status: "local-starting", requestId, consented, pending: [], admissions },
  commands: [{ type: "prepare-recorder", requestId }],
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
  if (event.type === "recorder-stopped-itself") {
    return stay(idle({ kind: "recorder-failed", reason: event.reason }));
  }
  if (event.type === "dismiss-notice") return stay(state.notice === null ? state : idle(null));
  if (event.type === "request") {
    const admissions: ParticipantAdmissions = new Map(
      event.present.map(
        (identity) => [identity, { admissionKey: event.admissionKeys?.get(identity) }] as const,
      ),
    );
    if (event.present.length === 0) return startRecording(event.requestId, [], admissions);
    return {
      state: {
        status: "requesting",
        requestId: event.requestId,
        awaiting: event.present,
        agreed: [],
        admissions,
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
      ...challenge(message.admissionId),
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
      return askArrival(state, event);
    case "left":
      return startIfEveryoneAgreed({
        ...state,
        admissions: removeAdmission(state.admissions, event.identity),
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
  if (
    !state.awaiting.includes(from) ||
    state.admissions.get(from)?.admissionId !== message.admissionId
  ) {
    return stay(state);
  }
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
  return startRecording(state.requestId, state.agreed, state.admissions);
}

function fromPrompted(state: State<"prompted">, event: ConsentEvent): ConsentStep {
  const { requestId, requester, admissionId } = state;
  switch (event.type) {
    case "answer":
      if (state.answer !== null) return stay(state);
      if (event.answer === "agreed") {
        return {
          state: { ...state, answer: "agreed" },
          commands: [
            send(privateTo(requester), {
              type: "record-answer",
              requestId,
              answer: "agreed",
              ...challenge(admissionId),
            }),
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
            ...challenge(admissionId),
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
    if (
      message.type === "record-request" &&
      (message.admissionId ?? 0) > (state.admissionId ?? 0)
    ) {
      return message.phase === "running"
        ? stay(askAboutRunningRecording(envelope))
        : stay({ ...state, ...challenge(message.admissionId), answer: null });
    }
    if (message.type === "record-withdrawn") return stay(idle(null));
    if (message.type === "record-stopped") {
      return stay(idle({ kind: "recording-stopped", reason: message.reason }));
    }
    if (message.type === "record-started") {
      return stay({
        status: "remote-recording",
        requestId: state.requestId,
        recorder: from,
        ...challenge(state.admissionId),
        localConsent: state.answer === "agreed" ? "agreed" : "asked",
      });
    }
    return stay(state);
  }
  if (message.type === "record-request") return declineBusy(state, envelope);
  if (message.type === "record-started") {
    const original: ConsentEnvelope = {
      from: state.requester,
      message: {
        type: "record-request",
        requestId: state.requestId,
        phase: "asking",
        ...challenge(state.admissionId),
      },
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
      return askArrival(state, event);
    case "left":
      return stay({
        ...state,
        admissions: removeAdmission(state.admissions, event.identity),
        consented: without(state.consented, event.identity),
        pending: without(state.pending, event.identity),
      });
    case "recorder-prepared":
      return state.status === "local-starting"
        ? {
            state,
            commands: [
              send(EVERYONE, { type: "record-started", requestId }),
              { type: "start-recorder", requestId },
            ],
          }
        : stay(state);
    case "recorder-started":
      return state.status === "local-starting"
        ? stay({ ...state, status: "local-recording" })
        : stay(state);
    case "recorder-stopped-itself":
      return stopRecording(requestId, "recorder-failed", {
        kind: "recorder-failed",
        reason: event.reason,
      });
    case "command-failed":
      if (event.command.type === "send" && event.command.message.type === "record-request") {
        // A missing prompt leaves that arrival excluded while the consented recording continues.
        return stay(state);
      }
      return stopRecording(
        requestId,
        state.status === "local-starting" ? "recorder-failed" : "consent-error",
        event.reason
          ? { kind: "recorder-failed", reason: event.reason }
          : { kind: "recorder-failed" },
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
  if (!isParticipant || state.admissions.get(from)?.admissionId !== message.admissionId)
    return stay(state);
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
        commands: [send(privateTo(recorder), { ...message, ...challenge(state.admissionId) })],
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
    if (
      message.type === "record-request" &&
      (message.admissionId ?? 0) > (state.admissionId ?? 0)
    ) {
      return stay(askAboutRunningRecording(envelope));
    }
    if (message.type === "record-stopped") {
      return stay(idle({ kind: "recording-stopped", reason: message.reason }));
    }
    if (message.type === "record-withdrawn") return stay(idle(null));
    return stay(state);
  }
  if (message.type === "record-request") return declineBusy(state, envelope);
  return stay(state);
}
