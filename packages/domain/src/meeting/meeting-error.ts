import type { TrackKind } from "./participant.ts";

/** The code was never issued by the token service (or cannot be a code at all). */
export interface MeetingNotFound {
  readonly code: "meeting-not-found";
}

/** The token service refused for now. `retryAfterSeconds` comes from `Retry-After`. */
export interface RateLimited {
  readonly code: "rate-limited";
  readonly retryAfterSeconds: number | null;
}

/** The request was refused: a foreign origin at the token service, or a rejected token. */
export interface Forbidden {
  readonly code: "forbidden";
}

/** The input was refused as malformed, for example an empty display name. */
export interface InvalidRequest {
  readonly code: "invalid-request";
}

/** The browser refused access to the microphone or camera. */
export interface PermissionDenied {
  readonly code: "permission-denied";
  readonly device: TrackKind;
}

/** The token service or the media server could not be reached, or the link dropped. */
export interface ConnectionLost {
  readonly code: "connection-lost";
}

/** Every expected meeting failure. Presentation maps `code` to copy; no text lives here. */
export type MeetingError =
  | MeetingNotFound
  | RateLimited
  | Forbidden
  | InvalidRequest
  | PermissionDenied
  | ConnectionLost;

export const meetingErrors = {
  notFound: (): MeetingNotFound => ({ code: "meeting-not-found" }),
  rateLimited: (retryAfterSeconds: number | null): RateLimited => ({
    code: "rate-limited",
    retryAfterSeconds,
  }),
  forbidden: (): Forbidden => ({ code: "forbidden" }),
  invalidRequest: (): InvalidRequest => ({ code: "invalid-request" }),
  permissionDenied: (device: TrackKind): PermissionDenied => ({
    code: "permission-denied",
    device,
  }),
  connectionLost: (): ConnectionLost => ({ code: "connection-lost" }),
} as const;
