import type { ConnectError, MediaError } from "@know-meet/application";
import { meetingErrors, type TrackKind } from "@know-meet/domain";

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
