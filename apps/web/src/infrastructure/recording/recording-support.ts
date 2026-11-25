// TJ-ARCH-MOB-001 compliant
import type { Support } from "@know-meet/domain";

/**
 * Candidates in order of preference. VP9 and VP8 give WebM in Chromium and Firefox; MP4 is
 * the only container Safari's `MediaRecorder` offers.
 */
const MIME_CANDIDATES: readonly string[] = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
];

export interface ChosenFormat {
  readonly mimeType: string;
  /** File extension without the dot. */
  readonly extension: "webm" | "mp4";
}

/** The first candidate the browser can record, or null when it can record none. */
export function pickRecordingFormat(
  isTypeSupported: (type: string) => boolean = (type) => MediaRecorder.isTypeSupported(type),
): ChosenFormat | null {
  for (const mimeType of MIME_CANDIDATES) {
    if (isTypeSupported(mimeType)) {
      return { mimeType, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
    }
  }
  return null;
}

/** File extension for a stored recording's mime type. */
export function extensionFor(mimeType: string): "webm" | "mp4" {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/** True when this browser has the file system the recordings are written to. */
export function hasRecordingStorage(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function" &&
    typeof Worker !== "undefined"
  );
}

/**
 * Whether this browser can record locally at all: `MediaRecorder`, canvas `captureStream`,
 * `AudioContext`, OPFS and workers, and at least one container it can write.
 */
export function detectRecordingSupport(): Support {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function" ||
    typeof AudioContext === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function" ||
    !hasRecordingStorage()
  ) {
    return "unsupported";
  }
  return pickRecordingFormat() === null ? "unsupported" : "supported";
}
