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
  unsupported: "Recording is unavailable in this browser. Try Chrome on a computer.",
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
  runningAgree: "Agree to recording",
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

export function runningText(recorder: string, admissionBound: boolean): string {
  const recording = `${recorder} is recording in their browser.`;
  const inclusion = admissionBound ? " The recording includes you only after you agree." : "";
  return `${recording}${inclusion} You can use the meeting while you decide. Declining stops the recording.`;
}

export function waitingText(awaiting: string): string {
  return awaiting === "" ? "Starting…" : `Waiting for ${awaiting}.`;
}

export function lateJoinerText(pending: string): string {
  return `Waiting for consent from ${pending}. They stay out of the recording until they agree. A decline ends the recording.`;
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
      if (notice.reason === "unsupported") return RECORD_COPY.unsupported;
      if (notice.reason === "quota-exceeded") {
        return "Recording stopped because browser storage ran out. Saved material stays on this device. Free up storage before trying again.";
      }
      return "Recording failed. Check Recordings for any playable part, then try again.";
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
