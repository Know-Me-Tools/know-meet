// TJ-ARCH-MOB-001 compliant
// Recordings feature types (c11 11.3): per-recording metadata, transcript,
// summary and delivery receipts, plus the hash-addressed views of
// docs/design/prototype/recordings.html. All sample content is fictional.
// No framework imports.

export type RecordingTab = "transcript" | "summary" | "delivery" | "storage";
export type RecordingOwnership = "mine" | "shared";
export type LibraryFilter = "all" | "shared" | "mine";
export type LibrarySort = "new" | "old" | "long" | "title";
export type LibraryLayout = "grid" | "list";

/** Delivery receipt states, already in human-readable form (F9: never raw codes). */
export type DeliveryStatus = "Delivered" | "Opened" | "Bounced" | "Held for review" | "Sending…";
export type DeliveryChannel = "email" | "sms";

export interface RecordingMeta {
  readonly owner: RecordingOwnership;
  readonly host: string;
  readonly resolution: string;
  readonly provider: string;
  readonly endpoint: string;
  readonly region: string;
  readonly checksum: string;
  readonly pin: string;
  readonly retention: string;
}

export interface TranscriptSegment {
  /** Seconds from the start of the recording. */
  readonly t: number;
  readonly who: string;
  readonly text: string;
}

export interface TranscriptChapter {
  readonly title: string;
  readonly segments: readonly TranscriptSegment[];
}

export interface ActionItem {
  readonly text: string;
  readonly owner: string;
  readonly due: string;
  readonly done: boolean;
}

export interface RecordingSummary {
  readonly paragraphs: readonly string[];
  readonly decisions: readonly string[];
  readonly actions: readonly ActionItem[];
}

export type DeliveryReceipts = Readonly<
  Record<string, Partial<Readonly<Record<DeliveryChannel, DeliveryStatus>>>>
>;

export interface DeliveryRow {
  readonly name: string;
  readonly channel: DeliveryChannel;
  readonly label: string;
  readonly destination: string;
  readonly status: DeliveryStatus;
}

/** The views of the recordings page, from the URL hash. */
export type RecordingsView =
  | { readonly kind: "library" }
  | { readonly kind: "empty" }
  | { readonly kind: "detail"; readonly id: string; readonly tab: RecordingTab }
  | { readonly kind: "processing"; readonly id: string };

export interface ProcessingStep {
  readonly title: string;
  readonly detail: string;
  /** Simulated duration in ms (prototype timing). */
  readonly durationMs: number;
  /** Label once complete (e.g. "Pinned", "Held for review"). */
  readonly doneLabel: string;
}
