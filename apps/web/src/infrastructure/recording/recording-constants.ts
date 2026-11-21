// TJ-ARCH-MOB-001 compliant

/** The OPFS directory that holds every recording file. One per origin. */
export const RECORDINGS_DIRECTORY = "know-meet-recordings";

/** Web Lock name prefix. A recording's writer holds `${prefix}${id}` for as long as it writes. */
export const RECORDING_LOCK_PREFIX = "know-meet-recording:";

/** BroadcastChannel that tells other tabs which recording changed (ids only). */
export const RECORDING_CHANNEL_NAME = "know-meet-recording-changes";

/** `MediaRecorder` hands over a chunk this often, so little is lost if the tab dies. */
export const RECORDER_TIMESLICE_MS = 1000;

/** Composite canvas size and frame rate. 720p keeps a one-hour grid near 1 GB. */
export const COMPOSITE_WIDTH = 1280;
export const COMPOSITE_HEIGHT = 720;
export const COMPOSITE_FPS = 25;
export const VIDEO_BITS_PER_SECOND = 2_500_000;
export const AUDIO_BITS_PER_SECOND = 96_000;

/**
 * A recording does not start with less free space than this (about three minutes at the
 * bit rate above). The estimate is advisory; a write that still fails stops the
 * recording and keeps what was written.
 */
export const MIN_FREE_BYTES = 64 * 1024 * 1024;

export function recordingLockName(id: string): string {
  return `${RECORDING_LOCK_PREFIX}${id}`;
}
