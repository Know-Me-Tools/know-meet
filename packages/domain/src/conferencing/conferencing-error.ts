import type { DeviceKind } from "./devices.ts";
import type { ConferencingSupport } from "./screen-share.ts";

/** A feature this browser lacks. The control should not have been offered. */
export interface Unsupported {
  readonly code: "unsupported";
  readonly feature: keyof ConferencingSupport;
}

/**
 * No screen share began: the participant closed the browser's picker or the browser
 * refused. Browsers report both the same way, so they are one case.
 */
export interface ShareNotStarted {
  readonly code: "share-not-started";
}

/** The chosen device is not (or no longer) connected. */
export interface DeviceNotFound {
  readonly code: "device-not-found";
  readonly kind: DeviceKind;
}

/** A private message named someone who is not in the room. Nothing was sent. */
export interface RecipientNotPresent {
  readonly code: "recipient-not-present";
}

/** The media server did not accept a message while the room was connected. */
export interface SendFailed {
  readonly code: "send-failed";
}

/** The browser still blocks audio playback; it needs a click on "Enable audio". */
export interface PlaybackBlocked {
  readonly code: "playback-blocked";
}

/** The background processor or its assets failed to load. The camera stays unprocessed. */
export interface EffectFailed {
  readonly code: "effect-failed";
}

/** A recording request or recording is already under way in this room. */
export interface RecordingBusy {
  readonly code: "recording-busy";
}

/** Why the local recorder could not start or had to stop. */
export type RecorderFailureReason =
  | "unsupported"
  | "storage-unavailable"
  | "quota-exceeded"
  | "failed";

/** The local recorder could not start, or stopped by itself. What it wrote is kept. */
export interface RecorderFailed {
  readonly code: "recorder-failed";
  readonly reason: RecorderFailureReason;
}

/**
 * Expected failures of the conferencing features. Kept apart from `MeetingError` so the
 * meeting screens' exhaustive mapping stays as it is. Copy lives in presentation.
 */
export type ConferencingError =
  | Unsupported
  | ShareNotStarted
  | DeviceNotFound
  | RecipientNotPresent
  | SendFailed
  | PlaybackBlocked
  | EffectFailed
  | RecordingBusy
  | RecorderFailed;

export const conferencingErrors = {
  unsupported: (feature: keyof ConferencingSupport): Unsupported => ({
    code: "unsupported",
    feature,
  }),
  shareNotStarted: (): ShareNotStarted => ({ code: "share-not-started" }),
  deviceNotFound: (kind: DeviceKind): DeviceNotFound => ({ code: "device-not-found", kind }),
  recipientNotPresent: (): RecipientNotPresent => ({ code: "recipient-not-present" }),
  sendFailed: (): SendFailed => ({ code: "send-failed" }),
  playbackBlocked: (): PlaybackBlocked => ({ code: "playback-blocked" }),
  effectFailed: (): EffectFailed => ({ code: "effect-failed" }),
  recordingBusy: (): RecordingBusy => ({ code: "recording-busy" }),
  recorderFailed: (reason: RecorderFailureReason): RecorderFailed => ({
    code: "recorder-failed",
    reason,
  }),
} as const;
