// TJ-ARCH-MOB-001 compliant
import { type MeetingHistoryId, parseMeetingHistoryId } from "@know-meet/domain";

/**
 * A fresh history id: a random UUID, which `parseMeetingHistoryId` accepts (36 URL-safe
 * characters, never a room code). The throw cannot happen with a conforming
 * `crypto.randomUUID`; it exists so the id is never null or unchecked.
 */
export function newMeetingHistoryId(): MeetingHistoryId {
  const id = parseMeetingHistoryId(crypto.randomUUID());
  if (id === null) throw new Error("crypto.randomUUID returned an unusable history id");
  return id;
}
