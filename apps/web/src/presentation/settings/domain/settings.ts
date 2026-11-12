// TJ-ARCH-MOB-001 compliant
// Settings sections and their static value types (settings.html). Config values
// are references only: environment variable NAMES and masked tails, never secrets.
// No framework imports.

export type SettingsSection =
  | "account"
  | "notifications"
  | "livekit"
  | "telnyx-sms"
  | "telnyx-voice"
  | "calendars"
  | "calendar-connect"
  | "storage"
  | "storage-s3"
  | "storage-ipfs"
  | "storage-test-failed"
  | "recording"
  | "delivery"
  | "templates";

/** Sections with a side-navigation entry (sub-pages highlight their parent). */
export type SettingsNavKey = Exclude<SettingsSection, "calendar-connect" | "storage-s3" | "storage-ipfs" | "storage-test-failed">;

export type CalendarProviderKey = "google" | "outlook" | "caldav";
export type S3ProviderKey = "aws" | "r2" | "b2" | "wasabi" | "minio" | "other";
export type PinningMode = "knowme" | "psa" | "kubo";
export type StorageMode = "managed" | "byo";
export type LiveKitMode = "managed" | "own";

/** A staged connection check row (settings.html `.check[data-s]`). */
export type CheckState = "wait" | "run" | "ok" | "fail" | "skip";

export interface CheckStep {
  readonly label: string;
  readonly detail: string;
  /** Text shown before the run starts (default "Waiting"). */
  readonly initial?: string;
  /** Text shown when the step passes (default "Passed"). */
  readonly okText?: string;
  /** Returns cause-then-fix copy when the step fails, or null. */
  readonly fail?: () => string | null;
}

export interface CheckRowState {
  readonly state: CheckState;
  readonly text: string;
  readonly detail: string;
}

export interface CalendarProvider {
  readonly key: CalendarProviderKey;
  readonly name: string;
  /** Short name used in copy ("Google Calendar", "Microsoft 365"). */
  readonly shortName: string;
  readonly mark: string;
  readonly calendars: readonly { readonly id: string; readonly label: string }[];
}

export interface CalendarConnection {
  readonly connected: boolean;
  readonly selected: Readonly<Record<string, boolean>>;
  readonly addLink: boolean;
  readonly window: "14" | "30" | "90";
  readonly user?: string;
  readonly server?: string;
}

export interface S3Provider {
  readonly key: S3ProviderKey;
  readonly name: string;
  readonly endpointHint: string;
  readonly region: string;
}

export interface DialInNumber {
  readonly number: string;
  readonly region: string;
  readonly status: "Active" | "Provisioning";
}

export interface MessageTemplates {
  readonly subject: string;
  readonly intro: string;
  readonly sms: string;
  readonly inviteSubject: string;
  readonly inviteSms: string;
}

export interface SmsStats {
  readonly length: number;
  readonly segments: number;
  readonly limit: number;
  /** True when every character fits the GSM-7 alphabet (160/153 per segment). */
  readonly gsm: boolean;
}
