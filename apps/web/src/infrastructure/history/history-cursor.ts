// TJ-ARCH-MOB-001 compliant
import { type MeetingCursor, toMeetingCursor } from "@know-meet/application";
import type { MeetingHistoryId } from "@know-meet/domain";

const CURSOR_PATTERN = /^(\d{1,16}):([A-Za-z0-9_-]{16,64})$/;

/** The position of the last meeting on a page: `<joinedAt>:<id>`. */
export function cursorFor(joinedAt: number, id: MeetingHistoryId): MeetingCursor {
  return toMeetingCursor(`${joinedAt}:${id}`);
}

export interface CursorPosition {
  readonly joinedAt: number;
  readonly id: string;
}

/** Null for a string this adapter did not make. */
export function readCursor(cursor: MeetingCursor): CursorPosition | null {
  const match = CURSOR_PATTERN.exec(cursor);
  if (match === null) return null;
  const joinedAt = Number(match[1]);
  const id = match[2];
  if (!Number.isSafeInteger(joinedAt) || id === undefined) return null;
  return { joinedAt, id };
}
