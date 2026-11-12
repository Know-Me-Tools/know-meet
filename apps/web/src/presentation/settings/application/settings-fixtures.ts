// TJ-ARCH-MOB-001 compliant
// settings.html DEF and its lookup tables, as static fixtures. Nothing here is a
// secret: credentials are env var NAMES, sample IDs and masked tails only.
import type {
  CalendarConnection,
  CalendarProvider,
  CalendarProviderKey,
  DialInNumber,
  MessageTemplates,
  S3Provider,
  S3ProviderKey,
} from "../domain/settings";

export const TIME_ZONES: readonly string[] = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo",
  "Europe/London", "Europe/Berlin", "Africa/Lagos", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "UTC",
];

export const FALLBACK_TIME_ZONE = "America/Los_Angeles";

export const MEETING_DEFAULTS = { waiting: true, scribe: true, dialin: true, dot: true } as const;

export const NOTIFICATION_DEFAULTS = {
  recReady: true, summary: true, responses: true, digest: false, smsStart: false, smsSummary: true,
} as const;

export const LIVEKIT_REGIONS: readonly (readonly [string, string])[] = [
  ["auto", "Auto (nearest)"], ["us-west", "US West"], ["us-east", "US East"], ["eu-central", "EU Central"],
  ["ap-south", "Asia Pacific (Mumbai)"], ["ap-southeast", "Asia Pacific (Singapore)"],
];

/** Telnyx messaging profiles and their sender numbers (sample). */
export const MESSAGING_PROFILES: Readonly<Record<string, readonly string[]>> = {
  "Know Meet invites": ["+1 (415) 555-0123", "+1 (415) 555-0124"],
  "Support notifications": ["+1 (628) 555-0177"],
};

export const MESSAGING_WEBHOOK = "https://meet.know-me.tools/hooks/telnyx/messaging";

/** Sample LiveKit inbound trunk ID (not a credential). */
export const LIVEKIT_TRUNK_ID = "ST_k9Vb2xTn7pQe";

export const DEFAULT_GREETING = "Welcome to Know Meet. Please enter your meeting PIN, followed by the pound key.";

export const CALENDAR_PROVIDERS: Readonly<Record<CalendarProviderKey, CalendarProvider>> = {
  google: {
    key: "google", name: "Google Calendar", shortName: "Google Calendar", mark: "G",
    calendars: [
      { id: "work", label: "Work" }, { id: "team", label: "Team rituals" },
      { id: "personal", label: "Personal" }, { id: "holidays", label: "Holidays in United States" },
    ],
  },
  outlook: {
    key: "outlook", name: "Microsoft 365 / Outlook", shortName: "Microsoft 365", mark: "M",
    calendars: [
      { id: "calendar", label: "Calendar" }, { id: "partners", label: "Shared — Partnerships" },
      { id: "birthdays", label: "Birthdays" },
    ],
  },
  caldav: {
    key: "caldav", name: "iCloud / CalDAV", shortName: "iCloud", mark: "iC",
    calendars: [{ id: "home", label: "Home" }, { id: "work", label: "Work" }],
  },
};

export const CALENDAR_ORDER: readonly CalendarProviderKey[] = ["google", "outlook", "caldav"];

export const CALENDAR_CONNECTIONS: Readonly<Record<CalendarProviderKey, CalendarConnection>> = {
  google: { connected: true, selected: { work: true, team: true, personal: false }, addLink: true, window: "30" },
  outlook: { connected: true, selected: { calendar: true, partners: true, birthdays: false }, addLink: true, window: "30" },
  caldav: { connected: false, selected: { home: true }, addLink: false, window: "30" },
};

export function isCalendarProvider(value: string | null): value is CalendarProviderKey {
  return value === "google" || value === "outlook" || value === "caldav";
}

export const S3_PROVIDERS: Readonly<Record<S3ProviderKey, S3Provider>> = {
  aws: { key: "aws", name: "Amazon S3", endpointHint: "https://s3.<region>.amazonaws.com", region: "us-east-1" },
  r2: { key: "r2", name: "Cloudflare R2", endpointHint: "https://<account-id>.r2.cloudflarestorage.com", region: "auto" },
  b2: { key: "b2", name: "Backblaze B2", endpointHint: "https://s3.<region>.backblazeb2.com", region: "us-west-004" },
  wasabi: { key: "wasabi", name: "Wasabi", endpointHint: "https://s3.<region>.wasabisys.com", region: "us-east-1" },
  minio: { key: "minio", name: "MinIO", endpointHint: "https://minio.your-domain.com", region: "us-east-1" },
  other: { key: "other", name: "Other S3-compatible", endpointHint: "https://your-endpoint.example.com", region: "" },
};

export const S3_PROVIDER_ORDER: readonly S3ProviderKey[] = ["aws", "r2", "b2", "wasabi", "minio", "other"];

export function isS3Provider(value: string): value is S3ProviderKey {
  return value in S3_PROVIDERS;
}

/** The sample failed storage test (settings.html `vStorageFailed` defaults). */
export const FAILED_STORAGE_TEST = {
  bucket: "missing-bucket",
  provider: "r2",
  endpoint: "https://acme-account.r2.cloudflarestorage.com",
  object: "meet/.knowme-test-mk2q8z.txt",
  pathStyle: true,
} as const satisfies { readonly provider: S3ProviderKey } & Record<string, string | boolean>;

export const PIN_TEST_CID = "bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq";

export const DEFAULT_TEMPLATES: MessageTemplates = {
  subject: "Summary: {meeting}",
  intro: "Thanks for joining. Here is what we covered, the decisions we made, and who owns each next step.",
  sms: "Your summary for {meeting} is ready:",
  inviteSubject: "Invitation: {meeting} · {date}",
  inviteSms: "{host} invited you to {meeting}, {date}.",
};

export const SUMMARY_SHORT_LINK = "meet.know-me.tools/s/7Qx2";

export const SAMPLE_SUMMARY = {
  paragraph:
    "Jordan, Avery and Marcus agreed on a two-phase rollout: sandbox access first, then production once the security review closes.",
  actions: [
    { title: "Issue sandbox credentials", owner: "Jordan Reyes", due: "Oct 19" },
    { title: "Confirm required API scopes", owner: "Marcus Oyelaran", due: "Oct 20" },
    { title: "Schedule the security review", owner: "Avery Chen", due: "Oct 23" },
  ],
} as const;

export function dialInNumbersFrom(dialIn: readonly { readonly number: string; readonly region: string }[]): readonly DialInNumber[] {
  return dialIn.map((n) => ({ number: n.number, region: n.region, status: "Active" }));
}
