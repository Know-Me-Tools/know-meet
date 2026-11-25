// TJ-ARCH-MOB-001 compliant
// Display rules for recordings saved in this browser (shape recordings-library.md §4,
// §6, §7, RL-2): titles, dates ("18 Nov 2026 · 14:30", 24-hour), lengths, format names,
// the download filename, sorting and the storage meter band. Pure functions over the
// fields a library row carries; `RecordingFacts` is that shape, so the hooks' rows fit it
// without this file knowing where they come from.
import { formatBytes } from "../../workspace/application/format";

export type RecordingCondition =
  | "recording"
  | "complete"
  | "stopped-early"
  | "incomplete"
  | "unusable"
  | "missing";

export function isPlayableRecording(condition: RecordingCondition): boolean {
  return condition === "complete" || condition === "stopped-early" || condition === "incomplete";
}

export interface RecordingFacts {
  readonly roomCode: string | null;
  readonly meetingTitle: string | null;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly state: RecordingCondition;
}

export type LibrarySort = "new" | "old" | "large";
export type LibraryLayout = "grid" | "list";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "14:30". */
export function clockTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "18 Nov 2026". */
export function calendarDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Meeting 4KQ-9ZD", the history title when there is one, else a plain fallback. */
export function recordingTitle(facts: RecordingFacts): string {
  const title = facts.meetingTitle?.trim();
  if (title !== undefined && title !== "") return title;
  return facts.roomCode === null ? "Meeting recording" : `Meeting ${facts.roomCode}`;
}

/** Recorded length in ms from the start and end the recorder wrote; null when unknown. */
export function recordedMs(facts: RecordingFacts): number | null {
  if (facts.endedAt === null || facts.endedAt < facts.startedAt) return null;
  return facts.endedAt - facts.startedAt;
}

/** "21 min", "45 s", or "unknown". */
export function lengthLabel(ms: number | null): string {
  if (ms === null) return "unknown";
  if (ms < MINUTE_MS) return `${Math.max(1, Math.round(ms / SECOND_MS))} s`;
  return `${Math.round(ms / MINUTE_MS)} min`;
}

/** "MP4" or "WebM" (the container), from the MIME type the recorder wrote. */
export function formatName(mimeType: string): string {
  const subtype = mimeType.split(";")[0]?.split("/")[1]?.trim().toLowerCase() ?? "";
  if (subtype === "mp4") return "MP4";
  if (subtype === "webm") return "WebM";
  return subtype === "" ? "Video" : subtype.toUpperCase();
}

/** "18 Nov 2026 · 14:30 · 21 min · 214 MB". */
export function metaLine(facts: RecordingFacts): string {
  return [
    calendarDate(facts.startedAt),
    clockTime(facts.startedAt),
    lengthLabel(recordedMs(facts)),
    formatBytes(facts.sizeBytes),
  ].join(" · ");
}

/** "Recorded 18 Nov 2026, 14:30 · 21 min · 214 MB · MP4". */
export function detailFacts(facts: RecordingFacts): string {
  return [
    `Recorded ${calendarDate(facts.startedAt)}, ${clockTime(facts.startedAt)}`,
    lengthLabel(recordedMs(facts)),
    formatBytes(facts.sizeBytes),
    formatName(facts.mimeType),
  ].join(" · ");
}

/** `know-meet-4KQ-9ZD-2026-11-18-1430.webm`. */
export function downloadFilename(facts: RecordingFacts): string {
  const d = new Date(facts.startedAt);
  const code = (facts.roomCode ?? "recording").replace(/[^A-Za-z0-9-]/g, "");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const extension = formatName(facts.mimeType) === "MP4" ? "mp4" : "webm";
  return `know-meet-${code === "" ? "recording" : code}-${stamp}.${extension}`;
}

export function sortRecordings<T extends RecordingFacts>(
  rows: readonly T[],
  sort: LibrarySort,
): readonly T[] {
  const copy = [...rows];
  if (sort === "old") return copy.sort((a, b) => a.startedAt - b.startedAt);
  if (sort === "large") return copy.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return copy.sort((a, b) => b.startedAt - a.startedAt);
}

export type StorageBand = "ok" | "high" | "full";

export interface StorageUse {
  readonly percent: number;
  readonly band: StorageBand;
}

const HIGH_PERCENT = 80;
const FULL_PERCENT = 95;

/** Meter value and band: under 80% ok, 80 to 95% high (amber), above 95% full (red). */
export function storageUse(usedBytes: number, quotaBytes: number): StorageUse {
  const percent = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;
  const band = percent > FULL_PERCENT ? "full" : percent >= HIGH_PERCENT ? "high" : "ok";
  return { percent, band };
}
