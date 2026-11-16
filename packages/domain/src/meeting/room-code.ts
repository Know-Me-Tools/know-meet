/**
 * A meeting's room code, for example `km-4fq-82x`. Only the token service generates codes;
 * clients parse what a person typed or what a link carried.
 */
export type RoomCode = string & { readonly __brand: "RoomCode" };

/** The token service's code shape (release contract `ROOM_CODE_PATTERN`). */
const CODE_PATTERN = /^km-[a-z0-9]{3}-[a-z0-9]{3}$/;

/**
 * Accepts a typed or pasted code: surrounding whitespace is ignored and letters are
 * lowercased. Returns null for anything that cannot be a room code. A well-formed code
 * may still be unknown to the service; only the service can say it exists.
 */
export function parseRoomCode(value: unknown): RoomCode | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  if (!CODE_PATTERN.test(candidate)) return null;
  return candidate as RoomCode;
}
