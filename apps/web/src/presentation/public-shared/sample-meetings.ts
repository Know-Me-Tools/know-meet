// TJ-ARCH-MOB-001 compliant
// Fictional sample data for the public screens (home next-meeting card, join),
// ported from km.js `buildData()`. Times derive from "now" exactly as the
// prototype does, so the fidelity run (clock frozen at capture time) renders the
// same meetings. Static screens only: nothing is fetched or stored (contract
// exclusion: no real meetings in this phase).

const MINUTE_MS = 60_000;

export type MeetingStatus = "live" | "upcoming" | "ended";

export interface SampleMeeting {
  readonly id: string;
  readonly title: string;
  readonly start: Date;
  readonly durationMin: number;
  readonly host: string;
  readonly invitees: readonly string[];
  readonly record: boolean;
  readonly joinCode: string;
  readonly pin: string;
}

export interface SamplePerson {
  readonly name: string;
  readonly email: string;
  readonly org: string;
  readonly initials: string;
}

export interface DialInNumber {
  readonly region: string;
  readonly number: string;
}

export const SIGNED_IN_SAMPLE_USER = { name: "Jordan Reyes", email: "jordan.reyes@know-me.tools" } as const;

export const SAMPLE_PEOPLE: readonly SamplePerson[] = [
  { name: "Avery Chen", email: "avery.chen@northwind.io", org: "Northwind", initials: "AC" },
  { name: "Marcus Oyelaran", email: "marcus@northwind.io", org: "Northwind", initials: "MO" },
  { name: "Priya Natarajan", email: "priya.n@lumenlabs.co", org: "Lumen Labs", initials: "PN" },
  { name: "Dana Whitfield", email: "dana@lumenlabs.co", org: "Lumen Labs", initials: "DW" },
];

export const DIAL_IN_NUMBERS: readonly DialInNumber[] = [
  { region: "US", number: "+1 (415) 555-0199" },
  { region: "UK", number: "+44 20 7946 0958" },
];

const PIN = "482 913 07";

/** The meeting an invite opens when the URL names none (hosted by Avery Chen). */
export const DEFAULT_INVITE_MEETING_ID = "product-sync";

function atDay(now: Date, dayOffset: number, hours: number, minutes: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hours, minutes, 0, 0);
}

export function buildSampleMeetings(now: Date): readonly SampleMeeting[] {
  const t = now.getTime();
  // Live now: started about 18 minutes ago, rounded down to 5 minutes.
  const liveStart = new Date(Math.floor((t - 18 * MINUTE_MS) / (5 * MINUTE_MS)) * 5 * MINUTE_MS);
  // Later today: about 90 minutes from now on a 15-minute boundary, kept on today.
  let laterStart = new Date(Math.ceil((t + 90 * MINUTE_MS) / (15 * MINUTE_MS)) * 15 * MINUTE_MS);
  if (laterStart.getDate() !== now.getDate()) laterStart = new Date(t + 10 * MINUTE_MS);
  return [
    {
      id: "partner-onboarding",
      title: "Partner onboarding review",
      start: liveStart,
      durationMin: 60,
      host: "Jordan Reyes",
      invitees: ["Avery Chen", "Marcus Oyelaran", "Priya Natarajan"],
      record: true,
      joinCode: "km-4fq-82x",
      pin: PIN,
    },
    {
      id: "cohort-kickoff",
      title: "Cohort 2 kickoff",
      start: laterStart,
      durationMin: 45,
      host: "Jordan Reyes",
      invitees: ["Priya Natarajan", "Dana Whitfield"],
      record: true,
      joinCode: "km-7td-31p",
      pin: PIN,
    },
    {
      id: "product-sync",
      title: "Weekly product sync",
      start: atDay(now, 1, 10, 0),
      durationMin: 30,
      host: "Avery Chen",
      invitees: ["Jordan Reyes", "Marcus Oyelaran"],
      record: false,
      joinCode: "km-2hn-95k",
      pin: PIN,
    },
    {
      id: "pricing-review",
      title: "Pricing review",
      start: atDay(now, 3, 14, 0),
      durationMin: 60,
      host: "Jordan Reyes",
      invitees: ["Avery Chen", "Priya Natarajan", "Dana Whitfield"],
      record: true,
      joinCode: "km-9wc-48m",
      pin: PIN,
    },
  ];
}

export function meetingEnd(meeting: SampleMeeting): Date {
  return new Date(meeting.start.getTime() + meeting.durationMin * MINUTE_MS);
}

export function meetingStatus(meeting: SampleMeeting, now: Date): MeetingStatus {
  const t = now.getTime();
  if (t < meeting.start.getTime()) return "upcoming";
  return t <= meetingEnd(meeting).getTime() ? "live" : "ended";
}

export function findByCode(meetings: readonly SampleMeeting[], code: string): SampleMeeting | null {
  return meetings.find((meeting) => meeting.joinCode === code) ?? null;
}

export function findById(meetings: readonly SampleMeeting[], id: string): SampleMeeting | null {
  return meetings.find((meeting) => meeting.id === id) ?? null;
}

/** km.js `hostOf`: the host as a person (org and email) when known. */
export function hostOf(meeting: SampleMeeting): SamplePerson {
  const person = SAMPLE_PEOPLE.find((candidate) => candidate.name === meeting.host);
  if (person !== undefined) return person;
  if (meeting.host === SIGNED_IN_SAMPLE_USER.name) {
    return { name: meeting.host, email: SIGNED_IN_SAMPLE_USER.email, org: "Northwind", initials: "JR" };
  }
  return { name: meeting.host, email: "", org: "", initials: meeting.host.slice(0, 2).toUpperCase() };
}

/** Home "Your next meeting": the live one first, then the soonest upcoming. */
export function pickNextMeeting(
  meetings: readonly SampleMeeting[],
  now: Date,
): { readonly meeting: SampleMeeting; readonly status: MeetingStatus } | null {
  const open = meetings
    .map((meeting) => ({ meeting, status: meetingStatus(meeting, now) }))
    .filter((entry) => entry.status !== "ended")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return a.meeting.start.getTime() - b.meeting.start.getTime();
    });
  return open[0] ?? null;
}
