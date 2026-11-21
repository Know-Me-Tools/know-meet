import type { ParticipantIdentity } from "../meeting/participant.ts";

/**
 * Recording consent (PRODUCT.md principle 4, contract decision D2). Any participant may ask
 * to record the meeting into their own browser. Recording starts only when every present
 * participant agreed, everyone sees an indicator while it runs, and a late joiner who
 * declines stops it for everyone; what was already written is kept.
 *
 * This file holds the states and the wire messages. The rules are in
 * `consent-transitions.ts`. See docs/adr/0002-conferencing-ports-and-recording-consent.md.
 */

/** Opaque id of one recording request; it also names the recording that follows. */
export type RecordingRequestId = string & { readonly __brand: "RecordingRequestId" };

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Accepts 8 to 64 URL-safe characters (a UUID fits); anything else returns null. */
export function parseRecordingRequestId(value: unknown): RecordingRequestId | null {
  if (typeof value !== "string" || !REQUEST_ID_PATTERN.test(value)) return null;
  return value as RecordingRequestId;
}

export type ConsentAnswer = "agreed" | "declined";

/** `person`: the participant said no. `busy`: their client is already in another request. */
export type DeclineReason = "person" | "busy";

/** `declined`: someone said no. `cancelled`: the requester withdrew before it started. */
export type WithdrawReason = "declined" | "cancelled";

/** Why a running recording stopped, as the recorder announces it. */
export type RecordingStopReason =
  | "recorder-stopped"
  | "participant-declined"
  | "recorder-failed"
  | "consent-error";

/** Every way a recording can end for this client, including ones nobody announced. */
export type RecordingEndReason = RecordingStopReason | "recorder-left" | "disconnected";

/**
 * Messages on the room's reserved consent topic. The sender is never part of the payload;
 * the transport supplies it (`ConsentEnvelope.from`), so a client cannot answer for another.
 *
 * - `record-request` asks for consent. `phase: "running"` goes to a late joiner and means a
 *   recording is already under way: show the indicator and the prompt (D2).
 * - `record-answer` goes only to the requester or recorder.
 * - `record-withdrawn` ends a request that never started.
 * - `record-started` and `record-stopped` drive everyone's indicator.
 */
export type ConsentMessage =
  | {
      readonly type: "record-request";
      readonly requestId: RecordingRequestId;
      readonly phase: "asking" | "running";
    }
  | {
      readonly type: "record-answer";
      readonly requestId: RecordingRequestId;
      readonly answer: "agreed";
    }
  | {
      readonly type: "record-answer";
      readonly requestId: RecordingRequestId;
      readonly answer: "declined";
      readonly reason: DeclineReason;
    }
  | {
      readonly type: "record-withdrawn";
      readonly requestId: RecordingRequestId;
      readonly reason: WithdrawReason;
    }
  | { readonly type: "record-started"; readonly requestId: RecordingRequestId }
  | {
      readonly type: "record-stopped";
      readonly requestId: RecordingRequestId;
      readonly reason: RecordingStopReason;
    };

/** A consent message with the sender the transport reported. */
export interface ConsentEnvelope {
  readonly from: ParticipantIdentity;
  readonly message: ConsentMessage;
}

/** Shown once to this participant until dismissed or replaced. Copy lives in presentation. */
export type ConsentNotice =
  | { readonly kind: "declined"; readonly by: ParticipantIdentity; readonly reason: DeclineReason }
  | { readonly kind: "request-not-sent" }
  | { readonly kind: "recorder-failed" }
  | { readonly kind: "recording-stopped"; readonly reason: RecordingEndReason };

/** This participant's answer to a recording that is already running elsewhere. */
export type LocalConsent = "asked" | "agreed" | "declined";

/**
 * The recording situation as this client sees it.
 *
 * - `idle`: nothing asked or recording.
 * - `requesting`: this participant asked; `awaiting` have not answered, `agreed` said yes.
 * - `prompted`: another participant asked; `answer` is null until this one answers.
 * - `local-starting`: everyone agreed; the indicator was announced and the recorder is
 *   starting.
 * - `local-recording`: this browser records. `pending` are late joiners not yet answered.
 * - `remote-recording`: another participant's browser records.
 */
export type RecordingConsentState =
  | { readonly status: "idle"; readonly notice: ConsentNotice | null }
  | {
      readonly status: "requesting";
      readonly requestId: RecordingRequestId;
      readonly awaiting: readonly ParticipantIdentity[];
      readonly agreed: readonly ParticipantIdentity[];
    }
  | {
      readonly status: "prompted";
      readonly requestId: RecordingRequestId;
      readonly requester: ParticipantIdentity;
      readonly answer: "agreed" | null;
    }
  | {
      readonly status: "local-starting" | "local-recording";
      readonly requestId: RecordingRequestId;
      readonly consented: readonly ParticipantIdentity[];
      readonly pending: readonly ParticipantIdentity[];
    }
  | {
      readonly status: "remote-recording";
      readonly requestId: RecordingRequestId;
      readonly recorder: ParticipantIdentity;
      readonly localConsent: LocalConsent;
    };

export const CONSENT_IDLE: RecordingConsentState = { status: "idle", notice: null };

/** True while a recording runs or is starting anywhere in the room: show the indicator. */
export function isRecordingIndicatorOn(state: RecordingConsentState): boolean {
  return (
    state.status === "local-starting" ||
    state.status === "local-recording" ||
    state.status === "remote-recording"
  );
}

/** The question this participant must answer now, or null when there is none. */
export interface ConsentPrompt {
  readonly requestId: RecordingRequestId;
  readonly requester: ParticipantIdentity;
  /** True when the recording is already running (late joiner, D2). */
  readonly running: boolean;
}

export function consentPrompt(state: RecordingConsentState): ConsentPrompt | null {
  if (state.status === "prompted" && state.answer === null) {
    return { requestId: state.requestId, requester: state.requester, running: false };
  }
  if (state.status === "remote-recording" && state.localConsent === "asked") {
    return { requestId: state.requestId, requester: state.recorder, running: true };
  }
  return null;
}

// ---- Wire codec -------------------------------------------------------------------------

/** Bumped on any incompatible change; a client drops messages of another version. */
export const CONSENT_PROTOCOL_VERSION = 1;

/** Longest accepted encoded message. Real messages are well under 200 characters. */
const MAX_ENCODED_LENGTH = 1024;

const STOP_REASONS: readonly RecordingStopReason[] = [
  "recorder-stopped",
  "participant-declined",
  "recorder-failed",
  "consent-error",
];

/** JSON text for the transport. The Flutter client must produce the same shape. */
export function encodeConsentMessage(message: ConsentMessage): string {
  return JSON.stringify({ v: CONSENT_PROTOCOL_VERSION, ...message });
}

/**
 * Parses text received on the consent topic. Returns null for anything malformed, too
 * long or of another version. A dropped answer counts as no answer, so a bad message can
 * delay a recording but never start one.
 */
export function decodeConsentMessage(text: string): ConsentMessage | null {
  if (text.length > MAX_ENCODED_LENGTH) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const fields = value as Readonly<Record<string, unknown>>;
  if (fields["v"] !== CONSENT_PROTOCOL_VERSION) return null;
  const requestId = parseRecordingRequestId(fields["requestId"]);
  if (requestId === null) return null;
  return decodeFields(fields, requestId);
}

function decodeFields(
  fields: Readonly<Record<string, unknown>>,
  requestId: RecordingRequestId,
): ConsentMessage | null {
  switch (fields["type"]) {
    case "record-request": {
      const phase = fields["phase"];
      if (phase !== "asking" && phase !== "running") return null;
      return { type: "record-request", requestId, phase };
    }
    case "record-answer":
      return decodeAnswer(fields, requestId);
    case "record-withdrawn": {
      const reason = fields["reason"];
      if (reason !== "declined" && reason !== "cancelled") return null;
      return { type: "record-withdrawn", requestId, reason };
    }
    case "record-started":
      return { type: "record-started", requestId };
    case "record-stopped": {
      const reason = STOP_REASONS.find((known) => known === fields["reason"]);
      if (reason === undefined) return null;
      return { type: "record-stopped", requestId, reason };
    }
    default:
      return null;
  }
}

function decodeAnswer(
  fields: Readonly<Record<string, unknown>>,
  requestId: RecordingRequestId,
): ConsentMessage | null {
  if (fields["answer"] === "agreed") return { type: "record-answer", requestId, answer: "agreed" };
  if (fields["answer"] !== "declined") return null;
  const reason = fields["reason"];
  if (reason !== "person" && reason !== "busy") return null;
  return { type: "record-answer", requestId, answer: "declined", reason };
}
