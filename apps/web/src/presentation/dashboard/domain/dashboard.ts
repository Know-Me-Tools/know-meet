// TJ-ARCH-MOB-001 compliant
// Dashboard (meetings) domain: the hash views of docs/design/prototype/dashboard.html,
// the meeting extras the dashboard shows, and invite deliveries. No framework imports.
import type { Meeting, MeetingStatus } from "../../workspace/domain/workspace";

export type DashboardViewKey = "upcoming" | "schedule" | "meeting" | "invites" | "empty";

const VIEW_KEYS: readonly DashboardViewKey[] = [
  "upcoming",
  "schedule",
  "meeting",
  "invites",
  "empty",
];

/** km.js `route(handlers, 'upcoming')`: unknown views fall back to upcoming. */
export function resolveDashboardView(view: string): DashboardViewKey {
  return VIEW_KEYS.find((key) => key === view) ?? "upcoming";
}

/** Signed-out gate titles per view (dashboard.html GATE_TITLES). */
export const GATE_TITLES: Readonly<Record<DashboardViewKey, string>> = {
  upcoming: "Sign in to see your meetings",
  schedule: "Sign in to schedule a meeting",
  meeting: "Sign in to view this meeting",
  invites: "Sign in to see the invites you sent",
  empty: "Sign in to set up meetings",
};

export const GATE_REASON =
  "Scheduling meetings, connecting Google or Outlook calendars, and sending email or SMS invites need an account. People you invite never do. Prefer to skip it? Start a guest meeting — guests get the Concierge and live transcription that is deleted when the meeting ends.";

export interface PreRead {
  readonly name: string;
  readonly size: number;
}

export type InviteeKind = "email" | "phone";

/** A parsed invitee (email address or phone number, with a contact on file if known). */
export interface Invitee {
  readonly key: string;
  readonly value: string;
  readonly kind: InviteeKind;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
}

/** A meeting as the dashboard shows it: the workspace meeting plus its scheduling options. */
export interface DashboardMeeting extends Omit<Meeting, "dialIn"> {
  readonly dialIn: Meeting["dialIn"] | null;
  readonly tz: string;
  readonly dots: readonly string[];
  readonly description: string;
  readonly preReads: readonly PreRead[];
  readonly transcribe: boolean;
  readonly sendSummary: boolean;
  readonly waitingRoom: boolean;
  readonly cancelled: boolean;
  readonly inviteeContacts?: readonly Invitee[];
}

export type DashboardMeetingStatus = MeetingStatus | "cancelled";

export type MeetingFilter = "all" | "hosting" | "invited";

export const MEETING_FILTERS: readonly { readonly key: MeetingFilter; readonly label: string }[] = [
  { key: "all", label: "All" },
  { key: "hosting", label: "Hosting" },
  { key: "invited", label: "Invited" },
];

export type DeliveryChannel = "email" | "sms" | "calendar";
export type DeliveryStatus = "delivered" | "opened" | "queued" | "sent" | "failed";

export interface Delivery {
  readonly id: string;
  readonly meetingId: string;
  readonly name: string;
  readonly personId: string | null;
  readonly channel: DeliveryChannel;
  readonly to: string | null;
  readonly status: DeliveryStatus;
  /** Human-readable cause (F9: never a raw code). */
  readonly reason: string | null;
  readonly landline: boolean;
  readonly sentAt: string;
  readonly resentAt?: string;
  readonly resolvedByEmail?: boolean;
}

export const LANDLINE_REASON = "Number cannot receive SMS (landline)";

export const CHANNEL_LABEL: Readonly<Record<DeliveryChannel, string>> = {
  email: "Email",
  sms: "SMS",
  calendar: "Calendar",
};

export function isOpenFailure(delivery: Delivery): boolean {
  return delivery.status === "failed" && delivery.resolvedByEmail !== true;
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
