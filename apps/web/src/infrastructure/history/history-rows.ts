// TJ-ARCH-MOB-001 compliant
import {
  type DisconnectReason,
  type HistoryAudience,
  type HistoryChatMessage,
  type MeetingSummary,
  parseChatText,
  parseMeetingHistoryId,
  parseRecordingRequestId,
  parseRoomCode,
  type RecordingRequestId,
  type SeenParticipant,
  toChatMessageId,
  toParticipantIdentity,
} from "@know-meet/domain";

/** One `meeting_session` row with its aggregates, as the repository's SELECT returns it. */
export interface SessionRow {
  readonly id: string;
  readonly room_code: string;
  readonly title: string | null;
  readonly joined_at: unknown;
  readonly left_at: unknown;
  readonly end_reason: string | null;
  readonly participants: unknown;
  readonly message_count: unknown;
  readonly recording_ids: unknown;
}

/** One `chat_message` row. */
export interface ChatRow {
  readonly meeting_id: string;
  readonly id: string;
  readonly direction: string;
  readonly from_identity: string;
  readonly from_name: string;
  readonly audience_kind: string;
  readonly audience_to: string | null;
  readonly audience_to_name: string | null;
  readonly text: string;
  readonly sent_at: unknown;
}

/** The columns every summary read selects, with the two aggregates (messageCount, recordings). */
export const SUMMARY_SELECT = `
  SELECT s.id, s.room_code, s.title, s.joined_at, s.left_at, s.end_reason, s.participants,
    (SELECT count(*) FROM chat_message c WHERE c.meeting_id = s.id) AS message_count,
    COALESCE(
      (SELECT jsonb_agg(l.recording_id ORDER BY l.linked_at, l.recording_id)
         FROM meeting_recording_link l WHERE l.meeting_id = s.id),
      '[]'::jsonb) AS recording_ids
  FROM meeting_session s`;

/** bigint comes back as a number, a bigint or a string depending on size. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint" || typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** jsonb arrives parsed; a driver that returns text is handled too. */
function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function participantsOf(value: unknown): readonly SeenParticipant[] {
  const parsed = jsonValue(value);
  if (!Array.isArray(parsed)) return [];
  const people: SeenParticipant[] = [];
  for (const entry of parsed as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const { identity, name } = entry as Record<string, unknown>;
    if (typeof identity !== "string" || typeof name !== "string") continue;
    people.push({ identity: toParticipantIdentity(identity), name });
  }
  return people;
}

function recordingIdsOf(value: unknown): readonly RecordingRequestId[] {
  const parsed = jsonValue(value);
  if (!Array.isArray(parsed)) return [];
  const ids: RecordingRequestId[] = [];
  for (const entry of parsed as unknown[]) {
    const id = parseRecordingRequestId(entry);
    if (id !== null) ids.push(id);
  }
  return ids;
}

function endReasonOf(value: string | null): DisconnectReason | null {
  return value === "left" || value === "connection-lost" ? value : null;
}

/** Null when the row does not satisfy the domain's own rules (it was not written by this adapter). */
export function toMeetingSummary(row: SessionRow): MeetingSummary | null {
  const id = parseMeetingHistoryId(row.id);
  const roomCode = parseRoomCode(row.room_code);
  const joinedAt = toNumber(row.joined_at);
  if (id === null || roomCode === null || joinedAt === null) return null;
  return {
    id,
    roomCode,
    title: row.title,
    joinedAt,
    leftAt: row.left_at === null ? null : toNumber(row.left_at),
    endReason: endReasonOf(row.end_reason),
    participants: participantsOf(row.participants),
    messageCount: toNumber(row.message_count) ?? 0,
    recordingIds: recordingIdsOf(row.recording_ids),
  };
}

/** Null when the row does not satisfy the domain's own rules. */
export function toHistoryChatMessageRow(row: ChatRow): HistoryChatMessage | null {
  const meetingId = parseMeetingHistoryId(row.meeting_id);
  const text = parseChatText(row.text);
  const sentAt = toNumber(row.sent_at);
  if (meetingId === null || text === null || sentAt === null) return null;
  if (row.direction !== "sent" && row.direction !== "received") return null;
  const audience: HistoryAudience =
    row.audience_kind === "private" && row.audience_to !== null
      ? {
          kind: "private",
          to: toParticipantIdentity(row.audience_to),
          toName: row.audience_to_name ?? "",
        }
      : { kind: "everyone" };
  return {
    meetingId,
    id: toChatMessageId(row.id),
    direction: row.direction,
    from: toParticipantIdentity(row.from_identity),
    fromName: row.from_name,
    audience,
    text,
    sentAt,
  };
}

/** The parameters of one `INSERT INTO chat_message`, in column order. */
export function chatInsertParams(message: HistoryChatMessage): readonly unknown[] {
  const { audience } = message;
  return [
    message.meetingId,
    message.id,
    message.direction,
    message.from,
    message.fromName,
    audience.kind,
    audience.kind === "private" ? audience.to : null,
    audience.kind === "private" ? audience.toName : null,
    message.text,
    message.sentAt,
  ];
}
