// TJ-ARCH-MOB-001 compliant
// Shared sample-workspace types for the c11 screens (dashboard, agents, recordings,
// settings, room). Mirrors km.js `buildData()`; all people, meetings, agents and
// recordings are fictional (PRODUCT.md "Evidence on Hand"). No framework imports.

export type AgentId = "concierge" | "scribe" | "researcher" | "facilitator" | "translator";
export type CalendarSource = "google" | "outlook" | "knowme";
export type MeetingStatus = "live" | "upcoming" | "ended";
export type DotColor = "ember" | "cyan";

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly org: string;
  readonly initials: string;
}

export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly role: string;
  readonly worker: string;
  readonly mono: string;
  readonly system: boolean;
  readonly status: "online" | "offline";
  readonly owner: string;
  readonly desc: string;
}

export interface DialIn {
  readonly number: string;
  readonly pin: string;
}

export interface Meeting {
  readonly id: string;
  readonly title: string;
  /** ISO timestamp. */
  readonly start: string;
  readonly durationMin: number;
  readonly source: CalendarSource;
  readonly host: string;
  readonly invitees: readonly string[];
  readonly dialIn: DialIn;
  readonly agents: readonly AgentId[];
  readonly record: boolean;
  readonly joinCode: string;
}

export interface Recording {
  readonly id: string;
  readonly meetingId: string | null;
  readonly title: string;
  /** Local ISO timestamp without zone (km.js sample data). */
  readonly date: string;
  readonly durationMin: number;
  readonly format: "mp4" | "hls";
  readonly layout: "speaker" | "grid";
  readonly storage: "s3" | "byo";
  readonly bucket: string;
  readonly path: string;
  readonly cid: string;
  readonly sizeBytes: number;
  readonly summarySent: boolean;
  readonly transcriptWords: number;
  readonly participants: readonly string[];
  readonly agents: readonly AgentId[];
}

export interface Dot {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly ownerLabel: string;
  readonly color: DotColor;
}

export interface TelnyxConfig {
  readonly smsFrom: string;
  readonly messagingProfile: string;
  readonly dialIn: readonly { readonly number: string; readonly region: string }[];
  readonly sipTrunk: string;
}

/** Config references only: environment variable NAMES, never values. */
export interface LiveKitConfig {
  readonly url: string;
  readonly keyVar: string;
  readonly secretVar: string;
}

export interface Workspace {
  readonly user: { readonly name: string; readonly email: string };
  readonly people: readonly Person[];
  readonly meetings: readonly Meeting[];
  readonly recordings: readonly Recording[];
  readonly agents: readonly Agent[];
  readonly dots: readonly Dot[];
  readonly livekit: LiveKitConfig;
  readonly telnyx: TelnyxConfig;
}

const MINUTE_MS = 60_000;

/** km.js `meetingStatus`: live / upcoming / ended relative to `now`. */
export function meetingStatus(meeting: Meeting, now: Date): MeetingStatus {
  const start = new Date(meeting.start).getTime();
  const end = start + meeting.durationMin * MINUTE_MS;
  const t = now.getTime();
  if (t < start) return "upcoming";
  return t <= end ? "live" : "ended";
}

export function meetingEnd(meeting: Meeting): Date {
  return new Date(new Date(meeting.start).getTime() + meeting.durationMin * MINUTE_MS);
}

export function findById<T extends { readonly id: string }>(
  list: readonly T[],
  id: string,
): T | null {
  return list.find((item) => item.id === id) ?? null;
}

export function findPerson(workspace: Workspace, nameOrId: string): Person | null {
  return workspace.people.find((p) => p.id === nameOrId || p.name === nameOrId) ?? null;
}
