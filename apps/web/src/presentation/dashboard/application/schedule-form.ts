// TJ-ARCH-MOB-001 compliant
// The schedule form model (dashboard.html `renderSchedule`): defaults for a new or
// edited meeting, submit-time validation with cause-then-fix copy, and the email
// and SMS invite previews. Pure functions of the form values and `now`.
import { formatDate, formatDay, formatMinutes, formatTime } from "../../workspace/application/format";
import type { Workspace } from "../../workspace/domain/workspace";
import type { DashboardMeeting, Invitee, PreRead } from "../domain/dashboard";
import { parseInvitee } from "../domain/invitee-rules";

const MINUTE_MS = 60_000;

export const DURATION_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [15, 30, 45, 60, 90, 120].map(
  (n) => ({ value: String(n), label: formatMinutes(n) }),
);

export type CalendarChoice = "google" | "outlook" | "none";

export interface ScheduleOptions {
  readonly record: boolean;
  readonly transcribe: boolean;
  readonly summary: boolean;
  readonly dial: boolean;
  readonly waiting: boolean;
}

export interface ScheduleValues {
  readonly title: string;
  readonly date: string;
  readonly time: string;
  readonly duration: string;
  readonly tz: string;
  readonly description: string;
  readonly calendar: CalendarChoice;
  readonly agents: readonly string[];
  readonly iris: boolean;
  readonly options: ScheduleOptions;
  readonly invitees: readonly Invitee[];
  readonly files: readonly PreRead[];
  readonly code: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inviteesFromMeeting(meeting: DashboardMeeting, workspace: Workspace): readonly Invitee[] {
  return meeting.invitees.flatMap((name) => {
    const person = workspace.people.find((p) => p.name === name);
    if (person) {
      return [{ key: person.email.toLowerCase(), value: person.email, kind: "email" as const, name: person.name, email: person.email, phone: person.phone }];
    }
    const parsed = parseInvitee(name === workspace.user.name ? workspace.user.email : name, workspace.people);
    return parsed.ok ? [{ ...parsed.invitee, name }] : [];
  });
}

export function initialScheduleValues(
  editing: DashboardMeeting | null,
  workspace: Workspace,
  now: Date,
  localTz: string,
  code: string,
): ScheduleValues {
  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = editing ? new Date(editing.start) : null;
  return {
    title: editing?.title ?? "",
    date: start ? isoDate(start) : isoDate(tomorrow),
    time: start ? hhmm(start) : "10:00",
    duration: String(editing?.durationMin ?? 30),
    tz: editing?.tz ?? localTz,
    description: editing?.description ?? "",
    calendar: editing ? (editing.source === "knowme" ? "none" : editing.source) : "google",
    agents: editing ? editing.agents.filter((a) => a !== "concierge") : ["scribe"],
    iris: editing ? editing.dots.includes("iris") : true,
    options: {
      record: editing ? editing.record : true,
      transcribe: editing ? editing.transcribe : true,
      summary: editing ? editing.sendSummary : true,
      dial: editing ? editing.dialIn !== null : true,
      waiting: editing ? editing.waitingRoom : false,
    },
    invitees: editing ? inviteesFromMeeting(editing, workspace) : [],
    files: editing ? editing.preReads : [],
    code: editing?.joinCode ?? code,
  };
}

export function startOf(values: Pick<ScheduleValues, "date" | "time">): Date | null {
  if (values.date === "" || values.time === "") return null;
  const d = new Date(`${values.date}T${values.time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ScheduleFieldId = "f-title" | "f-date" | "f-time" | "f-invitee";

export interface ScheduleError {
  readonly id: ScheduleFieldId;
  readonly label: string;
  readonly message: string;
}

function dateError(values: ScheduleValues, now: Date): string {
  if (values.date === "") return "Pick a date for the meeting.";
  const day = new Date(`${values.date}T00:00`);
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);
  return day < today ? "That date has passed. Choose today or a later date." : "";
}

function timeError(values: ScheduleValues, now: Date): string {
  if (values.time === "") return "Pick a start time.";
  const start = startOf(values);
  return start !== null && dateError(values, now) === "" && start.getTime() < now.getTime()
    ? "That time has already passed today. Pick a later time, or use Start now for an instant meeting."
    : "";
}

/** Submit-time validation in field order (the order focus follows, F6). */
export function validateSchedule(values: ScheduleValues, pendingInviteeError: string, now: Date): readonly ScheduleError[] {
  const checks: readonly ScheduleError[] = [
    { id: "f-title", label: "Title", message: values.title.trim() ? "" : "Add a title so invitees know what the meeting is about." },
    { id: "f-date", label: "Date", message: dateError(values, now) },
    { id: "f-time", label: "Start time", message: timeError(values, now) },
    {
      id: "f-invitee",
      label: "Invitees",
      message: pendingInviteeError || (values.invitees.length ? "" : "Add at least one invitee by email address or phone number."),
    },
  ];
  return checks.filter((check) => check.message !== "");
}

export interface InvitePreview {
  readonly to: string;
  readonly subject: string;
  readonly intro: string;
  readonly when: string;
  readonly link: string;
  readonly dialIn: string | null;
  readonly agents: string | null;
  readonly description: string;
  readonly notices: string;
  readonly sms: string;
  readonly smsMeta: string;
}

export function buildInvitePreview(values: ScheduleValues, workspace: Workspace, hostName: string, link: string, tzLabel: string): InvitePreview {
  const title = values.title.trim() || "Untitled meeting";
  const start = startOf(values);
  const end = start ? new Date(start.getTime() + Number(values.duration) * MINUTE_MS) : null;
  const when = start && end ? `${formatDate(start)} – ${formatTime(end)}` : "Date and time not set";
  const emails = values.invitees.filter((i) => i.email !== null);
  const first = emails[0];
  const dial = workspace.telnyx.dialIn[0];
  const pin = workspace.meetings[0]?.dialIn.pin ?? "";
  const agentNames = values.agents.map((id) => workspace.agents.find((a) => a.id === id)?.name ?? id);
  if (values.iris) agentNames.push(`Iris (${hostName.split(" ")[0]}’s dot)`);
  const notices: string[] = [];
  if (values.options.record) notices.push("This meeting will be recorded.");
  if (values.options.transcribe) notices.push("Live transcription is on.");
  if (values.options.summary) notices.push("The transcript and summary are sent to participants afterwards.");
  notices.push("No KnowMe account needed to join.");
  const dialLine = dial ? `${dial.number}, PIN ${pin}` : null;
  const sms =
    `${hostName} invited you to "${title}" ${start ? formatDate(start) : ""}.\nJoin: ${link}` +
    (values.options.dial && dial ? `\nDial in: ${dial.number} PIN ${pin}` : "") +
    (values.options.record ? "\nThis meeting is recorded." : "") +
    "\nReply STOP to opt out.";
  const segments = sms.length <= 160 ? 1 : Math.ceil(sms.length / 153);
  const smsCount = values.invitees.filter((i) => i.phone !== null).length;
  return {
    to: `To: ${first?.email ? `${first.email}${emails.length > 1 ? " and others" : ""}` : "email invitees"}`,
    subject: `Invitation: ${title} · ${start ? formatDay(start) : "date to be set"}`,
    intro: `${hostName} invited you to a Know Meet video meeting.`,
    when: `${when} (${tzLabel})`,
    link,
    dialIn: values.options.dial ? dialLine : null,
    agents: agentNames.length ? `Concierge, ${agentNames.join(", ")}` : null,
    description: values.description.trim(),
    notices: notices.join(" "),
    sms,
    smsMeta:
      `${sms.length} characters · ${segments} SMS segment${segments === 1 ? "" : "s"} · from ${workspace.telnyx.smsFrom}` +
      (smsCount ? ` · to ${smsCount}${smsCount === 1 ? " number" : " numbers"}` : " · no phone invitees yet"),
  };
}
