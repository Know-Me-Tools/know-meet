// TJ-ARCH-MOB-001 compliant
// Static dashboard fixtures (no network), ported from dashboard.html: the meeting
// extras (BASE_EXTRA), the base invite deliveries, the calendar accounts and the
// time-zone list. Everything derives from the shared sample workspace.
import { findPerson, type Workspace } from "../../workspace/domain/workspace";
import type { DashboardMeeting, Delivery, DeliveryChannel, DeliveryStatus } from "../domain/dashboard";
import { LANDLINE_REASON } from "../domain/dashboard";

const MINUTE_MS = 60_000;

export const CALENDAR_ACCOUNTS = {
  google: { label: "Google Calendar", account: "jordan.reyes@know-me.tools" },
  outlook: { label: "Outlook", account: "jordan.reyes@outlook.com" },
} as const;

export type CalendarAccountKey = keyof typeof CALENDAR_ACCOUNTS;

const TIME_ZONES: readonly (readonly [string, string])[] = [
  ["America/Los_Angeles", "Pacific Time — Los Angeles"],
  ["America/Denver", "Mountain Time — Denver"],
  ["America/Chicago", "Central Time — Chicago"],
  ["America/New_York", "Eastern Time — New York"],
  ["Europe/London", "London"],
  ["Europe/Berlin", "Central Europe — Berlin"],
  ["Asia/Kolkata", "India — Kolkata"],
  ["Asia/Tokyo", "Tokyo"],
  ["UTC", "UTC"],
];

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The picker list: the local zone first when it is not already listed. */
export function timeZoneOptions(local: string): readonly (readonly [string, string])[] {
  return TIME_ZONES.some(([id]) => id === local) ? TIME_ZONES : [[local, local.replace(/_/g, " ")], ...TIME_ZONES];
}

export function timeZoneLabel(id: string, local: string): string {
  return timeZoneOptions(local).find(([zone]) => zone === id)?.[1] ?? id;
}

interface MeetingExtra {
  readonly dots: readonly string[];
  readonly description: string;
  readonly waitingRoom?: boolean;
  readonly preReads: readonly { readonly name: string; readonly size: number }[];
}

const BASE_EXTRA: Readonly<Record<string, MeetingExtra>> = {
  "partner-onboarding": {
    dots: ["iris"],
    description: "Walk Northwind and Lumen Labs through the partner program and agree on onboarding owners.",
    preReads: [
      { name: "Partner program overview.pdf", size: 1258291 },
      { name: "Onboarding checklist v3.docx", size: 84210 },
    ],
  },
  "cohort-kickoff": {
    dots: ["iris"],
    waitingRoom: true,
    description: "Kick off Cohort 2: introductions, schedule and first deliverables.",
    preReads: [{ name: "Cohort 2 roster.xlsx", size: 40960 }],
  },
  "product-sync": { dots: ["sol", "iris"], description: "Weekly status across roadmap items.", preReads: [] },
  "pricing-review": {
    dots: ["iris"],
    description: "Review the pricing model draft before it goes to partners.",
    preReads: [
      { name: "Pricing model draft.pdf", size: 2306867 },
      { name: "Competitor notes.md", size: 12288 },
    ],
  },
};

/** The workspace meetings with their dashboard defaults and extras. */
export function baseDashboardMeetings(workspace: Workspace, tz: string): readonly DashboardMeeting[] {
  return workspace.meetings.map((meeting) => {
    const extra = BASE_EXTRA[meeting.id];
    return {
      ...meeting,
      tz,
      dots: extra?.dots ?? [],
      description: extra?.description ?? "",
      preReads: extra?.preReads ?? [],
      transcribe: true,
      sendSummary: true,
      waitingRoom: extra?.waitingRoom ?? false,
      cancelled: false,
    };
  });
}

function channelsForBase(source: string, index: number, email: string, phone: string | null, phoneOnly: boolean) {
  const channels: DeliveryChannel[] = [];
  if (!phoneOnly && email !== "") channels.push("email");
  if (phone !== null && (index % 2 === 0 || phoneOnly)) channels.push("sms");
  if (source !== "knowme" && email !== "" && !phoneOnly) channels.push("calendar");
  return channels;
}

/** dashboard.html `buildBaseDeliveries`: invites sent two days before each meeting. */
export function baseDeliveries(workspace: Workspace): readonly Delivery[] {
  const list: Delivery[] = [];
  for (const meeting of workspace.meetings) {
    const sentAt = new Date(new Date(meeting.start).getTime() - 2 * 24 * 60 * MINUTE_MS).toISOString();
    meeting.invitees.forEach((name, index) => {
      const person = findPerson(workspace, name);
      const id = person?.id ?? "self";
      const email = person?.email ?? (name === workspace.user.name ? workspace.user.email : "");
      const phone = person?.phone ?? null;
      const phoneOnly = meeting.id === "pricing-review" && id === "dana";
      for (const channel of channelsForBase(meeting.source, index, email, phone, phoneOnly)) {
        let status: DeliveryStatus = "delivered";
        let reason: string | null = null;
        let landline = false;
        if (channel === "email" && index === 0) status = "opened";
        if (channel === "sms" && meeting.id === "cohort-kickoff") status = "queued";
        if (channel === "sms" && phoneOnly) {
          status = "failed";
          reason = LANDLINE_REASON;
          landline = true;
        }
        list.push({
          id: `${meeting.id}-${id}-${channel}`,
          meetingId: meeting.id,
          name: person?.name ?? name,
          personId: id,
          channel,
          to: channel === "sms" ? phone : email,
          status,
          reason,
          landline,
          sentAt,
        });
      }
    });
  }
  return list;
}

/** dashboard.html `joinUrl`: the invitee join link for a code. */
export function joinUrl(code: string, origin: string): string {
  return `${origin}/join#invite?code=${encodeURIComponent(code)}`;
}

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A fresh join code, `km-xxx-xxx`. */
export function newJoinCode(random: () => number = Math.random): string {
  const part = (n: number) =>
    Array.from({ length: n }, () => CODE_ALPHABET.charAt(Math.floor(random() * CODE_ALPHABET.length))).join("");
  return `km-${part(3)}-${part(3)}`;
}
