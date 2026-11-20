// TJ-ARCH-MOB-001 compliant
// On-screen copy for recording in the room (wc10 task 10.4; WC-8, WC-9, decisions D1,
// D2). Plain and calm (shapes README rule 7): the audience and the place are explicit
// ("only in their browser", "never uploaded"), errors give the cause, then the fix.
// Names come from the room snapshot; an identity no longer in the room reads "Someone".
import type { RecordRequestError } from "@know-meet/application";
import type {
  ConsentNotice,
  DeclineReason,
  ParticipantIdentity,
  RecordingEndReason,
} from "@know-meet/domain";

export const RECORD_COPY = {
  controlRecord: "Record",
  controlRecordName: "Record this meeting",
  controlCancel: "Cancel",
  controlCancelName: "Cancel recording request",
  controlStop: "Stop rec",
  // Same as the visible label (prototype copy), so voice control users can say it (SC 2.5.3).
  controlStopName: "Stop rec",
  unsupported:
    "This browser can't record meetings. Recording works in current Chrome, Edge, Firefox and Safari on a computer.",
  busyPrompted: "Answer the open recording question first.",
  indicator: "Recording",
  indicatorName: "This meeting is being recorded",
  askingTitle: "Asking everyone to agree",
  askingText:
    "Recording starts only when everyone says yes. It's saved only in this browser, never uploaded.",
  cancelRequest: "Cancel request",
  dismiss: "Dismiss",
  promptTitle: "Record this meeting?",
  promptAgree: "Agree to recording",
  promptDecline: "Don't record",
  runningTitle: "This meeting is being recorded",
  runningAgree: "Agree and stay",
  runningDecline: "Decline and stop it",
  startedHere: "You're recording this meeting. It's saved only in this browser.",
  startedElsewhere: "Recording started. Everyone in the meeting sees the recording notice.",
  stopped: "Recording stopped.",
  asked: "Asking everyone to agree to a recording.",
  withdrawn: "Recording request cancelled.",
} as const;

const SOMEONE = "Someone";

export type NameOf = (identity: ParticipantIdentity) => string;

/** Display names by identity, from the participants the room knows now. */
export function namesFrom(
  people: readonly { readonly identity: ParticipantIdentity; readonly displayName: string }[],
): NameOf {
  const names = new Map(people.map((person) => [person.identity, person.displayName] as const));
  return (identity) => {
    const name = names.get(identity)?.trim();
    return name === undefined || name === "" ? SOMEONE : name;
  };
}

/** "Guest B", "Guest B and Guest C", "Guest B and 2 others". */
export function listNames(identities: readonly ParticipantIdentity[], nameOf: NameOf): string {
  const [first, second, ...rest] = identities;
  if (first === undefined) return "";
  if (second === undefined) return nameOf(first);
  if (rest.length === 0) return `${nameOf(first)} and ${nameOf(second)}`;
  return `${nameOf(first)} and ${rest.length + 1} others`;
}

export function promptText(requester: string): string {
  return `${requester} wants to record this meeting in their own browser. The file stays on their device and is never uploaded. Recording starts only if everyone agrees.`;
}

export function runningText(recorder: string): string {
  return `${recorder} is recording this meeting in their own browser. If you decline, the recording stops for everyone; what was recorded before you joined is kept.`;
}

export function waitingText(awaiting: string): string {
  return awaiting === "" ? "Starting…" : `Waiting for ${awaiting}.`;
}

export function lateJoinerText(pending: string): string {
  return `${pending} just joined and is being asked. If they decline, the recording stops and what was recorded is kept.`;
}

export function remoteBusyText(recorder: string): string {
  return `${recorder} is already recording. One recording at a time.`;
}

const DECLINED_BY: Readonly<Record<DeclineReason, (name: string) => string>> = {
  person: (name) => `${name} declined, so nothing was recorded.`,
  busy: (name) =>
    `${name} couldn't answer because another recording question is open for them. Nothing was recorded.`,
};

const STOPPED_BECAUSE: Readonly<Record<RecordingEndReason, string>> = {
  "recorder-stopped": "The recording stopped.",
  "participant-declined":
    "Someone who joined declined, so the recording stopped. What was recorded before is kept.",
  "recorder-failed":
    "The recording stopped because of a recording error. What was recorded before is kept.",
  "consent-error":
    "The recording stopped because consent couldn't be confirmed. What was recorded before is kept.",
  "recorder-left": "The person recording left, so the recording stopped.",
  disconnected:
    "The connection dropped, so the recording stopped. What was recorded before is kept.",
};

export function noticeText(notice: ConsentNotice, nameOf: NameOf): string {
  switch (notice.kind) {
    case "declined":
      return DECLINED_BY[notice.reason](nameOf(notice.by));
    case "request-not-sent":
      return "Your request didn't reach everyone, so nothing was recorded. Check your connection and try again.";
    case "recorder-failed":
      return "This browser couldn't start recording, so nothing was recorded. Try again, or try current Chrome on a computer.";
    case "recording-stopped":
      return STOPPED_BECAUSE[notice.reason];
  }
}

export function requestErrorText(error: RecordRequestError): string {
  switch (error.code) {
    case "recording-busy":
      return "A recording question is already open in this meeting. Wait for it to finish, then try again.";
    case "recorder-failed":
      return RECORD_COPY.unsupported;
    case "connection-lost":
      return "You're not connected. Wait for the connection to come back, then try again.";
  }
}
