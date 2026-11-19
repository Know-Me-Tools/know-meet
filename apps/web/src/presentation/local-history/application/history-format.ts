// TJ-ARCH-MOB-001 compliant
// Pure view-model helpers for the history screen (shape local-history.md §4, §7):
// day groups ("Today", "Yesterday", then dates), row meta ("14:30 · 42 min ·
// 3 people · 12 messages", singulars handled), meeting titles ("Meeting <code>"
// when the room had no name) and the audience copy every stored message carries
// ("Everyone", "Private to Marcus", "Private from Marcus"). No React here.
import {
  type AudienceLabel,
  audienceLabel,
  type HistoryChatMessage,
  type MeetingSession,
  type MeetingSummary,
  meetingDurationMs,
  seenName,
} from "@know-meet/domain";

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayWithYearFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export interface DayGroup {
  /** Stable key: the local calendar day, `YYYY-MM-DD`. */
  readonly key: string;
  /** "Today", "Yesterday" or a date. */
  readonly label: string;
  /** Lower-case form for inside a sentence ("today", "yesterday", or the date). */
  readonly inline: string;
  readonly meetings: readonly MeetingSummary[];
}

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(date: Date, now: Date): { readonly label: string; readonly inline: string } {
  const key = localDayKey(date);
  if (key === localDayKey(now)) return { label: "Today", inline: "today" };
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === localDayKey(yesterday)) return { label: "Yesterday", inline: "yesterday" };
  const format = date.getFullYear() === now.getFullYear() ? dayFormat : dayWithYearFormat;
  const text = format.format(date);
  return { label: text, inline: text };
}

/** Groups meetings (already newest first) by the local day they started, keeping order. */
export function groupByDay(meetings: readonly MeetingSummary[], now: Date): readonly DayGroup[] {
  const groups: { key: string; label: string; inline: string; meetings: MeetingSummary[] }[] = [];
  for (const meeting of meetings) {
    const joined = new Date(meeting.joinedAt);
    const key = localDayKey(joined);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) {
      last.meetings.push(meeting);
      continue;
    }
    groups.push({ key, ...dayLabel(joined, now), meetings: [meeting] });
  }
  return groups;
}

/** "Today", "Yesterday" or the date. */
export function dayName(at: number, now: Date): string {
  return dayLabel(new Date(at), now).label;
}

/** "Today", "Yesterday" or the date, lower-cased for use inside a sentence. */
export function inlineDay(at: number, now: Date): string {
  return dayLabel(new Date(at), now).inline;
}

export function formatTime(at: number): string {
  return timeFormat.format(new Date(at));
}

export function isoTime(at: number): string {
  return new Date(at).toISOString();
}

export function meetingTitle(meeting: MeetingSession): string {
  const title = meeting.title?.trim() ?? "";
  return title === "" ? `Meeting ${meeting.roomCode}` : title;
}

/** "42 min", "1 h 5 min", "under 1 min"; null when the end was never recorded. */
export function formatDuration(meeting: MeetingSession): string | null {
  const ms = meetingDurationMs(meeting);
  if (ms === null) return null;
  const minutes = Math.floor(ms / MINUTE_MS);
  if (minutes < 1) return "under 1 min";
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function peopleLabel(meeting: MeetingSession): string {
  return countLabel(meeting.participants.length, "person", "people");
}

export function messagesLabel(count: number): string {
  return countLabel(count, "message", "messages");
}

export interface MetaPart {
  readonly text: string;
  /** Shown as a chip in the trailing column from the medium width up (shape §4, 768). */
  readonly chipFromMedium: boolean;
}

/** Row meta after the time: duration, people, then the message count. */
export function rowMetaParts(meeting: MeetingSummary): readonly MetaPart[] {
  const duration = formatDuration(meeting);
  const parts: MetaPart[] = [];
  if (duration !== null) parts.push({ text: duration, chipFromMedium: false });
  parts.push({ text: peopleLabel(meeting), chipFromMedium: false });
  parts.push({ text: messagesLabel(meeting.messageCount), chipFromMedium: true });
  return parts;
}

/** The sender as the message list shows it: "You" for this device's own messages. */
export function senderName(message: HistoryChatMessage, meeting: MeetingSession): string {
  if (message.direction === "sent") return "You";
  const name = message.fromName.trim();
  if (name !== "") return name;
  return seenName(meeting, message.from) ?? "Someone";
}

function recipientName(message: HistoryChatMessage, meeting: MeetingSession, name: string): string {
  if (name.trim() !== "") return name;
  if (message.audience.kind === "private") {
    const seen = seenName(meeting, message.audience.to);
    if (seen !== null && seen.trim() !== "") return seen;
  }
  return "someone";
}

/** "Everyone", "Private to Marcus" or "Private from Marcus" (same labels as the room). */
export function audienceText(message: HistoryChatMessage, meeting: MeetingSession): string {
  const label: AudienceLabel = audienceLabel(message);
  if (label.kind === "everyone") return "Everyone";
  if (label.kind === "private-to") {
    return `Private to ${recipientName(message, meeting, label.name)}`;
  }
  return `Private from ${label.name.trim() === "" ? senderName(message, meeting) : label.name}`;
}
