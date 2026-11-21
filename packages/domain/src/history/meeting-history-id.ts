import { parseRoomCode } from "../meeting/room-code.ts";

/**
 * Identifies one meeting session in this device's local history. It is generated on the
 * device when the session starts and never derived from the room code: the same room can
 * be joined many times, and the code is shared with everyone who had the link, while
 * history ids must stay unguessable and local (WC-7 forbids them in any request).
 */
export type MeetingHistoryId = string & { readonly __brand: "MeetingHistoryId" };

/** Shortest accepted id. A room code (`km-xxx-xxx`, 10 characters) is always shorter. */
export const MIN_MEETING_HISTORY_ID_LENGTH = 16;

const HISTORY_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Accepts 16 to 64 URL-safe characters (a UUID fits) that are not a room code. Use it for
 * every id that arrives from outside the history store, for example the `#meeting:<id>`
 * hash; returns null for anything else.
 */
export function parseMeetingHistoryId(value: unknown): MeetingHistoryId | null {
  if (typeof value !== "string" || !HISTORY_ID_PATTERN.test(value)) return null;
  if (parseRoomCode(value) !== null) return null;
  return value as MeetingHistoryId;
}
