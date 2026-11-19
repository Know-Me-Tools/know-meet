import type {
  ConnectionLost,
  DisplayName,
  Forbidden,
  InvalidRequest,
  MeetingNotFound,
  ParticipantIdentity,
  RateLimited,
  Result,
  RoomCode,
} from "@know-meet/domain";

export type {
  AudioStartError,
  BackgroundEffectError,
  ConnectError,
  ConnectOptions,
  DeviceError,
  DeviceState,
  MediaError,
  MediaTarget,
  MessageSendError,
  RealtimeRoom,
  RoomSnapshot,
  ScreenShareError,
} from "./realtime-room.ts";

/** What the token service hands one guest for one room. */
export interface RoomCredentials {
  /** Public media server URL (`wss://`). */
  readonly url: string;
  /** Short-lived access token. Pass it to `RealtimeRoom.connect` only; never store or log it. */
  readonly token: string;
  readonly identity: ParticipantIdentity;
  /** Equals the requested code. */
  readonly room: RoomCode;
  /** Seconds until the token expires. */
  readonly expiresIn: number;
}

export interface TokenRequest {
  readonly code: RoomCode;
  readonly displayName: DisplayName;
}

export type CreateMeetingError = RateLimited | Forbidden | ConnectionLost;

export type TokenRequestError =
  | MeetingNotFound
  | RateLimited
  | Forbidden
  | InvalidRequest
  | ConnectionLost;

/**
 * Issues room codes and access tokens. The web adapter calls the token service
 * (`POST /api/meetings`, `POST /api/token`) and maps its answers: 404 to meeting-not-found,
 * 429 to rate-limited (with `Retry-After`), 403 to forbidden, 400 to invalid-request, and a
 * network failure or 5xx to connection-lost. It never throws for those cases.
 */
export interface TokenIssuer {
  createMeeting(signal?: AbortSignal): Promise<Result<RoomCode, CreateMeetingError>>;
  requestToken(
    request: TokenRequest,
    signal?: AbortSignal,
  ): Promise<Result<RoomCredentials, TokenRequestError>>;
}
