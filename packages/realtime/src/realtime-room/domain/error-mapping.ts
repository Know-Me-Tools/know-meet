import type {
  ConnectError,
  DeviceError,
  MediaError,
  ScreenShareError,
} from "@know-meet/application";
import {
  conferencingErrors,
  type DeviceKind,
  meetingErrors,
  type TrackKind,
} from "@know-meet/domain";

/**
 * Names of errors that mean "this device could not be used": getUserMedia DOMExceptions (the
 * same names the SDK's `MediaDeviceFailure.getFailure` classifies) plus the SDK's own
 * `DeviceUnsupportedError` (no `navigator.mediaDevices`, for example an insecure origin).
 * The port has one code for all of them, permission-denied; see README "Not handled".
 */
const DEVICE_ERROR_NAMES: ReadonlySet<string> = new Set([
  "NotAllowedError",
  "PermissionDeniedError",
  "SecurityError",
  "NotFoundError",
  "DevicesNotFoundError",
  "NotReadableError",
  "TrackStartError",
  "OverconstrainedError",
  "DeviceUnsupportedError",
]);

/** The error's `name`, or "unknown". Never the message: it may echo server text. */
export function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    if (typeof error.name === "string") return error.name;
  }
  return "unknown";
}

/**
 * True when the media server refused the access token: an SDK `ConnectionError` whose
 * `reason` is `ConnectionErrorReason.NotAllowed` (401 rejected or expired token, 403, or 404
 * unknown room). `notAllowedReason` is that enum value, passed in so this file stays free of
 * the SDK.
 */
export function isTokenRejection(error: unknown, notAllowedReason: number): boolean {
  if (errorName(error) !== "ConnectionError") return false;
  if (typeof error !== "object" || error === null || !("reason" in error)) return false;
  return error.reason === notAllowedReason;
}

/** Token refused: forbidden, and the caller does not retry. Anything else: connection-lost. */
export function mapConnectError(error: unknown, notAllowedReason: number): ConnectError {
  return isTokenRejection(error, notAllowedReason)
    ? meetingErrors.forbidden()
    : meetingErrors.connectionLost();
}

/**
 * A device the browser refused or could not open: permission-denied for that device, and the
 * guest stays in the room. Anything else (publishing failed, the room went away): connection-lost.
 */
export function mapMediaError(error: unknown, kind: TrackKind): MediaError {
  return DEVICE_ERROR_NAMES.has(errorName(error))
    ? meetingErrors.permissionDenied(kind)
    : meetingErrors.connectionLost();
}

/**
 * What `getDisplayMedia` throws when no share begins: the picker was closed (`NotAllowedError`
 * in Chromium and Firefox, `AbortError` in some versions), the call was not in a user gesture
 * (`InvalidStateError` in WebKit), nothing could be captured, or the stream had no video
 * (the SDK's `TrackInvalidError`).
 */
const SHARE_REFUSAL_NAMES: ReadonlySet<string> = new Set([
  "NotAllowedError",
  "PermissionDeniedError",
  "AbortError",
  "InvalidStateError",
  "NotFoundError",
  "NotReadableError",
  "SecurityError",
  "OverconstrainedError",
  "TypeError",
  "TrackInvalidError",
]);

/**
 * No `getDisplayMedia` (the SDK's `DeviceUnsupportedError`): unsupported. A refused or closed
 * picker: share-not-started. Anything else (publishing failed, the room went away):
 * connection-lost.
 */
export function mapScreenShareError(error: unknown): ScreenShareError {
  const name = errorName(error);
  if (name === "DeviceUnsupportedError") return conferencingErrors.unsupported("screenShare");
  return SHARE_REFUSAL_NAMES.has(name)
    ? conferencingErrors.shareNotStarted()
    : meetingErrors.connectionLost();
}

/** The chosen device is not connected (any more). */
const DEVICE_GONE_NAMES: ReadonlySet<string> = new Set([
  "OverconstrainedError",
  "NotFoundError",
  "DevicesNotFoundError",
]);

/**
 * A failed device switch. Gone: device-not-found. A refused or unusable input:
 * permission-denied for that input. A speaker the browser would not switch to (no
 * `setSinkId`, or `NotAllowedError` for an output the page may not use): unsupported, since
 * the port has no permission code for speakers. Anything else for an input: connection-lost.
 */
export function mapDeviceSwitchError(error: unknown, kind: DeviceKind): DeviceError {
  const name = errorName(error);
  if (DEVICE_GONE_NAMES.has(name)) return conferencingErrors.deviceNotFound(kind);
  if (kind === "speaker") return conferencingErrors.unsupported("speakerSelection");
  return DEVICE_ERROR_NAMES.has(name)
    ? meetingErrors.permissionDenied(kind)
    : meetingErrors.connectionLost();
}
