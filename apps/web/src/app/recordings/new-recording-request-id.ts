// TJ-ARCH-MOB-001 compliant
import { parseRecordingRequestId, type RecordingRequestId } from "@know-meet/domain";

/**
 * A fresh id for one recording request; it also names the recording's file. A UUID when
 * the browser has one, otherwise 128 random bits in hex. Both fit the id's 8 to 64
 * URL-safe characters.
 */
export function newRecordingRequestId(): RecordingRequestId {
  const text =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
  const id = parseRecordingRequestId(text);
  if (id === null) throw new Error("The browser produced an unusable recording id");
  return id;
}
