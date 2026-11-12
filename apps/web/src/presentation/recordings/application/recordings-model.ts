// TJ-ARCH-MOB-001 compliant
// Pure view-model helpers for the recordings screens (recordings.html helpers):
// object keys, gateway URLs, flattened transcript, library filter and sort,
// storage usage, delivery rows and the post-meeting pipeline steps.
import type { Agent, Recording, Workspace } from "../../workspace/domain/workspace";
import { findPerson } from "../../workspace/domain/workspace";
import type {
  DeliveryReceipts,
  DeliveryRow,
  LibraryFilter,
  LibrarySort,
  ProcessingStep,
  TranscriptChapter,
  TranscriptSegment,
} from "../domain/recording-details";
import { RECORDING_META, SAMPLE_QUOTA_BYTES } from "./recording-fixtures";

export interface FlatSegment extends TranscriptSegment {
  readonly chapter: number;
}

export interface Chapter {
  readonly title: string;
  readonly t: number;
}

export function objectKey(recording: Recording): string {
  const prefix = `${recording.bucket}/`;
  return recording.path.startsWith(prefix) ? recording.path.slice(prefix.length) : recording.path;
}

export function gatewayUrl(recording: Recording): string {
  return `https://ipfs.io/ipfs/${recording.cid}`;
}

export function agentByName(workspace: Workspace, name: string): Agent | null {
  return workspace.agents.find((agent) => agent.name === name) ?? null;
}

/** Non-Concierge agents of a recording, in order. */
export function recordingAgents(workspace: Workspace, recording: Recording): readonly Agent[] {
  return recording.agents
    .filter((id) => id !== "concierge")
    .flatMap((id) => workspace.agents.filter((agent) => agent.id === id));
}

export function flattenTranscript(chapters: readonly TranscriptChapter[]): readonly FlatSegment[] {
  return chapters.flatMap((chapter, index) =>
    chapter.segments.map((segment) => ({ ...segment, chapter: index })),
  );
}

export function chaptersOf(chapters: readonly TranscriptChapter[]): readonly Chapter[] {
  return chapters.map((chapter) => ({ title: chapter.title, t: chapter.segments[0]?.t ?? 0 }));
}

/** Index of the last segment that starts at or before `t` (-1 before the first). */
export function segmentIndexAt(segments: readonly FlatSegment[], t: number): number {
  let index = -1;
  for (const [i, segment] of segments.entries()) {
    if (segment.t > t) break;
    index = i;
  }
  return index;
}

export function chapterIndexAt(chapters: readonly Chapter[], t: number): number {
  let index = -1;
  for (const [i, chapter] of chapters.entries()) if (chapter.t <= t) index = i;
  return index;
}

export interface LibraryQuery {
  readonly q: string;
  readonly filter: LibraryFilter;
  readonly sort: LibrarySort;
}

export function queryLibrary(recordings: readonly Recording[], query: LibraryQuery): readonly Recording[] {
  const q = query.q.trim().toLowerCase();
  const matches = recordings.filter((recording) => {
    const owner = RECORDING_META[recording.id]?.owner;
    if (query.filter === "mine" && owner !== "mine") return false;
    if (query.filter === "shared" && owner !== "shared") return false;
    if (q === "") return true;
    return `${recording.title} ${recording.participants.join(" ")}`.toLowerCase().includes(q);
  });
  return [...matches].sort((a, b) => {
    if (query.sort === "old") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (query.sort === "long") return b.durationMin - a.durationMin;
    if (query.sort === "title") return a.title.localeCompare(b.title);
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export interface StorageUsage {
  readonly usedBytes: number;
  readonly quotaBytes: number;
  /** Percent of the sample quota, at least 1, one decimal. */
  readonly percent: number;
  readonly ownBucketCount: number;
}

export function storageUsage(recordings: readonly Recording[]): StorageUsage {
  const usedBytes = recordings
    .filter((recording) => recording.storage !== "byo")
    .reduce((sum, recording) => sum + recording.sizeBytes, 0);
  const percent = Math.max(1, Math.round((usedBytes / SAMPLE_QUOTA_BYTES) * 1000) / 10);
  const ownBucketCount = recordings.filter((recording) => recording.storage === "byo").length;
  return { usedBytes, quotaBytes: SAMPLE_QUOTA_BYTES, percent, ownBucketCount };
}

export function deliveryRows(
  workspace: Workspace,
  recording: Recording,
  receipts: DeliveryReceipts,
): readonly DeliveryRow[] {
  return recording.participants.flatMap((name) => {
    const person = findPerson(workspace, name);
    const email = name === workspace.user.name ? workspace.user.email : (person?.email ?? null);
    const status = receipts[name] ?? {};
    const rows: DeliveryRow[] = [];
    if (email !== null) {
      rows.push({ name, channel: "email", label: "Email", destination: email, status: status.email ?? "Delivered" });
    }
    if (person !== null && status.sms !== undefined) {
      rows.push({ name, channel: "sms", label: "SMS link via Telnyx", destination: person.phone, status: status.sms });
    }
    return rows;
  });
}

export function isHeldForReview(recording: Recording, receipts: DeliveryReceipts): boolean {
  return !recording.summarySent && Object.values(receipts).some((r) => r.email === "Held for review");
}

export function processingSteps(recording: Recording): readonly ProcessingStep[] {
  const byo = recording.storage === "byo";
  return [
    { title: "Finalize composite", detail: `LiveKit Egress closes the Room Composite ${recording.format.toUpperCase()}`, durationMs: 1600, doneLabel: "Done" },
    { title: "Upload to S3", detail: byo ? `Writing to your bucket ${recording.bucket}` : "Writing to KnowMe-managed S3-compatible storage", durationMs: 2000, doneLabel: "Done" },
    { title: "Pin to IPFS", detail: byo ? "Pinning through your pinning service" : "Pinning through KnowMe pinning", durationMs: 1600, doneLabel: "Pinned" },
    { title: "Summary", detail: "Generating the summary and action items from the transcript", durationMs: 1800, doneLabel: "Done" },
    { title: "Delivery", detail: "Sending transcript and summary per your delivery settings", durationMs: 1300, doneLabel: recording.summarySent ? "Done" : "Held for review" },
  ];
}
