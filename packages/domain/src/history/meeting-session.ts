import type { RecordingRequestId } from "../conferencing/recording-consent.ts";
import type { DisconnectReason } from "../meeting/connection-state.ts";
import type { ParticipantIdentity } from "../meeting/participant.ts";
import type { RoomCode } from "../meeting/room-code.ts";
import type { MeetingHistoryId } from "./meeting-history-id.ts";

/** Someone this device saw in the room, with the latest display name it saw for them. */
export interface SeenParticipant {
  readonly identity: ParticipantIdentity;
  readonly name: string;
}

/**
 * One meeting as this device took part in it: from joining to leaving one room once.
 * Joining the same room again is a new session with a new id. It lives only in this
 * browser and is never uploaded (decision D5).
 */
export interface MeetingSession {
  readonly id: MeetingHistoryId;
  /** The room joined. Data only: it is never the session's id. */
  readonly roomCode: RoomCode;
  /**
   * The room's display name, or null when none was set (guest rooms today). Presentation
   * shows "Meeting <code>" for null.
   */
  readonly title: string | null;
  /** Milliseconds since the Unix epoch, when this device was first in the room. */
  readonly joinedAt: number;
  /**
   * When this device left, or null while the meeting runs. It also stays null when the
   * tab closed before leaving was recorded; such a session has no known duration.
   */
  readonly leftAt: number | null;
  /** Why it ended; null while it runs or when the end was never recorded. */
  readonly endReason: DisconnectReason | null;
  /** Everyone seen in the room, this participant first, then in the order first seen. */
  readonly participants: readonly SeenParticipant[];
}

/**
 * A session as the history list shows it: with how many chat messages this device kept
 * and which local recordings were made during it. Recordings belong to the recordings
 * store (wc10); history only refers to them, and deleting a session never deletes one.
 */
export interface MeetingSummary extends MeetingSession {
  readonly messageCount: number;
  readonly recordingIds: readonly RecordingRequestId[];
}

export interface MeetingSessionStart {
  readonly id: MeetingHistoryId;
  readonly roomCode: RoomCode;
  readonly title: string | null;
  readonly joinedAt: number;
  readonly participants: readonly SeenParticipant[];
}

export function startMeetingSession(start: MeetingSessionStart): MeetingSession {
  return { ...start, leftAt: null, endReason: null };
}

/**
 * Adds participants not seen before and takes the latest name of known ones. Returns the
 * same object when nothing changed, so a caller can skip the write.
 */
export function withParticipantsSeen(
  session: MeetingSession,
  seen: readonly SeenParticipant[],
): MeetingSession {
  const byIdentity = new Map(session.participants.map((p) => [p.identity, p] as const));
  let changed = false;
  for (const person of seen) {
    const known = byIdentity.get(person.identity);
    if (known !== undefined && known.name === person.name) continue;
    byIdentity.set(person.identity, person);
    changed = true;
  }
  if (!changed) return session;
  return { ...session, participants: [...byIdentity.values()] };
}

/** Marks the session ended. An already ended session is returned unchanged. */
export function endMeetingSession(
  session: MeetingSession,
  leftAt: number,
  reason: DisconnectReason,
): MeetingSession {
  if (session.leftAt !== null) return session;
  return { ...session, leftAt, endReason: reason };
}

/** Length in milliseconds, or null while running or when the end was never recorded. */
export function meetingDurationMs(session: MeetingSession): number | null {
  if (session.leftAt === null) return null;
  return Math.max(0, session.leftAt - session.joinedAt);
}

/** The latest name this session saw for an identity, or null if it never saw them. */
export function seenName(session: MeetingSession, identity: ParticipantIdentity): string | null {
  return session.participants.find((p) => p.identity === identity)?.name ?? null;
}
